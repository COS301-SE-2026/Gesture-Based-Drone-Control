# unit testing for pipeline.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_pipeline.py -v
import asyncio
import logging
import sys

# need to slow stuff down
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import numpy as np
import pytest

# mediapipe gets pulled in via the pipeline's imports, so mock before anything
_mock_mp = MagicMock()
sys.modules['mediapipe'] = _mock_mp

from services.cv_pipeline.camera.camera_feed import CameraConfig, CapturedFrame  # noqa: E402
from services.cv_pipeline.gestures.gesture_engine import GestureEngineResult  # noqa: E402
from services.cv_pipeline.gestures.recognizers.gesture_recognizer import (  # noqa: E402
	FingerState,
	Gesture,
	GestureResult,
)
from services.cv_pipeline.hand_detection.mediapipe_detector import (  # noqa: E402
	DetectorConfig,
	Handedness,
)
from services.cv_pipeline.processing.pipeline import (  # noqa: E402
	CvPipeline,
	FpsMeter,
	HandMetrics,
	PipelineConfig,
	PipelineEvent,
)


# helpers
def make_frame(idx: int = 1, timestamp: float | None = None) -> CapturedFrame:
	"""Returns a CapturedFrame with blank rgb/bgr arrays."""
	return CapturedFrame(
		bgr_frame=np.zeros((480, 640, 3), dtype=np.uint8),
		rgb_frame=np.zeros((480, 640, 3), dtype=np.uint8),
		frame_index=idx,
		timestamp=idx * 0.033 if timestamp is None else timestamp,
	)


def make_engine_result(frame_idx: int = 1, gesture: Gesture = Gesture.FIST) -> GestureEngineResult:
	"""Returns a GestureEngineResult with a single hand."""
	gr = GestureResult(
		gesture=gesture,
		finger_state=FingerState(),
		handedness=Handedness.RIGHT,
		confidence=0.9,
	)
	return GestureEngineResult(hand_gestures=[gr], frame_index=frame_idx)


def wrist(x: float, y: float):
	"""Minimal landmark stand in, motion tracker only reads./x / .y"""
	return SimpleNamespace(x=x, y=y, z=0.9)


class _FakeHand:
	"""Mimics one detected hand as far as pipeline cares aboit it"""

	def __init__(
		self,
		handedness: Handedness = Handedness.RIGHT,
		confidence: float = 0.9,
		x: float = 0.5,
		y: float = 0.5,
	):
		self.handedness = handedness
		self.confidence = confidence
		self.landmarks = [wrist(x, y)]


class _FakeDetection:
	"""Mimics HandDetectionResult"""

	def __init__(self, frame_index: int, hands=None):
		self.frame_index = frame_index
		self.hands = list(hands or [])
		self.has_hands = bool(self.hands)


class _FakeCamera:
	"""
	Mimics CameraFeed for tests — yields fake frames with a small delay
	between them.

	The delay matters: without it, the camera thread blasts all frames into
	the bounded queue (maxsize=2) faster than the asyncio consumer can pull
	them out, and most get dropped
	"""

	def __init__(self, _config=None, frames=None, frame_delay=0.02):
		self._frames = frames if frames is not None else [make_frame(i) for i in range(1, 21)]
		self._idx = 0
		self._frame_delay = frame_delay
		self.opened = False
		self.closed = False

	def open(self):
		self.opened = True

	def close(self):
		self.closed = True

	def capture_image(self):
		if self._idx >= len(self._frames):
			# return None forever once exhausted — the camera loop will spin
			# back-off on this; tests cancel out via stop()
			return None
		time.sleep(self._frame_delay)
		frame = self._frames[self._idx]
		self._idx += 1
		return frame


class _FakeDetector:
	"""Mimics HandDetectionPipeline.detect_hands() — returns whatever the test set."""

	def __init__(self, _config=None, fakes=None):
		self.opened = False
		self.closed = False
		self.detect_calls = 0
		self._fakes = fakes

	def open(self):
		self.opened = True

	def close(self):
		self.closed = True

	def detect_hands(self, frame):
		self.detect_calls += 1
		# return a result with no hands by default — engine will return empty too
		hands = self._fakes['hands'] if self._fakes else []
		return _FakeDetection(frame_index=frame.frame_index, hands=hands)


class _FakeEngine:
	"""Mimics GestureEngine.process() — returns a canned engine result."""

	def __init__(self):
		self.process_calls = 0
		self.recognizer = None
		self.stabilizer_resets = 0

	def set_recognizer(self, recognizer):
		self.recognizer = recognizer

	def reset_stabilizer(self):
		self.stabilizer_resets += 1

	def process(self, detection):
		self.process_calls += 1
		return make_engine_result(frame_idx=detection.frame_index)


class _StuckThread:
	"""a cammera thread that refuses to die"""

	def join(self, timeout=None):
		return None

	def is_alive(self):
		return True


@pytest.fixture
def fake_pipeline_deps(monkeypatch):
	"""Patches CameraFeed, HandDetectionPipeline, and GestureEngine inside pipeline.py."""
	fakes = {
		'cameras': [],
		'detectors': [],
		'engines': [],
		'camera_frames': None,
		'camera_frame_delay': 0.02,
		'hands': [],
	}

	def make_camera(config):
		c = _FakeCamera(
			config, frames=fakes['camera_frames'], frame_delay=fakes['camera_frame_delay']
		)
		fakes['cameras'].append(c)
		return c

	def make_detector(config):
		d = _FakeDetector(config, fakes=fakes)
		fakes['detectors'].append(d)
		return d

	def make_engine():
		e = _FakeEngine()
		fakes['engines'].append(e)
		return e

	monkeypatch.setattr('services.cv_pipeline.processing.pipeline.CameraFeed', make_camera)
	monkeypatch.setattr(
		'services.cv_pipeline.processing.pipeline.HandDetectionPipeline', make_detector
	)
	monkeypatch.setattr('services.cv_pipeline.processing.pipeline.GestureEngine', make_engine)

	return fakes


class TestFpsMeter:
	def test_starts_at_zero(self):
		meter = FpsMeter()
		assert meter.fps == 0.0

	def test_first_sample_has_no_delta_yet(self):
		"""One timestamp is not enough to derive a rate"""
		meter = FpsMeter()
		assert meter.update(1.0) == 0.0
		assert meter.fps == 0.0

	def test_second_sample_seeds_instantaneous_fps(self):
		meter = FpsMeter()
		meter.update(0.0)
		assert meter.update(0.1) == pytest.approx(10.0)
		assert meter.fps == pytest.approx(10.0)

	def test_ema_smooths_towards_the_new_value(self):
		meter = FpsMeter(alpha=0.5)
		meter.update(0.0)
		meter.update(0.1)
		assert meter.update(0.15) == pytest.approx(15.0)

	def test_default_alpha_barely_moves_on_one_sample(self):
		meter = FpsMeter()
		meter.update(0.0)
		meter.update(0.1)
		assert meter.update(0.15) == pytest.approx(11.0)

	def test_non_positive_delta_is_ignored(self):
		meter = FpsMeter()
		meter.update(1.0)
		meter.update(2.0)
		steady = meter.fps

		assert meter.update(2.0) == pytest.approx(steady)
		assert meter.update(1.5) == pytest.approx(steady)
		assert meter.fps == pytest.approx(steady)


class TestHandMetrics:
	def test_fields_stored(self):
		m = HandMetrics(handedness=Handedness.LEFT, confidence=0.87, speed=0.42)
		assert m.handedness is Handedness.LEFT
		assert m.confidence == pytest.approx(0.87)
		assert m.speed == pytest.approx(0.42)


# PipelineConfig
class TestPipelineConfig:
	def test_defaults(self):
		config = PipelineConfig()
		assert isinstance(config.camera, CameraConfig)
		assert isinstance(config.detector, DetectorConfig)
		assert config.queue_size == 2

	def test_custom_queue_size(self):
		config = PipelineConfig(queue_size=5)
		assert config.queue_size == 5

	def test_separate_camera_instances_per_config(self):
		"""field(default_factory) guards against the shared-mutable-default trap."""
		a = PipelineConfig()
		b = PipelineConfig()
		assert a.camera is not b.camera


# PipelineEvent
class TestPipelineEvent:
	def test_fields_stored(self):
		frame = make_frame(7)
		result = make_engine_result(7)
		event = PipelineEvent(frame=frame, engine_result=result)
		assert event.frame is frame
		assert event.engine_result is result

	def test_frame_index_property(self):
		event = PipelineEvent(frame=make_frame(42), engine_result=make_engine_result(42))
		assert event.frame_index == 42


# lifecycle
class TestLifecycle:
	@pytest.mark.asyncio
	async def test_start_opens_camera_and_detector(self, fake_pipeline_deps, caplog):
		pipe = CvPipeline()
		await pipe.start()

		pipe._stop_event.set()
		real_thread = pipe._camera_thread
		real_thread.join(timeout=2.0)
		pipe._camera_thread = _StuckThread()

		with caplog.at_level(logging.WARNING):
			await pipe.stop()

		assert any('Camera thread' in record.getMessage() for record in caplog.records)

	@pytest.mark.asyncio
	async def test_stop_warns_when_camera_thread_will_not_exit(self, fake_pipeline_deps, caplog):
		pipe = CvPipeline()
		await pipe.start()

		# retire the real thread first so it cannot touch torn-down state,
		# then hand stop() a thread that never dies
		pipe._stop_event.set()
		real_thread = pipe._camera_thread
		real_thread.join(timeout=2.0)
		pipe._camera_thread = _StuckThread()

		with caplog.at_level(logging.WARNING):
			await pipe.stop()

		assert any('Camera thread' in record.getMessage() for record in caplog.records)

	@pytest.mark.asyncio
	async def test_double_start_is_noop(self, fake_pipeline_deps):
		pipe = CvPipeline()
		await pipe.start()
		try:
			await pipe.start()  # should warn and return, not re-open
			assert len(fake_pipeline_deps['cameras']) == 1
		finally:
			await pipe.stop()

	@pytest.mark.asyncio
	async def test_stop_before_start_is_noop(self, fake_pipeline_deps):
		pipe = CvPipeline()
		# should not raise
		await pipe.stop()
		assert len(fake_pipeline_deps['cameras']) == 0


# context manager
class TestContextManager:
	@pytest.mark.asyncio
	async def test_async_with_starts_and_stops(self, fake_pipeline_deps):
		async with CvPipeline():
			assert fake_pipeline_deps['cameras'][0].opened is True
		# after exit, camera should be closed
		assert fake_pipeline_deps['cameras'][0].closed is True


# event stream
class TestEventStream:
	@pytest.mark.asyncio
	async def test_events_yields_pipeline_events(self, fake_pipeline_deps):
		"""End-to-end: frames flow through camera -> detector -> engine -> events."""
		async with CvPipeline() as pipe:
			received = []
			async for event in pipe.events():
				received.append(event)
				if len(received) >= 3:
					break
			assert len(received) == 3
			for event in received:
				assert isinstance(event, PipelineEvent)
				assert isinstance(event.frame, CapturedFrame)
				assert isinstance(event.engine_result, GestureEngineResult)

	@pytest.mark.asyncio
	async def test_events_raises_if_called_before_start(self, fake_pipeline_deps):
		pipe = CvPipeline()
		with pytest.raises(RuntimeError, match='before start'):
			async for _ in pipe.events():
				break  # pragma: no cover

	@pytest.mark.asyncio
	async def test_detector_and_engine_called_per_frame(self, fake_pipeline_deps):
		async with CvPipeline() as pipe:
			received = []
			async for event in pipe.events():
				received.append(event)
				if len(received) >= 3:
					break
			# detector & engine should each have been called at least 3 times
			assert fake_pipeline_deps['detectors'][0].detect_calls >= 3
			assert fake_pipeline_deps['engines'][0].process_calls >= 3

	@pytest.mark.asyncio
	async def test_events_carry_fps_and_per_hand_metrics(self, fake_pipeline_deps):
		"""The overlay/telemetry path: fps + one HandMetrics per detected hand."""
		fake_pipeline_deps['hands'] = [
			_FakeHand(Handedness.RIGHT, confidence=0.91, x=0.5, y=0.5),
			_FakeHand(Handedness.LEFT, confidence=0.72, x=0.2, y=0.3),
		]

		async with CvPipeline() as pipe:
			received = []
			async for event in pipe.events():
				received.append(event)
				if len(received) >= 3:
					break

		last = received[-1]
		assert {m.handedness for m in last.hand_metrics} == {Handedness.RIGHT, Handedness.LEFT}
		assert all(isinstance(m, HandMetrics) for m in last.hand_metrics)
		assert all(m.speed >= 0.0 for m in last.hand_metrics)

		by_hand = {m.handedness: m for m in last.hand_metrics}
		assert by_hand[Handedness.RIGHT].confidence == pytest.approx(0.91)
		assert by_hand[Handedness.LEFT].confidence == pytest.approx(0.72)

		# frame timestamps advance, so fps must have been derived by now
		assert last.fps > 0.0

	@pytest.mark.asyncio
	async def test_events_carry_the_raw_detection_for_drawing(self, fake_pipeline_deps):
		fake_pipeline_deps['hands'] = [_FakeHand()]
		async with CvPipeline() as pipe:
			async for event in pipe.events():
				assert event.detection is not None
				assert len(event.detection.hands) == 1
				break

	@pytest.mark.asyncio
	async def test_no_hands_means_no_metrics(self, fake_pipeline_deps):
		async with CvPipeline() as pipe:
			async for event in pipe.events():
				assert event.hand_metrics == []
				break

	@pytest.mark.asyncio
	async def test_stale_events_are_dropped_when_consumer_lags(self, fake_pipeline_deps):
		"""
		The event queue holds one slot: a slow consumer must get the freshest
		frame, not a backlog. Latency beats completeness for flight control.
		"""
		pipe = CvPipeline()
		await pipe.start()
		try:
			# do not read for a while — the consumer keeps overwriting the slot
			await asyncio.sleep(0.3)

			first = None
			async for event in pipe.events():
				first = event
				break

			assert first is not None
			assert first.frame_index > 1
		finally:
			await pipe.stop()

	@pytest.mark.asyncio
	async def test_events_loop_survives_an_idle_camera(self, fake_pipeline_deps):
		"""
		No frames at all: events() must keep re-checking _running on its 0.5s
		timeout instead of hanging, and stop() must be able to unstick it.
		"""
		fake_pipeline_deps['camera_frames'] = []  # capture_image() always returns None

		pipe = CvPipeline()
		await pipe.start()
		received = []

		async def drain():
			async for event in pipe.events():
				received.append(event)

		task = asyncio.create_task(drain())
		await asyncio.sleep(0.7)  # longer than the wait_for timeout
		assert not task.done()

		await pipe.stop()
		await asyncio.wait_for(task, timeout=3.0)
		assert received == []

	@pytest.mark.asyncio
	async def test_camera_backs_off_when_no_frame_is_available(self, fake_pipeline_deps):
		"""Exhausted camera -> capture_image() returns None -> back-off, no crash."""
		fake_pipeline_deps['camera_frames'] = [make_frame(1), make_frame(2)]
		fake_pipeline_deps['camera_frame_delay'] = 0.0

		async with CvPipeline() as pipe:
			await asyncio.sleep(0.2)  # camera runs dry and backs off
			assert pipe._camera_thread.is_alive()
