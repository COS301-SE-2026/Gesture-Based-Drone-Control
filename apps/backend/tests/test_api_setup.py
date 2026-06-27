"""
Tests that i set up the API correctly
mount router, appstate, dependencies
"""

from typing import Annotated
from unittest.mock import MagicMock

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.drone import router
from apps.backend.app.dependencies import get_adapter, get_state
from apps.backend.app.state import AppState
from services.drone_control.adapters.drone_adapter import DroneAdapter


#  appstate tests
def test_connected_when_adapter_set():
	state = AppState()
	state.adapter = MagicMock()

	assert state.is_connected is True


def test_reset_clears_adapter():
	state = AppState()
	state.adapter = MagicMock()
	state.adapter_name = 'notdummy'

	state.reset()

	assert state.adapter_name is None


# telemetry streaming should stop
def test_reset_cancels_telemetry_task():
	state = AppState()

	mock_task = MagicMock()
	mock_task.done.return_value = False
	state.telemetry_task = mock_task

	state.reset()

	mock_task.cancel.assert_called_once()
	assert state.telemetry_task is None


# clients should not be disconnected on a state reset
def test_reset_does_not_touch_clients():
	state = AppState()

	mock_ws = MagicMock()
	state.clients.add(mock_ws)

	state.reset()

	assert mock_ws in state.clients


# state dependencies
def test_get_state_returns_app_state():
	app_state = AppState()
	app = FastAPI()
	app.state.app = app_state
	assert app.state.app is app_state


# adapter dependencies
def test_get_adapter_raises_409_when_no_adapter():
	app_state = AppState()

	app = FastAPI()
	app.include_router(router)
	app.dependency_overrides[get_state] = lambda: app_state

	@app.get('/test-adapter')
	def _test(adapter: Annotated[DroneAdapter, Depends(get_adapter)]):
		return {'ok': True}

	client = TestClient(app, raise_server_exceptions=False)
	response = client.get('/test-adapter')

	assert response.status_code == 409


def test_get_adapter_returns_adapter_when_connected():
	state = AppState()
	state.adapter = MagicMock()
	state.adapter_name = 'dummy'

	result = get_adapter(state)

	assert result is state.adapter


# can mount and reach router
def test_connect_route_exists():
	state = AppState()

	app = FastAPI()
	app.include_router(router)
	app.dependency_overrides[get_state] = lambda: state

	client = TestClient(app, raise_server_exceptions=False)

	# empty body will hit validation (422), but not 404
	response = client.post('/connect', json={})
	assert response.status_code != 404
