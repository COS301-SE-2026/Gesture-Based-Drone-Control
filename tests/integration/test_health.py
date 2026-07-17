from fastapi.testclient import TestClient

from apps.backend.app.main import app


def test_health_endpoint():
	with TestClient(app) as client:
		response = client.get('/api/health')

		assert response.status_code == 200
		assert response.json() == {'status': 'ok'}


def test_drone_health_endpoint():
	with TestClient(app) as client:
		response = client.get('/api/drone/health')

		assert response.status_code == 200
		assert response.json() == {'status': 'ok'}


def test_gestures_health_endpoint():
	with TestClient(app) as client:
		response = client.get('/api/gestures/health')

		assert response.status_code == 200
		assert response.json() == {'status': 'ok'}


def test_auth_health_endpoint():
	with TestClient(app) as client:
		response = client.get('/api/auth/health')

		assert response.status_code == 200
		assert response.json() == {'status': 'ok'}
