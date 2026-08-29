"""
Tests all endpoints defined in /apps/backend/app/api/input.py"

POST /input/connect
POST /input/disconnect
GET /input/status
WS /input/ws/keyboard
"""

from math import isclose
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.input import router
from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState


# helpers
def make_app(state: AppState) -> FastAPI:
	app = FastAPI()
	app.include_router(router)
	app.dependency_overrides[get_state] = lambda: state
	return app


def make_mock_input_adapter() -> MagicMock:
	adapter = MagicMock()
	adapter.start = AsyncMock()
	adapter.stop = AsyncMock()
	adapter.handle_message = AsyncMock()
	adapter.set_handler = MagicMock()
	return adapter


def make_mock_drone_adapter() -> MagicMock:
	adapter = MagicMock()
	adapter.execute = AsyncMock()
	return adapter


def connected_input_state(input_name: str = 'dummy') -> AppState:
	"""AppState with an input adapter already connected."""
	state = AppState()
	state.input = make_mock_input_adapter()
	state.input_name = input_name
	return state


# POST /connect


@pytest.mark.asyncio
async def test_connect_input_dummy():
	state = AppState()
	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.input._build_input_adapter', return_value=make_mock_input_adapter()
	):
		response = client.post('input/connect', json={'adapter': 'dummy'})

	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is True
	assert body['adapter'] == 'dummy'
	assert state.input_connected is True


@pytest.mark.asyncio
async def test_connect_input_keyboard():
	state = AppState()
	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.input._build_input_adapter', return_value=make_mock_input_adapter()
	):
		response = client.post('/input/connect', json={'adapter': 'keyboard'})

	assert response.status_code == 200
	assert state.input_name == 'keyboard'
	assert response.json()['connected'] is True


@pytest.mark.asyncio
async def test_connect_invalid():
	"""unknown adapter should return connected: False"""
	state = AppState()
	client = TestClient(make_app(state))

	response = client.post('/input/connect', json={'adapter': '2006toyotacorolla'})
	body = response.json()

	assert response.status_code == 200
	assert '2006toyotacorolla' in body['message'].lower() or 'unknown' in body['message'].lower()
	assert body['connected'] is False
	assert state.input_connected is False


@pytest.mark.asyncio
async def test_connect_set_handler():
	"""the haandler should be registered on the adapter before start is called"""
	state = AppState()
	client = TestClient(make_app(state))

	mock_adapter = make_mock_input_adapter()

	with patch('apps.backend.app.api.input._build_input_adapter', return_value=mock_adapter):
		client.post('/input/connect', json={'adapter': 'dummy'})

	mock_adapter.set_handler.assert_called_once()
	mock_adapter.start.assert_awaited_once()


@pytest.mark.asyncio
async def test_connect_replaces():
	"""
	connecting while one is already connected should replace it
	we only allow one input adapter at a time
	"""
	state = connected_input_state('dummy')

	previous = state.input
	new_input = make_mock_input_adapter()
	client = TestClient(make_app(state))

	with patch('apps.backend.app.api.input._build_input_adapter', return_value=new_input):
		response = client.post('/input/connect', json={'adapter': 'keyboard'})

	assert response.status_code == 200
	assert response.json()['connected'] is True
	assert state.input is new_input
	assert state.input_name == 'keyboard'
	previous.stopassert_awaited_once()


@pytest.mark.asyncio
async def test_connect_without_drone():
	"""should connect even without a drone"""
	state = AppState()  # disconnected state has no drone
	assert state.adapter is None

	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.input._build_input_adapter', return_value=make_mock_input_adapter()
	):
		response = client.post('/input/connect', json={'adapter': 'keyboard'})

	assert response.status_code == 200
	assert response.json()['connected'] is True


@pytest.mark.asyncio
async def test_connect_response_contains_adapter_name():
	"""Response message should mention the adapter name"""
	state = AppState()
	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.input._build_input_adapter', return_value=make_mock_input_adapter()
	):
		response = client.post('/input/connect', json={'adapter': 'dummy'})

	assert 'dummy' in response.json()['message'].lower()


# POST /input/disconnect


@pytest.mark.asyncio
async def test_disconnect_when_connected():
	"""
	Should return success: True and clear input state
	"""
	state = connected_input_state('keyboard')
	client = TestClient(make_app(state))

	response = client.post('/input/disconnect')

	assert response.status_code == 200
	assert response.json()['success'] is True


def test_disconnect_when_not_connected():
	"""
	Should return success: False when nothing is connected
	"""
	state = AppState()
	client = TestClient(make_app(state))

	response = client.post('/input/disconnect')

	assert response.status_code == 200
	assert response.json()['success'] is False


def test_disconnect_message_contains_name():
	"""
	Success message should mention which adapter was disconnected
	"""
	state = connected_input_state('keyboard')
	client = TestClient(make_app(state))

	response = client.post('/input/disconnect')

	assert 'keyboard' in response.json()['message'].lower()


@pytest.mark.asyncio
async def test_disconnect_does_not_touch_drone():
	"""
	Disconnecting input should not affect the drone adapter at all
	"""
	state = connected_input_state('dummy')
	drone = make_mock_drone_adapter()
	state.adapter = drone
	state.adapter_name = 'dummy'

	client = TestClient(make_app(state))
	client.post('/input/disconnect')

	assert state.adapter is drone
	assert state.adapter_name == 'dummy'


# GET /input/status


@pytest.mark.asyncio
async def test_status_not_connected():
	state = AppState()
	client = TestClient(make_app(state))

	response = client.get('/input/status')

	assert response.status_code == 200
	assert response.json()['connected'] is False


@pytest.mark.asyncio
async def test_status_connected():
	state = connected_input_state('keyboard')
	client = TestClient(make_app(state))

	response = client.get('/input/status')

	assert response.status_code == 200
	assert response.json()['connected'] is True
	assert response.json()['adapter'] == 'keyboard'


# WS /input/ws/keyboard


def test_keyboard_forwards_msg():
	"""
	only keydown messages should be forwarded to the handler
	"""
	state = connected_input_state('keyboard')
	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/keyboard') as ws:
		ws.send_json({'key': 'ArrowUp', 'event': 'keydown'})

	# holy x.y.z
	state.input.handle_message.assert_awaited_once_with({'key': 'ArrowUp', 'event': 'keydown'})


def test_keyboard_no_crash():
	"""
	socket should stay open and silently drop messages when no input adapter is connected
	"""
	state = AppState()
	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/keyboard') as ws:
		ws.send_json({'key': 'ArrowUp', 'event': 'keydown'})


def test_ws_keyboard_multiple_messages():
	"""
	multiple messages sent at basically the same time should all be
	forwarded and therefore handled
	"""
	state = connected_input_state('keyboard')
	client = TestClient(make_app(state))

	# takeoff, move, nothing
	with client.websocket_connect('/input/ws/keyboard') as ws:
		ws.send_json({'key': 't', 'event': 'keydown'})
		ws.send_json({'key': 'ArrowUp', 'event': 'keydown'})
		ws.send_json({'key': ' ', 'event': 'keydown'})

	assert state.input.handle_message.await_count == 3


# WS /input/ws/gamepad
# pretty much copied over from keyboard above

# WS /input/ws/gamepad


def test_gamepad_forwards_msg():
	"""
	A valid controller snapshot should be forwarded to the GamepadAdapter.
	"""
	state = connected_input_state('gamepad')
	client = TestClient(make_app(state))

	msg = {
		'left_x': 0.4,
		'left_y': -0.8,
		'right_x': 0.2,
		'right_y': 0.0,
		'ltrigger': 0.0,
		'rtrigger': 0.0,
		'a': False,
		'b': False,
	}

	with client.websocket_connect('/input/ws/gamepad') as ws:
		ws.send_json(msg)

	state.input.handle_message.assert_awaited_once_with(msg)


def test_gamepad_no_crash():
	"""
	The websocket should remain alive even if no gamepad adapter
	is currently connected.
	"""
	state = AppState()
	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/gamepad') as ws:
		ws.send_json(
			{
				'left_x': 0.0,
				'left_y': 0.0,
				'right_x': 0.0,
				'right_y': 0.0,
			}
		)


def test_ws_gamepad_multiple_messages():
	"""
	Multiple controller snapshots should all be forwarded.
	"""
	state = connected_input_state('gamepad')
	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/gamepad') as ws:
		ws.send_json({'left_x': 0.0, 'left_y': -1.0})
		ws.send_json({'left_x': 0.6, 'right_x': 0.2})
		ws.send_json({'a': True})

	assert state.input.handle_message.await_count == 3


def test_ws_gamepad_wrong_adapter():
	"""
	If another adapter is connected, gamepad messages should be ignored
	"""
	state = connected_input_state('keyboard')
	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/gamepad') as ws:
		ws.send_json({'left_x': 1.0})

	state.input.handle_message.assert_not_awaited()


# gesture adapter testing


@pytest.mark.asyncio
async def test_connect_input_gesture():
	"""juuuust a connect. you know the drill"""
	state = AppState()
	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.input._build_input_adapter',
		return_value=make_mock_input_adapter(),
	):
		response = client.post('/input/connect', json={'adapter': 'gesture'})

	assert response.status_code == 200
	assert response.json()['connected'] is True
	assert state.input_name == 'gesture'


def test_gesture_config_success():
	"""config should be user configurable"""
	state = connected_input_state('gesture')

	state.input._idle_timeout = 3.0
	state.input._min_confidence = 0.85
	state.input._min_stable_frames = 2

	client = TestClient(make_app(state))

	response = client.post(
		'/input/gesture/config',
		json={
			'idle_timeout_s': 5.0,
			'min_confidence': 0.9,
			'min_stable_frames': 4,
		},
	)

	assert response.status_code == 200
	assert response.json()['ok'] is True

	assert isclose(state.input._idle_timeout, 5.0)
	assert isclose(state.input._min_confidence, 0.9)
	assert isclose(state.input._min_stable_frames, 4)


def test_gesture_config_wrong_adapter():
	"""cant config when we have a different adapter connected"""
	state = connected_input_state('justsomebullshit')
	client = TestClient(make_app(state))

	response = client.post(
		'/input/gesture/config',
		json={
			'idle_timeout_s': 5,
			'min_confidence': 0.9,
			'min_stable_frames': 4,
		},
	)

	assert response.status_code == 200
	assert response.json()['ok'] is False


def test_gesture_status_inactive():
	"""When no Gesture adapter is connected should report inactive"""
	state = AppState()
	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/gesture/status') as ws:
		data = ws.receive_json()

	assert data == {'active': False}


def test_gesture_status_active():
	"""if connected expose status"""
	state = AppState()

	adapter = MagicMock()
	adapter.last_resolution = 'TAKEOFF'
	adapter.last_confidence = 0.97
	adapter._idle_timeout = 5.0
	adapter._min_confidence = 0.9

	state.input = adapter
	state.input_name = 'gesture'

	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/gesture/status') as ws:
		data = ws.receive_json()

	assert data == {
		'active': True,
		'last_gesture': 'TAKEOFF',
		'last_confidence': 0.97,
		'idle_timeout_s': 5.0,
		'min_confidence': 0.9,
	}


def test_gesture_status_logs_exception():
	"""Catch other exceptions and log them"""
	state = AppState()

	adapter = MagicMock()
	adapter.last_resolution = 'HOVER'

	# force snapshot construction to fail
	type(adapter).last_confidence = property(
		lambda self: (_ for _ in ()).throw(RuntimeError('blowup'))
	)

	state.input = adapter
	state.input_name = 'gesture'

	client = TestClient(make_app(state))

	with client.websocket_connect('/input/ws/gesture/status'):
		pass
