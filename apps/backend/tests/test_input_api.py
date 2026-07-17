"""
Tests all endpoints defined in /apps/backend/app/api/input.py"

POST /input/connect
POST /input/disconnect
GET /input/status
WS /input/ws/keyboard
"""

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

	new_input = make_mock_input_adapter()
	client = TestClient(make_app(state))

	with patch('apps.backend.app.api.input._build_input_adapter', return_value=new_input):
		response = client.post('/input/connect', json={'adapter': 'keyboard'})

	assert response.status_code == 200
	assert response.json()['connected'] is True
	assert state.input is new_input
	assert state.input_name == 'keyboard'


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
