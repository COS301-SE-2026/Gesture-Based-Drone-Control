# apps/backend/tests/test_drone_api.py

"""
Comprehensive testing for all drone endpoints:
	POST /drone/connect
	GET /drone/disconnect
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.drone import router
from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.drone_control.adapters.drone_adapter import TelemetryData

# helpers


def make_app(state: AppState) -> FastAPI:
	app = FastAPI()
	app.include_router(router)
	app.dependency_overrides[get_state] = lambda: state
	return app


def make_mock_adapter(connect_returns: bool = True) -> MagicMock:
	adapter = MagicMock()
	adapter.connect = AsyncMock(return_value=connect_returns)
	adapter.disconnect = AsyncMock()
	adapter.get_telemetry = AsyncMock(return_value=TelemetryData(
		altitude_m=10.0,
		speed_ms=2.0,
		battery_pct=85.0,
		heading_deg=90.0,
		is_flying=True,
		source='mock',
	))
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
		response = client.post('/connect', json={'adapter': 'dummy'})

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
			'/connect',
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
			'/connect',
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
		response = client.post('/connect', json={'adapter': 'dummy'})

	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is False
	assert state.is_connected is False


@pytest.mark.asyncio
async def test_connect_unknown_adapter():
	"""should do nothing"""
	state = AppState()
	client = TestClient(make_app(state))

	response = client.post('/connect', json={'adapter': 'fakebullshitadapter'})

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
		response = client.post('/connect', json={'adapter': 'projectairsim'})

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
	adapter = state.adapter
	client = TestClient(make_app(state))
	
	response = client.post('/disconnect')
	
	assert response.status_code == 200
	assert response.json()['success'] is True
	assert state.is_connected is False

@pytest.mark.asyncio
async def test_disconnect_when_not_connected():
	"""should do nothing to state and return success: False"""
	state = AppState()
	client = TestClient(make_app(state))
	
	response = client.post('/disconnect')
	
	assert response.status_code == 200
	body = response.json()
	assert body['success'] is False
	assert state.adapter_name is None

@pytest.mark.asyncio 
async def test_disconnect_resets_state():
	"""state should be set to defaults no matter what"""
	state = AppState()
	client = TestClient(make_app(state))
	
	response = client.post('/disconnect')
	assert state.adapter is None
	assert state.adapter_name is None
	assert state.is_connected is False

@pytest.mark.AsyncIterator
async def test_disconnect_correct_message():
	"""message returned with successful disconnect should have adapters name"""
	state = connected_state()
	client = TestClient(make_app(state))
	
	response = client.post('/disconnect')
	assert 'dummy' in response.json()['message'].lower()

# GET /drone/status

@pytest.mark.asyncio 
async def test_status_when_not_connected():
	"""should return a success with default values"""
	state = AppState()
	client = TestClient(make_app(state))
	
	response = client.get('/status')
	
	assert response.status_code == 200
	body = response.json()
	assert body['connected'] is False
	assert body['adapter'] is None

@pytest.mark.asyncio
async def test_status_response():
	"""Check that all expected fileds are present"""
	state = connected_state()
	client = TestClient(make_app(state))

	response = client.get('/status')
	telemetry = response.json()['telemetry']
	
	assert 'altitude_m' in telemetry
	assert 'speed_ms' in telemetry
	assert 'battery_pct' in telemetry
	assert 'heading_deg' in telemetry
	assert 'is_flying' in telemetry
	assert 'source' in telemetry

@pytest.mark.AsyncIterator
async def test_status_values():
	"""returns correct predefined values"""
	state = connected_state()
	client = TestClient(make_app(state))

	response = client.get('/status')
	telemetry = response.json()['telemetry']

	assert telemetry['altitude_m'] == 10.0
	assert telemetry['speed_ms'] == 2.0
	assert telemetry['battery_pct'] == 85.0
	assert telemetry['is_flying'] is True
	assert telemetry['source'] == 'mock'

# WS /drone/ws/commands