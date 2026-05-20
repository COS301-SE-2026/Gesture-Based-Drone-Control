# /services/cv-pipeline/processing/pipeline.py
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
import threading
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

from cv_pipeline.camera.camera_feed import CameraConfig, CameraFeed, CapturedFrame
from cv_pipeline.gestures.gesture_engine import GestureEngine, GestureEngineResult
from cv_pipeline.hand_detection.mediapipe_detector import (
	DetectorConfig,
	HandDetectionPipeline,
)
from cv_pipeline.processing.async_queue import BoundedFrameQueue

logger = logging.getLogger(__name__)


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


@dataclass
class PipelineEvent:
	"""
	One frame processed E2E
	-> frame = captured frame
	-> engine_result: per-hand gesture results
	"""

	frame: CapturedFrame
	engine_result: GestureEngineResult

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

	# lifecycle
	async def start(self) -> None:
		# open camera and detector and spawn capture thread and kick off consumer task
		if self._running:
			logger.warning('CvPipeline.start() called while already running')
			return

		self._frame_queue = BoundedFrameQueue[CapturedFrame](maxsize=self._config.queue_size)
		self._event_queue = asyncio.Queue()

		# open cam and detector
		self._camera = CameraFeed(self._config.camera)
		self._camera.open()
		self._detector = HandDetectionPipeline(self._config.detector)
		self._detector.open()
		self._engine = GestureEngine()

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
				pass

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
			except asyncio.CancelledError:
				break

	def _camera_loop(self, loop: asyncio.AbstractEventLoop) -> None:
		"""
		Runs in background thread
		pushes frames into the bounded queue
		"""

		assert self._camera is not None
		assert self._frame_queue is not None

		while not self._stop_event.is_set():
			frame = self._camera.capture_image()
			if frame is None:
				# no frame available -> backoff
				self._stop_event.wait(0.01)
				continue

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
				event = PipelineEvent(frame=frame, engine_result=engine_result)
				await self._event_queue.put(event)
		except asyncio.CancelledError:
			logger.debug('Consumer task cancelled')
			raise


# smoke test (chains camera -> detector -> engine -> overlay)
# run from services/ with: python -m cv_pipeline.processing.pipeline
if __name__ == '__main__':
	import cv2

	logging.basicConfig(level=logging.INFO)

	async def main() -> None:
		async with CvPipeline() as pipe:
			async for event in pipe.events():
				# overlay gestures onto frame
				annotated = event.frame.bgr_frame.copy()
				y = 30
				for gr in event.engine_result.hand_gestures:
					text = f'{gr.handedness.name}: {gr.gesture.name}'
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
