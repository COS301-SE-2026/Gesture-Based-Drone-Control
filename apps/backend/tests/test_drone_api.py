# apps/backend/tests/test_drone_api.py

"""
Comprehensive testing for all drone endpoints:
	POST /drone/connect
	GET /drone/disconnect
"""

import math
from unittest.mock import ANY, AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.drone import ConnectRequest, _build_adapter, _record_telemetry, router
from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.drone_control.adapters.drone_adapter import TelemetryData

# helpers


def make_app(state: AppState) -> FastAPI:
	app = FastAPI()
	app.include_router(router)
	app.state.app = state
	app.dependency_overrides[get_state] = lambda: state
	return app


def make_mock_adapter(connect_returns: bool = True) -> MagicMock:
	adapter = MagicMock()
	adapter.connect = AsyncMock(return_value=connect_returns)
	adapter.disconnect = AsyncMock()
	adapter.get_telemetry = AsyncMock(
		return_value=TelemetryData(
			altitude_m=10.0,
			speed_ms=2.0,
			battery_pct=85.0,
			heading_deg=90.0,
			is_flying=True,
			source='mock',
		)
	)
	adapter.execute = AsyncMock()
	return adapter


def connected_state(adapter_name: str = 'dummy') -> AppState:
	"""helper to create an AppState with an already connected adapter"""
	state = AppState()
	state.adapter = make_mock_adapter()
	state.adapter_name = adapter_name
	return state


# POST drone/connect
# test successful connections with all sims
# mocks the drone sims since we just need to see if it behaves right
# assuming a successful connection


@pytest.mark.asyncio
async def test_connect_dummy():
	state = AppState()
	client = TestClient(make_app(state))

	mock_adapter = make_mock_adapter()

	with patch('apps.backend.app.api.drone._build_adapter', return_value=mock_adapter):
		response = client.post('/drone/connect', json={'adapter': 'dummy'})

	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is True
	assert body['adapter'] == 'dummy'
	assert state.is_connected is True


@pytest.mark.asyncio
async def test_connect_projectairsim():
	state = AppState()
	client = TestClient(make_app(state))

	mock_adapter = make_mock_adapter()

	with patch('apps.backend.app.api.drone._build_adapter', return_value=mock_adapter):
		response = client.post(
			'/drone/connect',
			json={
				'adapter': 'projectairsim',
				'host': '127.0.0.2',
				'topics_port': 1234,
				'services_port': 4567,
			},
		)

	assert response.status_code == 200
	assert response.json()['connected'] is True
	assert state.adapter_name == 'projectairsim'


@pytest.mark.asyncio
async def test_connect_airsim():
	state = AppState()
	client = TestClient(make_app(state))

	mock_adapter = make_mock_adapter()

	with patch('apps.backend.app.api.drone._build_adapter', return_value=mock_adapter):
		response = client.post(
			'/drone/connect',
			json={
				'adapter': 'airsim',
				'port': 1234,
			},
		)

	assert response.status_code == 200
	assert response.json()['connected'] is True
	assert state.adapter_name == 'airsim'


# test failures
async def test_connect_adapter_connect_fails():  # NOSONAR
	"""should get a 200 with connected==False"""
	state = AppState()
	client = TestClient(make_app(state))

	mock_adapter = make_mock_adapter(connect_returns=False)

	with patch('apps.backend.app.api.drone._build_adapter', return_value=mock_adapter):
		response = client.post('/drone/connect', json={'adapter': 'dummy'})

	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is False
	assert state.is_connected is False


@pytest.mark.asyncio
async def test_connect_unknown_adapter():
	"""should do nothing"""
	state = AppState()
	client = TestClient(make_app(state))

	response = client.post('/drone/connect', json={'adapter': 'fakebullshitadapter'})

	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is False
	assert 'fakebullshitadapter' in body['message'].lower() or 'unknown' in body['message'].lower()
	assert state.is_connected is False


# switching between adapters (the really important paart)
@pytest.mark.asyncio
async def test_connect_replaces_existing_adapter():
	"""Connecting while already connected should disconnect the old adapter first"""
	state = AppState()

	old_adapter = make_mock_adapter()
	state.adapter = old_adapter
	state.adapter_name = 'dummy'

	new_adapter = make_mock_adapter()
	client = TestClient(make_app(state))

	with patch('apps.backend.app.api.drone._build_adapter', return_value=new_adapter):
		response = client.post('/drone/connect', json={'adapter': 'projectairsim'})

	assert response.status_code == 200
	assert response.json()['connected'] is True

	# old adapter should have been disconnected
	old_adapter.disconnect.assert_awaited_once()

	# state should now hold the new adapter
	assert state.adapter is new_adapter
	assert state.adapter_name == 'projectairsim'


# POST drone/disconnect


@pytest.mark.asyncio
async def test_disconnect_when_connected():
	"""disconnect from drone and reset state"""
	state = connected_state('dummy')
	state.adapter
	client = TestClient(make_app(state))

	response = client.post('/drone/disconnect')

	assert response.status_code == 200
	assert response.json()['success'] is True
	assert state.is_connected is False


@pytest.mark.asyncio
async def test_disconnect_when_not_connected():
	"""should do nothing to state and return success: False"""
	state = AppState()
	client = TestClient(make_app(state))

	response = client.post('/drone/disconnect')

	assert response.status_code == 200
	body = response.json()
	assert body['success'] is False
	assert state.adapter_name is None


@pytest.mark.asyncio
async def test_disconnect_resets_state():
	"""state should be set to defaults no matter what"""
	state = AppState()
	client = TestClient(make_app(state))

	client.post('/drone/disconnect')
	assert state.adapter is None
	assert state.adapter_name is None
	assert state.is_connected is False


@pytest.mark.asyncio
async def test_disconnect_correct_message():
	"""message returned with successful disconnect should have adapters name"""
	state = connected_state()
	client = TestClient(make_app(state))

	response = client.post('/drone/disconnect')
	assert 'dummy' in response.json()['message'].lower()


# GET /drone/status


@pytest.mark.asyncio
async def test_status_when_not_connected():
	"""should return a success with default values"""
	state = AppState()
	client = TestClient(make_app(state))

	response = client.get('/drone/status')

	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is False
	assert body['adapter'] is None


@pytest.mark.asyncio
async def test_status_response():
	"""Check that all expected fileds are present"""
	state = connected_state()
	client = TestClient(make_app(state))

	response = client.get('/drone/status')
	telemetry = response.json()['telemetry']

	assert 'altitude_m' in telemetry
	assert 'speed_ms' in telemetry
	assert 'battery_pct' in telemetry
	assert 'heading_deg' in telemetry
	assert 'is_flying' in telemetry
	assert 'source' in telemetry


@pytest.mark.asyncio
async def test_status_values():
	"""returns correct predefined values"""
	state = connected_state()
	client = TestClient(make_app(state))

	response = client.get('/drone/status')
	telemetry = response.json()['telemetry']

	assert math.isclose(telemetry['altitude_m'], 10.0)
	assert math.isclose(telemetry['speed_ms'], 2.0)
	assert math.isclose(telemetry['battery_pct'], 85.0)
	assert telemetry['is_flying'] is True
	assert telemetry['source'] == 'mock'


# WS /drone/ws/commands


def test_commands_valid():
	"""valid command should execute and return ok: True"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/commands') as ws:
		ws.send_json({'command': 'TAKEOFF'})
		response = ws.receive_json()

	assert response['ok'] is True
	assert response['command'] == 'TAKEOFF'


def test_commands_invalid():
	"""Should return an error with a list of valid commands"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/commands') as ws:
		ws.send_json({'command': 'JARVIS_GET_ME_A_BEER'})
		response = ws.receive_json()

	assert 'error' in response
	assert 'valid' in response
	assert 'JARVIS_GET_ME_A_BEER' in response['error']
	state.adapter.execute.assert_not_awaited()


def test_commands_no_drone():
	"""Should return an error with no drone connected"""
	state = AppState()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/commands') as ws:
		ws.send_json({'command': 'TAKEOFF'})
		response = ws.receive_json()

	assert 'error' in response
	assert 'connect' in response['error'].lower()


def test_commands_custom_source():
	"""should pass the source to the adapter"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/commands') as ws:
		ws.send_json({'command': 'TAKEOFF', 'source': 'myass'})
		ws.receive_json()

	call_args = state.adapter.execute.await_args
	command = call_args.args[0]
	assert command.source == 'myass'


def test_commands_default_source():
	"""should default to ws_commands"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/commands') as ws:
		ws.send_json({'command': 'TAKEOFF'})
		ws.receive_json()

	call_args = state.adapter.execute.await_args
	command = call_args.args[0]
	assert command.source == 'ws_commands'


def test_commands_multiple_commands():
	"""should execute all commands sent in sequence"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/commands') as ws:
		ws.send_json({'command': 'TAKEOFF'})
		ws.receive_json()
		ws.send_json({'command': 'MOVE_FORWARD'})
		ws.receive_json()
		ws.send_json({'command': 'LAND'})
		ws.receive_json()

	assert state.adapter.execute.await_count == 3


# ws drone/ws/telemetry


def test_telemetry_gets_data():
	"""should recieve data when drone is connected"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/telemetry') as ws:
		data = ws.receive_json()

	assert 'altitude_m' in data
	assert 'is_flying' in data
	assert data['source'] == 'mock'


def test_telemetry_register_client():
	"""should add clients to state.clients on connect"""
	state = connected_state()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/telemetry'):
		assert len(state.clients) == 1


def test_telemetry_no_crash():
	"""should keep socket open when no adapter is connected"""
	state = AppState()
	client = TestClient(make_app(state))

	with client.websocket_connect('/drone/ws/telemetry'):
		assert len(state.clients) == 1


# all the junk sonarqube and codecov are whining about


def test_build_projectairsim_adapter():
	with patch(
		'services.drone_control.adapters.project_airsim_adapter.ProjectAirSimAdapter'
	) as cls:
		body = ConnectRequest(
			adapter='projectairsim',
			host='1.2.3.4',
			vehicle_name='Drone',
			topics_port=123,
			services_port=456,
		)

		_build_adapter(body)

		cls.assert_called_once_with(
			host='1.2.3.4',
			vehicle_name='Drone',
			topics_port=123,
			services_port=456,
		)


def test_build_airsim_adapter():
	with patch('services.drone_control.adapters.airsim_adapter.AirSimAdapter') as cls:
		body = ConnectRequest(
			adapter='airsim',
			host='localhost',
			port=5000,
			vehicle_name='Drone',
		)

		_build_adapter(body)

		cls.assert_called_once_with(
			host='localhost',
			port=5000,
			vehicle_name='Drone',
		)


def test_health():
	client = TestClient(make_app(AppState()))
	r = client.get('/drone/health')
	assert r.status_code == 200
	assert r.json() == {'status': 'ok'}


@pytest.mark.asyncio
async def test_connect_set_drone():
	state = AppState()
	client = TestClient(make_app(state))

	adapter = make_mock_adapter()

	drone = MagicMock(id=42)

	with (
		patch(
			'apps.backend.app.api.drone._build_adapter',
			return_value=adapter,
		),
		patch(
			'apps.backend.app.api.drone.flight_manager.get_or_create_drone',
			AsyncMock(return_value=drone),
		),
	):
		client.post('/drone/connect', json={'adapter': 'dummy'})

	assert state.current_drone_id == 42


@pytest.mark.asyncio
async def test_record_telemetry_no_flight():
	state = AppState()

	telemetry = TelemetryData(
		altitude_m=1,
		speed_ms=2,
		battery_pct=3,
		heading_deg=4,
		is_flying=True,
		source='jomama',
	)

	await _record_telemetry(state, telemetry)


@pytest.mark.asyncio
async def test_record_telemetry_records():
	from apps.backend.app.api.drone import _record_telemetry

	state = AppState()
	state.current_flight_id = uuid4()

	telemetry = TelemetryData(
		altitude_m=102,
		speed_ms=12,
		battery_pct=2,
		heading_deg=0,
		is_flying=True,
		source='aaaaaaaa',
	)

	with patch(
		'apps.backend.app.api.drone.flight_manager.record_telemetry',
		AsyncMock(),
	) as record:
		await _record_telemetry(state, telemetry)

	record.assert_awaited_once()


@pytest.mark.asyncio
async def test_record_telemetry_exception():
	from apps.backend.app.api.drone import _record_telemetry

	state = AppState()
	state.current_flight_id = uuid4()

	telemetry = TelemetryData(
		altitude_m=1,
		speed_ms=1,
		battery_pct=1,
		heading_deg=1,
		is_flying=True,
		source='pleaseworkiwannagoeepytime',
	)

	with patch(
		'apps.backend.app.api.drone.flight_manager.record_telemetry',
		AsyncMock(side_effect=RuntimeError),
	):
		await _record_telemetry(state, telemetry)
  

def test_telemetry_records_every_tenth():
	state = connected_state()

	client = TestClient(make_app(state))

	with patch('apps.backend.app.api.drone._record_telemetry', AsyncMock()) as record:
		with client.websocket_connect('/drone/ws/telemetry') as ws:
			for _ in range(10):
				ws.receive_json()

		record.assert_awaited_once()


def test_takeoff_starts_flight():
	state = connected_state()

	drone_id = uuid4()
	state.current_drone_id = drone_id

	flight_id = uuid4()
	flight = MagicMock(id=flight_id)

	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.drone.flight_manager.start_flight',
		AsyncMock(return_value=flight),
	):
		with client.websocket_connect('/drone/ws/commands') as ws:
			ws.send_json({'command': 'TAKEOFF'})
			response = ws.receive_json()

	assert response['ok'] is True
	assert state.current_flight_id == flight_id


def test_land_ends_flight():
	state = connected_state()

	flight_id = uuid4()
	state.current_flight_id = flight_id

	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.drone.flight_manager.end_flight',
		AsyncMock(),
	) as end:
		with client.websocket_connect('/drone/ws/commands') as ws:
			ws.send_json({'command': 'LAND'})
			response = ws.receive_json()

	assert response['ok'] is True
	end.assert_awaited_once_with(ANY, flight_id)
	assert state.current_flight_id is None


@pytest.mark.asyncio
async def test_disconnect_ends_active_flight():
	state = connected_state()

	state.current_flight_id = uuid4()

	client = TestClient(make_app(state))

	with patch(
		'apps.backend.app.api.drone.flight_manager.end_flight',
		AsyncMock(),
	) as end:
		client.post('/drone/disconnect')

	end.assert_awaited_once()
