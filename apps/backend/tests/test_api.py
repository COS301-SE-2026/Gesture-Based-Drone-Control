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

EXPECTED_KEYS = {'flight_id', 'time', 'max_altitude', 'average_speed'}
FLIGHT_IDS    = list(range(1, 9))


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


def test_drone_flight_summary_status():
    response = client.get('/drone/flight-summary')
    assert response.status_code == 200

def test_drone_flight_summary_returns_list():
    response = client.get('/drone/flight-summary')
    assert isinstance(response.json(), list)


def test_drone_flight_summary_keys():
    response = client.get('/drone/flight-summary')
    for flight in response.json():
        assert set(flight.keys()) == EXPECTED_KEYS

def test_drone_flight_summary_flight_ids():
    response = client.get('/drone/flight-summary')
    ids = [f['flight_id'] for f in response.json()]
    assert ids == FLIGHT_IDS

def test_drone_flight_summary_values():
    response = client.get('/drone/flight-summary')
    assert response.json() == [
        {'flight_id': 1, 'time': 20, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 2, 'time': 17, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 3, 'time': 25, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 4, 'time': 18, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 5, 'time': 21, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 6, 'time': 19, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 7, 'time': 22, 'max_altitude': 4, 'average_speed': 2.5},
        {'flight_id': 8, 'time': 20, 'max_altitude': 4, 'average_speed': 2.5},
    ]

def test_drone_flight_summary_types():
    response = client.get('/drone/flight-summary')
    for flight in response.json():
        assert isinstance(flight['flight_id'],     int)
        assert isinstance(flight['time'],          (int, float))
        assert isinstance(flight['max_altitude'],  (int, float))
        assert isinstance(flight['average_speed'], (int, float))

def test_sim_flight_summary_status():
    response = client.get('/sim/flight-summary')
    assert response.status_code == 200

def test_sim_flight_summary_returns_list():
    response = client.get('/sim/flight-summary')
    assert isinstance(response.json(), list)

def test_sim_flight_summary_keys():
    response = client.get('/sim/flight-summary')
    for flight in response.json():
        assert set(flight.keys()) == EXPECTED_KEYS

def test_sim_flight_summary_flight_ids():
    response = client.get('/sim/flight-summary')
    ids = [f['flight_id'] for f in response.json()]
    assert ids == FLIGHT_IDS

def test_sim_flight_summary_values():
    response = client.get('/sim/flight-summary')
    assert response.json() == [
        {'flight_id': 1, 'time': 20, 'max_altitude': 112, 'average_speed': 18.4},
        {'flight_id': 2, 'time': 17, 'max_altitude': 98,  'average_speed': 21.7},
        {'flight_id': 3, 'time': 25, 'max_altitude': 134, 'average_speed': 15.2},
        {'flight_id': 4, 'time': 18, 'max_altitude': 87,  'average_speed': 23.9},
        {'flight_id': 5, 'time': 21, 'max_altitude': 145, 'average_speed': 19.1},
        {'flight_id': 6, 'time': 19, 'max_altitude': 103, 'average_speed': 17.6},
        {'flight_id': 7, 'time': 22, 'max_altitude': 119, 'average_speed': 22.3},
        {'flight_id': 8, 'time': 20, 'max_altitude': 91,  'average_speed': 20.8},
    ]

def test_sim_flight_summary_types():
    response = client.get('/sim/flight-summary')
    for flight in response.json():
        assert isinstance(flight['flight_id'],     int)
        assert isinstance(flight['time'],          (int, float))
        assert isinstance(flight['max_altitude'],  (int, float))
        assert isinstance(flight['average_speed'], (int, float))