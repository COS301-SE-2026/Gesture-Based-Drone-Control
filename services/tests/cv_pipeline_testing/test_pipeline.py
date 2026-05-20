# unit testing for pipeline.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_pipeline.py -v

import os
import sys
from unittest.mock import MagicMock

import numpy as np
import pytest

# mediapipe gets pulled in via the pipeline's imports, so mock before anything
_mock_mp = MagicMock()
sys.modules['mediapipe'] = _mock_mp

# add services/ to sys.path so cv_pipeline.* imports resolve
_services_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, _services_dir)

from cv_pipeline.camera.camera_feed import CameraConfig, CapturedFrame  # noqa: E402
from cv_pipeline.gestures.gesture_engine import GestureEngineResult  # noqa: E402
from cv_pipeline.gestures.recognizers.gesture_recognizer import (  # noqa: E402
	FingerState,
	Gesture,
	GestureResult,
)
from cv_pipeline.hand_detection.mediapipe_detector import (  # noqa: E402
	DetectorConfig,
	Handedness,
)
from cv_pipeline.processing.pipeline import (  # noqa: E402
	CvPipeline,
	PipelineConfig,
	PipelineEvent,
)


# helpers
def make_frame(idx: int = 1) -> CapturedFrame:
	"""Returns a CapturedFrame with blank rgb/bgr arrays."""
	return CapturedFrame(
		bgr_frame=np.zeros((480, 640, 3), dtype=np.uint8),
		rgb_frame=np.zeros((480, 640, 3), dtype=np.uint8),
		frame_index=idx,
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


class _FakeCamera:
	"""Mimics CameraFeed for tests — yields a finite stream of fake frames."""

	def __init__(self, _config=None, frames=None):
		self._frames = frames if frames is not None else [make_frame(i) for i in range(1, 6)]
		self._idx = 0
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
		frame = self._frames[self._idx]
		self._idx += 1
		return frame


class _FakeDetector:
	"""Mimics HandDetectionPipeline.detect_hands() — returns whatever the test set."""

	def __init__(self, _config=None):
		self.opened = False
		self.closed = False
		self.detect_calls = 0

	def open(self):
		self.opened = True

	def close(self):
		self.closed = True

	def detect_hands(self, frame):
		self.detect_calls += 1
		# return a result with no hands by default — engine will return empty too
		result = MagicMock()
		result.has_hands = False
		result.frame_index = frame.frame_index
		return result


class _FakeEngine:
	"""Mimics GestureEngine.process() — returns a canned engine result."""

	def __init__(self):
		self.process_calls = 0

	def process(self, detection):
		self.process_calls += 1
		return make_engine_result(frame_idx=detection.frame_index)


@pytest.fixture
def fake_pipeline_deps(monkeypatch):
	"""Patches CameraFeed, HandDetectionPipeline, and GestureEngine inside pipeline.py."""
	fakes = {
		'cameras': [],
		'detectors': [],
		'engines': [],
	}

	def make_camera(config):
		c = _FakeCamera(config)
		fakes['cameras'].append(c)
		return c

	def make_detector(config):
		d = _FakeDetector(config)
		fakes['detectors'].append(d)
		return d

	def make_engine():
		e = _FakeEngine()
		fakes['engines'].append(e)
		return e

	monkeypatch.setattr('cv_pipeline.processing.pipeline.CameraFeed', make_camera)
	monkeypatch.setattr('cv_pipeline.processing.pipeline.HandDetectionPipeline', make_detector)
	monkeypatch.setattr('cv_pipeline.processing.pipeline.GestureEngine', make_engine)

	return fakes


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
	async def test_start_opens_camera_and_detector(self, fake_pipeline_deps):
		pipe = CvPipeline()
		await pipe.start()
		try:
			assert len(fake_pipeline_deps['cameras']) == 1
			assert len(fake_pipeline_deps['detectors']) == 1
			assert len(fake_pipeline_deps['engines']) == 1
			assert fake_pipeline_deps['cameras'][0].opened is True
			assert fake_pipeline_deps['detectors'][0].opened is True
		finally:
			await pipe.stop()

	@pytest.mark.asyncio
	async def test_stop_closes_camera_and_detector(self, fake_pipeline_deps):
		pipe = CvPipeline()
		await pipe.start()
		camera = fake_pipeline_deps['cameras'][0]
		detector = fake_pipeline_deps['detectors'][0]
		await pipe.stop()

		assert camera.closed is True
		assert detector.closed is True

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
