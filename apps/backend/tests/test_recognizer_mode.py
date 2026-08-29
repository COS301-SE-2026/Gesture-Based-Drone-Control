import asyncio
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import pytest
from app.cv.serialization import GestureFramePayload
from app.cv.stream import GestureStream
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.cv_pipeline.processing.pipeline import RECOGNIZER_MODES, PipelineConfig

pytestmark = pytest.mark.asyncio


# fakes
@dataclass
class FakeEvent:
	frame_index: int = 0


class FakeCvPipeline:
	"""Record the mode it was ttold to use so tests can assert the swap landed"""

	instances: list['FakeCvPipeline'] = []

	def __init__(self, config: Optional[PipelineConfig] = None) -> None:
		self.config = config
		self._running = False
		self._frame_index = 0
		self.recognizer_mode = 'ml' if (config is not None and config.use_ml) else 'rule'
		self.mode_calls: list[str] = []
		FakeCvPipeline.instances.append(self)

	async def start(self) -> None:
		await asyncio.sleep(0)
		self._running = True

	async def stop(self) -> None:
		await asyncio.sleep(0)
		self._running = False

	def set_recognizer_mode(self, mode: str) -> str:
		self.mode_calls.append(mode)
		self.recognizer_mode = mode
		return mode

	async def events(self) -> AsyncIterator[FakeEvent]:
		while self._running:
			self._frame_index += 1
			yield FakeEvent(frame_index=self._frame_index)
			await asyncio.sleep(0.005)


class NoModePipeline(FakeCvPipeline):
	"""Server has no gesture_mlp.joblib so 'ml' always downgrades to 'rule'"""

	def set_recognizer_mode(self, mode: str) -> str:
		self.mode_calls.append(mode)
		self.recognizer_mode = 'rule'
		return 'rule'


def fake_serialize(event: FakeEvent, include_frame: bool = False) -> GestureFramePayload:
	return GestureFramePayload(frame_index=event.frame_index, timestamp=0.0, fps=30.0, hands=[])


# fixtures
@pytest.fixture(autouse=True)
def reset_instances():
	FakeCvPipeline.instances.clear()
	yield
	FakeCvPipeline.instances.clear()


@pytest.fixture(autouse=True)
def fast_linger(monkeypatch):
	monkeypatch.setattr('app.cv.stream.LINGER_SECONDS', 0.01)


@pytest.fixture
def patch_pipeline(monkeypatch):
	monkeypatch.setattr('app.cv.stream.CvPipeline', FakeCvPipeline)
	monkeypatch.setattr('app.cv.stream.serialize_event', fake_serialize)


@pytest.fixture
def stream(patch_pipeline) -> GestureStream:
	return GestureStream()


# GestureStream level
class TestStreamRememberMode:
	async def test_defaults_to_rule(self, stream: GestureStream):
		assert stream.recognizer_mode == 'rule'

	async def test_config_can_start_on_ml(self, patch_pipeline):
		assert GestureStream(PipelineConfig(use_ml=True)).recognizer_mode == 'ml'

	async def test_mode_set_before_any_camera_is_applied_on_start(self, stream: GestureStream):
		"""Toggling with no client connected must still take effect later"""
		await stream.set_recognizer_mode('ml')
		await stream.subscribe()

		assert FakeCvPipeline.instances[-1].recognizer_mode == 'ml'
		assert stream.recognizer_mode == 'ml'

	async def test_mode_survives_a_camera_restart(self, stream: GestureStream):
		"""
		The pipeline object is thrown away when the last client leaves, so the mode has to be
		reapplied to the replacement pipeline
		"""
		queue = await stream.subscribe()
		await stream.set_recognizer_mode('ml')
		await stream.unsubscribe(queue)
		await asyncio.sleep(0.05)

		await stream.subscribe()
		assert len(FakeCvPipeline.instances) == 2
		assert FakeCvPipeline.instances[-1].recognizer_mode == 'ml'

	async def test_swap_reaches_arunning_pipeline(self, stream: GestureStream):
		await stream.subscribe()
		await stream.set_recognizer_mode('ml')
		assert FakeCvPipeline.instances[-1].mode_calls[-1] == 'ml'

	async def test_unknown_mode_rejected(self, stream: GestureStream):
		with pytest.raises(ValueError):
			await stream.set_recognizer_mode('neural')

	async def test_running_pipeline_is_the_source_of_truth(self, monkeypatch):
		"""A downgrade inside the pipeline must be what the stream reports"""
		monkeypatch.setattr('app.cv.stream.CvPipeline', NoModePipeline)
		monkeypatch.setattr('app.cv.stream.serialize_event', fake_serialize)
		stream = GestureStream()

		await stream.subscribe()
		assert await stream.set_recognizer_mode('ml') == 'rule'
		assert stream.recognizer_mode == 'rule'


# REST layer
@pytest.fixture
def client(patch_pipeline):
	import importlib

	import app.api.gestures as gestures_module

	importlib.reload(gestures_module)

	app = FastAPI()
	app.include_router(gestures_module.router, prefix='/api')
	with TestClient(app) as test_client:
		yield test_client


class TestRecognizerEndpoints:
	async def test_get_reports_current_mode(self, client):
		body = client.get('/api/gestures/recognizer').json()

		assert body['mode'] == 'rule'
		assert set(body['available']) == set(RECOGNIZER_MODES)

	async def test_post_switches_mode(self, client):
		body = client.post('/api/gestures/recognizer', json={'mode': 'ml'}).json()

		assert body['mode'] == 'ml'
		assert body['requested'] == 'ml'
		assert client.get('/api/gestures/recognizer').json()['mode'] == 'ml'

	async def test_post_can_switch_back(self, client):
		client.post('/api/gestures/recognizer', json={'mode': 'ml'})
		assert (
			client.post('/api/gestures/recognizer', json={'mode': 'rule'}).json()['mode'] == 'rule'
		)

	async def test_unknown_mode_is_a_400(self, client):
		response = client.post('/api/gestures/recognizer', json={'mode': 'neural'})

		assert response.status_code == 400
		assert 'neural' in response.json()['detail']
