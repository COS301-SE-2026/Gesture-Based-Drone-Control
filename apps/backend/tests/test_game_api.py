from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.game import _broadcast, _clients, _register_callback, router
from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.drone_control.adapters.game_adapter import GameAdapter


def make_app(state: AppState) -> FastAPI:
	app = FastAPI()
	app.include_router(router)
	app.state.app = state
	app.dependency_overrides[get_state] = lambda: state
	return app


@pytest.fixture(autouse=True)
def clear_clients():
	"""helper to clear the global clients set before each test"""
	_clients.clear()
	yield


def test_game_connect_success():
	state = AppState()
	client = TestClient(make_app(state))

	response = client.post('/game/connect')
	assert response.status_code == 200
	body = response.json()
	assert body['active'] is True
	assert body['message'] == 'Game adapter connected'
	assert state.adapter_name == 'game'
	assert isinstance(state.adapter, GameAdapter)
	# callback should be set
	assert state.adapter._callback is not None


async def test_game_connect_replaces_existing_adapter():
	state = AppState()
	# set a dummy adapter
	old_adapter = AsyncMock()
	state.adapter = old_adapter
	state.adapter_name = 'airsim'
	assert state.is_connected

	client = TestClient(make_app(state))

	with patch.object(GameAdapter, 'connect', AsyncMock(return_value=True)):
		response = client.post('/game/connect')

	assert response.status_code == 200
	assert response.json()['active'] is True
	old_adapter.disconnect.assert_awaited_once()
	assert state.adapter_name == 'game'
	assert isinstance(state.adapter, GameAdapter)


def test_game_disconnect_when_active():
	state = AppState()
	state.adapter = GameAdapter()
	state.adapter_name = 'game'
	assert state.is_connected

	client = TestClient(make_app(state))
	response = client.post('/game/disconnect')

	assert response.status_code == 200
	body = response.json()
	assert body['active'] is False
	assert body['message'] == 'Game adapter disconnected'
	assert state.adapter is None
	assert state.adapter_name is None
	assert state.is_connected is False


def test_game_disconnect_when_not_active():
	state = AppState()
	state.adapter_name = 'tello'
	state.adapter = MagicMock()
	client = TestClient(make_app(state))

	response = client.post('/game/disconnect')

	assert response.status_code == 200
	body = response.json()
	assert body['active'] is False
	assert body['message'] == 'No game adapter is connected'
	# state unchanged
	assert state.adapter_name == 'tello'


def test_game_status_when_active():
	state = AppState()
	state.adapter = GameAdapter()
	state.adapter_name = 'game'
	# add some clients
	_clients.add(MagicMock())
	_clients.add(MagicMock())

	client = TestClient(make_app(state))
	response = client.get('/game/status')

	assert response.status_code == 200
	body = response.json()
	assert body['active'] is True
	assert body['connected_clients'] == 2


def test_game_status_when_inactive():
	state = AppState()
	state.adapter_name = None
	client = TestClient(make_app(state))

	response = client.get('/game/status')
	assert response.status_code == 200
	body = response.json()
	assert body['active'] is False
	assert body['connected_clients'] == 0


@pytest.mark.asyncio
async def test_broadcast_sends_to_clients():
	# mock websockets
	ws1 = AsyncMock()
	ws2 = AsyncMock()
	_clients.add(ws1)
	_clients.add(ws2)

	payload = {'command': 'TEST'}
	await _broadcast(payload)

	ws1.send_json.assert_awaited_once_with(payload)
	ws2.send_json.assert_awaited_once_with(payload)


@pytest.mark.asyncio
async def test_broadcast_removes_dead_clients():
	ws1 = AsyncMock()
	ws1.send_json = AsyncMock(side_effect=Exception('dead'))
	ws2 = AsyncMock()
	_clients.add(ws1)
	_clients.add(ws2)

	await _broadcast({'command': 'JARVIIIIIS'})

	assert ws1 not in _clients
	assert ws2 in _clients


def test_register_callback_when_game_adapter_active():
	state = AppState()
	adapter = GameAdapter()
	state.adapter = adapter
	state.adapter_name = 'game'

	_register_callback(state)

	# callback should be set to _broadcast
	assert adapter._callback is _broadcast


def test_register_callback_when_not_game_adapter():
	state = AppState()
	adapter = MagicMock()
	state.adapter = adapter
	state.adapter_name = 'airsim'

	_register_callback(state)

	# callback should not be set
	assert not hasattr(adapter, 'set_command_callback') or not adapter.set_command_callback.called


def test_websocket_game_commands():
	state = AppState()
	# create a GameAdapter and set it active
	adapter = GameAdapter()
	state.adapter = adapter
	state.adapter_name = 'game'

	client = TestClient(make_app(state))

	# Patch the broadcast to track calls
	with patch('apps.backend.app.api.game._broadcast', AsyncMock()):
		with client.websocket_connect('/game/ws/commands'):
			# Connection accepted
			# The client is added to _clients
			assert len(_clients) == 1

			# Wait a bit for the keepalive loop
			# cant easily test the loop, but we can close the connection
		# After disconnect, client removed
		assert len(_clients) == 0
		# When no clients, callback cleared
		assert adapter._callback is None


def test_websocket_game_commands_clears_callback_when_no_clients():
	state = AppState()
	adapter = GameAdapter()
	state.adapter = adapter
	state.adapter_name = 'game'

	client = TestClient(make_app(state))

	with client.websocket_connect('/game/ws/commands'):
		assert len(_clients) == 1
		# callback set
		assert adapter._callback is not None

	# ater disconnect, callback cleared
	assert adapter._callback is None


def test_websocket_game_commands_register_callback_on_connect():
	state = AppState()
	adapter = GameAdapter()
	state.adapter = adapter
	state.adapter_name = 'game'
	# Initially no callback
	adapter._callback = None

	client = TestClient(make_app(state))

	with client.websocket_connect('/game/ws/commands'):
		# callback should be set to _broadcast
		assert adapter._callback is _broadcast
