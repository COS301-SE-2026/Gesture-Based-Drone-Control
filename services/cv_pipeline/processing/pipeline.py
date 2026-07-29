"""
Controls the entire pipeline basically
camera (thread) -> bounded queue -> detector -> engine ->events

-> cam captures runs in a thread
-> detection + gestures run on asyncio loop
-> fastapi, webscoket gateways, smoke tests receive pipelinevent
	objects through events() async generator
-> start() / stop() xontrol the lifecycle
"""

import asyncio
import logging
import math
import threading
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

from services.cv_pipeline.camera.camera_feed import CameraConfig, CameraFeed, CapturedFrame
from services.cv_pipeline.gestures.gesture_engine import GestureEngine, GestureEngineResult
from services.cv_pipeline.gestures.recognizers.ml_based import MLBasedRecognizer
from services.cv_pipeline.gestures.recognizers.rule_based import RuleBasedRecognizer
from services.cv_pipeline.hand_detection.mediapipe_detector import (
	DetectorConfig,
	HandDetectionPipeline,
	HandDetectionResult,
	Handedness,
	draw_landmarks,
)
from services.cv_pipeline.processing.async_queue import BoundedFrameQueue

logger = logging.getLogger(__name__)

RECOGNIZER_MODES = ('rule', 'ml')


# pipeline config
@dataclass
class PipelineConfig:
	"""
	queue_size: how many frames to buffer between cam thread and consumer
	2 = best
	"""

	camera: CameraConfig = field(default_factory=CameraConfig)
	detector: DetectorConfig = field(default_factory=DetectorConfig)
	queue_size: int = 2
	# swap in the ML recognizer (needs a trained gesture_mlp.joblib)
	use_ml: bool = False


class FpsMeter:
	"""
	Smoothed frames-per-second from frame timestamps.
	EMA so the number doesnt jitter every frame.
	"""

	def __init__(self, alpha: float = 0.1) -> None:
		self._alpha = alpha
		self._fps: Optional[float] = None
		self._last_ts: Optional[float] = None

	def update(self, timestamp: float) -> float:
		if self._last_ts is not None:
			dt = timestamp - self._last_ts
			if dt > 0:
				inst = 1.0 / dt
				# seed on first sample, then smooth
				self._fps = (
					inst
					if self._fps is None
					else (self._alpha * inst + (1 - self._alpha) * self._fps)
				)
		self._last_ts = timestamp
		return self._fps if self._fps is not None else 0.0

	@property
	def fps(self) -> float:
		return self._fps if self._fps is not None else 0.0


class MotionTracker:
	"""
	Per-hand wrist speed in normalised units/sec (landmarks are 0..1, so this
	is resolution-independent). Keyed by handedness so left and right are
	tracked separately. Multiply by frame width if you want pixels/sec.
	"""

	def __init__(self) -> None:
		# handedness -> (x, y, timestamp)
		self._last: dict[Handedness, tuple[float, float, float]] = {}

	def update(self, handedness: Handedness, wrist, timestamp: float) -> float:
		speed = 0.0
		prev = self._last.get(handedness)
		if prev is not None:
			px, py, pt = prev
			dt = timestamp - pt
			if dt > 0:
				speed = math.hypot(wrist.x - px, wrist.y - py) / dt
		self._last[handedness] = (wrist.x, wrist.y, timestamp)
		return speed

	def forget_absent(self, present: set) -> None:
		# drop hands that left the frame so a returning hand doesnt teleport
		stale = [h for h in self._last if h not in present]
		for h in stale:
			del self._last[h]


@dataclass
class HandMetrics:
	"""Per-hand numbers surfaced for the UI / telemetry."""

	handedness: Handedness
	# mediapipe confidence as a 0..1 value (×100 for a percentage)
	confidence: float
	# wrist speed, normalised units per second
	speed: float


@dataclass
class PipelineEvent:
	"""
	One frame processed E2E
	-> frame = captured frame
	-> engine_result: per-hand gesture results
	-> detection: raw hand landmarks (so callers can draw the skeleton)
	-> fps / hand_metrics: live overlay + telemetry numbers
	"""

	frame: CapturedFrame
	engine_result: GestureEngineResult
	detection: Optional[HandDetectionResult] = None
	fps: float = 0.0
	hand_metrics: list[HandMetrics] = field(default_factory=list)

	@property
	def frame_index(self) -> int:
		return self.frame.frame_index


class CvPipeline:
	"""
	Wires cam and hand detection and gesture engine to one
	Camera runs in background thread
	Gesture recoginition run on asyncio loop as 1 consumer task

	start() -> events() (loop) -> stop()
	"""

	def __init__(self, config: Optional[PipelineConfig] = None) -> None:
		self._config = config or PipelineConfig()

		# resources started in start()
		self._camera: Optional[CameraFeed] = None
		self._detector: Optional[HandDetectionPipeline] = None
		self._engine: Optional[GestureEngine] = None
		self._frame_queue: Optional[BoundedFrameQueue[CapturedFrame]] = None
		self._event_queue: Optional[asyncio.Queue[PipelineEvent]] = None
		self._camera_thread: Optional[threading.Thread] = None
		self._consumer_task: Optional[asyncio.Task] = None
		self._stop_event = threading.Event()
		self._running = False

		# metrics (reset on start)
		self._fps_meter = FpsMeter()
		self._motion = MotionTracker()

		self._ml_recognizer: Optional[MLBasedRecognizer] = None
		self._recognizer_mode = 'ml' if self._config.use_ml else 'rule'

	# lifecycle
	async def start(self) -> None:
		# open camera and detector and spawn capture thread and kick off consumer task
		if self._running:
			logger.warning('CvPipeline.start() called while already running')
			return

		# yield to the loop once
		await asyncio.sleep(0)

		self._frame_queue = BoundedFrameQueue[CapturedFrame](maxsize=self._config.queue_size)
		self._event_queue = asyncio.Queue(maxsize=1)

		# fresh metrics for this run
		self._fps_meter = FpsMeter()
		self._motion = MotionTracker()

		# open cam and detector
		self._camera = CameraFeed(self._config.camera)
		self._camera.open()
		self._detector = HandDetectionPipeline(self._config.detector)
		self._detector.open()
		self._engine = GestureEngine()
		self.set_recognizer_mode(self._recognizer_mode)

		# cam thread reads frames and pushes them onto frame queues
		self._stop_event.clear()
		loop = asyncio.get_running_loop()
		self._camera_thread = threading.Thread(
			target=self._camera_loop,
			args=(loop,),
			name='cv-camera-capture',
			daemon=True,
		)
		self._camera_thread.start()

		# consucmer taks pulls frames and runs detection, engine and emits events
		self._consumer_task = asyncio.create_task(self._consume(), name='cv-consumer')
		self._running = True
		logger.info('CvPipeline started')

	async def stop(self) -> None:
		# Break everything down to cam thread, comsumer task, mediapipe, cv2
		if not self._running:
			return

		logger.info('CvPipeline stopping')
		self._running = False

		# signal cam thread to exit
		self._stop_event.set()
		if self._camera_thread is not None:
			# join with small timeout so never hang forever
			self._camera_thread.join(timeout=2.0)
			if self._camera_thread.is_alive():
				logger.warning('Camera thread didnt exist within 2s')

		# cancel task
		if self._consumer_task is not None:
			self._consumer_task.cancel()
			try:
				await self._consumer_task
			except asyncio.CancelledError:
				# if stop() itself was cancelled, propagate. Otherwise the
				# CancelledError is our own cancel() above coming back to us,
				# which is expected and should be swallowed
				current = asyncio.current_task()
				if current is not None and current.cancelling() > 0:
					raise

		# close resources
		if self._detector is not None:
			self._detector.close()
		if self._camera is not None:
			self._camera.close()

		self._camera = None
		self._detector = None
		self._engine = None
		self._camera_thread = None
		self._consumer_task = None
		self._frame_queue = None
		self._event_queue = None

		logger.info('CvPipeline stopped')

	# context manager
	async def __aenter__(self) -> 'CvPipeline':
		await self.start()
		return self

	async def __aexit__(self, *_) -> None:
		await self.stop()

	async def events(self) -> AsyncIterator[PipelineEvent]:
		"""
		async generator yielding one pipeline event per processed frame
		stops when stop() is called

		If the caller cancels iteration, CancelledError propagates naturally
		out of asyncio.wait_for — no explicit handler needed
		"""

		if self._event_queue is None:
			raise RuntimeError('event() called before start()')

		while self._running:
			try:
				event = await asyncio.wait_for(self._event_queue.get(), timeout=0.5)
				yield event
			except asyncio.TimeoutError:
				# loop around to recheck self._running -> lets stop() unstick
				continue

	@property
	def recognizer_mode(self) -> str:
		return self._recognizer_mode

	def set_recognizer_mode(self, mode: str) -> str:
		"""
		Swaps the recognizer live. Returns the mode actually in effect, which differs
		from the requested one when ml is asked for but the trained
		model is missing, so the caller can tell the user what happened
		"""
		if mode not in RECOGNIZER_MODES:
			raise ValueError(
				f'unknown recognizer mode {mode!r}, expected one of {RECOGNIZER_MODES}'
			)

		recognizer = None
		if mode == 'ml':
			recognizer = self._get_ml_recognizer()
			if recognizer is None:
				logger.warning('ML model unavailable, staying on rule-based')
				mode = 'rule'

		if recognizer is None:
			recognizer = RuleBasedRecognizer()

		if self._engine is not None:
			self._engine.set_recognizer(recognizer)
			# stale votes would leak across swap
			self._engine.reset_stabilizer()

		self._recognizer_mode = mode
		return mode

	def _get_ml_recognizer(self) -> Optional[MLBasedRecognizer]:
		"""Load once and cache, joblib.load is too slow to repeat per swap"""
		if self._ml_recognizer is None:
			try:
				self._ml_recognizer = MLBasedRecognizer()
			except FileNotFoundError:
				logger.warning('No training model found (gesture_mlp.joblib)')
				return None
		return self._ml_recognizer

	def _camera_loop(self, loop: asyncio.AbstractEventLoop) -> None:
		"""
		Runs in background thread
		pushes frames into the bounded queue
		"""

		assert self._camera is not None
		assert self._frame_queue is not None

		consecutive_failures = 0
		while not self._stop_event.is_set():
			frame = self._camera.capture_image()
			if frame is None:
				consecutive_failures += 1
				# no frame available -> backoff
				self._stop_event.wait(min(0.01 * consecutive_failures, 1.0))
				continue

			consecutive_failures = 0
			self._frame_queue.try_put_threadsafe(frame, loop)

		logger.debug('Camera thread exiting')

	async def _consume(self) -> None:
		"""
		Pulls frame off queue and then runs detection and gesture engine
		"""

		assert self._frame_queue is not None
		assert self._event_queue is not None
		assert self._detector is not None
		assert self._engine is not None

		try:
			while True:
				frame = await self._frame_queue.get()
				detection = self._detector.detect_hands(frame)
				engine_result = self._engine.process(detection)

				# fps from frame timestamps
				fps = self._fps_meter.update(frame.timestamp)

				# per-hand speed + confidence
				metrics: list[HandMetrics] = []
				present = set()
				for hand in detection.hands:
					present.add(hand.handedness)
					wrist = hand.landmarks[0]
					speed = self._motion.update(hand.handedness, wrist, frame.timestamp)
					metrics.append(
						HandMetrics(
							handedness=hand.handedness,
							confidence=hand.confidence,
							speed=speed,
						)
					)
				# forget hands that left so they dont "jump" on return
				self._motion.forget_absent(present)

				event = PipelineEvent(
					frame=frame,
					engine_result=engine_result,
					detection=detection,
					fps=fps,
					hand_metrics=metrics,
				)
				# 		await self._event_queue.put(event)
				# except asyncio.CancelledError:
				# 	logger.debug('Consumer task cancelled')
				# 	raise
				if self._event_queue.full():
					try:
						self._event_queue.get_nowait()
					except asyncio.QueueEmpty:
						pass
				self._event_queue.put_nowait(event)
		except asyncio.CancelledError:
			logger.debug('Consumer task cancelled')
			raise


# smoke test (chains camera -> detector -> engine -> overlay)
# run from services/ with: python -m cv_pipeline.processing.pipeline
if __name__ == '__main__':
	import cv2

	logging.basicConfig(level=logging.INFO)

	async def main() -> None:
		async with CvPipeline(PipelineConfig(use_ml=True)) as pipe:
			async for event in pipe.events():
				# draw the hand skeleton from the landmarks we already detected
				annotated = draw_landmarks(event.frame.bgr_frame, event.detection)

				# fps top-left
				cv2.putText(
					annotated,
					f'FPS: {event.fps:.1f}',
					(10, 30),
					cv2.FONT_HERSHEY_SIMPLEX,
					0.7,
					(0, 255, 255),
					2,
				)

				# join gesture results with their metrics by handedness
				metrics_by_hand = {m.handedness: m for m in event.hand_metrics}

				y = 60
				for gr in event.engine_result.hand_gestures:
					m = metrics_by_hand.get(gr.handedness)
					conf = gr.confidence * 100
					speed = m.speed if m else 0.0
					text = f'{gr.handedness.name}: {gr.gesture.name}  {conf:.0f}%  spd={speed:.2f}'
					cv2.putText(
						annotated,
						text,
						(10, y),
						cv2.FONT_HERSHEY_SIMPLEX,
						0.7,
						(0, 255, 0),
						2,
					)
					y += 30

				cv2.imshow('pipeline smoke test', annotated)
				if cv2.waitKey(1) & 0xFF == ord('q'):
					break

		cv2.destroyAllWindows()

	asyncio.run(main())
