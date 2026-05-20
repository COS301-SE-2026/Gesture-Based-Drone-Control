from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

MOCK_DRONE_TELEMETRY = {
	'battery': 100,
	'altitude': 20,
	'heading': 180,
	'speed': 12.3,
	'mode': 'GUIDED',
}

MOCK_SIM_TELEMETRY = {
	'battery': 100,
	'altitude': 20,
	'heading': 180,
	'longitude': 28.1928,
	'latitude': -20.1829,
	'speed': 12.3,
	'mode': 'GUIDED',
}


def test_health_returns_200():
	response = client.get('/health')
	assert response.status_code == 200


def test_health_returns_ok():
	response = client.get('/health')
	assert response.json() == {'status': 'ok'}


@patch('app.api.api.get_drone_telemetry', new_callable=AsyncMock)
def test_drone_telemetry_sends_correct_json(mock_get):
	mock_get.return_value = MOCK_DRONE_TELEMETRY

	with client.websocket_connect('/drone/telemetry') as ws:
		data = ws.receive_json()
		assert data == MOCK_DRONE_TELEMETRY


@patch('app.api.api.get_drone_telemetry', new_callable=AsyncMock)
def test_drone_telemetry_calls_getter(mock_get):
	mock_get.return_value = MOCK_DRONE_TELEMETRY

	with client.websocket_connect('/drone/telemetry') as ws:
		ws.receive_json()
		assert mock_get.called


@patch('app.api.api.get_sim_telemetry', new_callable=AsyncMock)
def test_sim_telemetry_sends_correct_json(mock_get):
	mock_get.return_value = MOCK_SIM_TELEMETRY

	with client.websocket_connect('/sim/telemetry') as ws:
		data = ws.receive_json()
		assert data == MOCK_SIM_TELEMETRY


@patch('app.api.api.get_sim_telemetry', new_callable=AsyncMock)
def test_sim_telemetry_calls_getter(mock_get):
	mock_get.return_value = MOCK_SIM_TELEMETRY

	with client.websocket_connect('/sim/telemetry') as ws:
		ws.receive_json()
		assert mock_get.called
