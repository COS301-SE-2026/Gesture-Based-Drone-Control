# apps/backend/tests/test_cv/test_gestures.py
"""
Tests for app.api.gestures: the REST status endpoint and the WebSocket
gesture stream, exercised through FastAPI's TestClient so we hit the real
routing, not just the GestureStream class in isolation (that's covered in
test_stream.py).

The shared `stream` singleton is replaced per-test with a fresh GestureStream
wired to a FakeCvPipeline, so tests don't share state and never touch a
real camera.
"""

import asyncio
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import pytest
from app.cv.serialization import GestureFramePayload
from cv_pipeline.processing.pipeline import PipelineConfig
from fastapi import FastAPI
from fastapi.testclient import TestClient


@dataclass
class FakeEvent:
	frame_index: int = 0


class FakeCvPipeline:
	def __init__(self, config: Optional[PipelineConfig] = None) -> None:
		self.started = False
		self.stopped = False
		self._running = False
		self._frame_index = 0

	async def start(self) -> None:
		await asyncio.sleeep(0)
		self.started = True
		self._running = True

	async def stop(self) -> None:
		await asyncio.sleeep(0)
		self.stopped = True
		self._running = False

	async def events(self) -> AsyncIterator[FakeEvent]:
		while self._running:
			self._frame_index += 1
			yield FakeEvent(frame_index=self._frame_index)
			await asyncio.sleep(0.005)


def fake_serialize(event: FakeEvent) -> GestureFramePayload:
	return GestureFramePayload(frame_index=event.frame_index, timestamp=0.0, fps=30.0, hands=[])


@pytest.fixture
def app_and_client(monkeypatch):
	"""
	Build a fresh FastAPI app + gestures router for each test, with the
	pipeline faked out, so tests are isolated and fast.
	"""
	monkeypatch.setattr('app.cv.stream.CvPipeline', FakeCvPipeline)
	monkeypatch.setattr('app.cv.stream.serialize_event', fake_serialize)

	# import after monkeypatching so the module-level `stream = GestureStream()`
	# singleton is rebuilt fresh and picks up the patched CvPipeline
	import importlib

	import app.api.gestures as gestures_module

	importlib.reload(gestures_module)

	app = FastAPI()
	app.include_router(gestures_module.router)
	client = TestClient(app)
	return gestures_module, client


class TestGestureStatusEndpoint:
	def test_status_when_no_clients_connected(self, app_and_client):
		_, client = app_and_client
		response = client.get('/api/gestures/status')

		assert response.status_code == 200
		body = response.json()
		assert body['running'] is False
		assert body['connected_clients'] == 0
		assert body['last_frame'] is None

	def test_status_reflects_running_state_while_websocket_open(self, app_and_client):
		_, client = app_and_client

		with client.websocket_connect('/api/gestures/stream'):
			response = client.get('/api/gestures/status')
			body = response.json()
			assert body['running'] is True
			assert body['connected_clients'] == 1

		# after the `with` block exits, the client has disconnected
		response = client.get('/api/gestures/status')
		assert response.json()['running'] is False
		assert response.json()['connected_clients'] == 0


class TestGestureWebSocketStream:
	def test_connect_and_receive_a_gesture_frame_message(self, app_and_client):
		_, client = app_and_client

		with client.websocket_connect('/api/gestures/stream') as ws:
			message = ws.receive_json()

		assert message['type'] == 'gesture_frame'
		assert 'frame_index' in message
		assert 'fps' in message
		assert message['hands'] == []

	def test_two_clients_both_receive_messages(self, app_and_client):
		"""
		TestClient's WebSocket transport does not reliably service two
		`with client.websocket_connect(...)` blocks opened in the same
		nested `with` statement (it can deadlock waiting on the second
		connection's handshake while the first is still open). Open and
		fully close the first connection before opening the second --
		this still proves the stream serves multiple clients over time,
		without relying on truly concurrent connections in the test harness.
		"""
		_, client = app_and_client

		with client.websocket_connect('/api/gestures/stream') as ws1:
			msg1 = ws1.receive_json()

		with client.websocket_connect('/api/gestures/stream') as ws2:
			msg2 = ws2.receive_json()

		assert msg1['type'] == 'gesture_frame'
		assert msg2['type'] == 'gesture_frame'

	def test_disconnect_unsubscribes_cleanly(self, app_and_client):
		gestures_module, client = app_and_client

		with client.websocket_connect('/api/gestures/stream'):
			assert gestures_module.stream.client_count == 1

		assert gestures_module.stream.client_count == 0
		assert gestures_module.stream.is_running is False

	def test_one_client_disconnecting_does_not_affect_the_other(self, app_and_client):
		gestures_module, client = app_and_client

		ws1 = client.websocket_connect('/api/gestures/stream')
		ws1.__enter__()
		ws2 = client.websocket_connect('/api/gestures/stream')
		ws2.__enter__()
		assert gestures_module.stream.client_count == 2

		ws1.__exit__(None, None, None)
		assert gestures_module.stream.client_count == 1
		assert gestures_module.stream.is_running is True  # second client keeps it alive

		ws2.__exit__(None, None, None)
		assert gestures_module.stream.client_count == 0
