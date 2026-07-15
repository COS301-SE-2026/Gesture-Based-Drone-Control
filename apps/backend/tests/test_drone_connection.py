"""
currently just for POST /drone/connect
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.drone import router
from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState

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
	return adapter


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
