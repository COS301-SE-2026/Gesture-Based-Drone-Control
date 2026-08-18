import sys
import time

import pytest
from _gesture_helpers import REPO_ROOT

for p in (str(REPO_ROOT), str(REPO_ROOT / 'apps' / 'backend')):
	if p not in sys.path:
		sys.path.insert(0, p)


def _wait_for_pipeline_stopped(client, timeout: float = 10.0) -> dict:
	"""
	Pipeline teardown after the last unsubscribe is async, so pull the
	status endpoint briefly
	"""
	deadline = time.monotonic() + timeout
	body = {}
	while time.monotonic() < deadline:
		body = client.get('/api/gestures/status').json()
		if body['running'] is False and body['connected_clients'] == 0:
			return body
		time.sleep(0.2)
	raise AssertionError(f'Error did not go idle within {timeout}s: {body}')


@pytest.fixture(scope='session')
def client():
	"""
	real app, real lifespan, real ASGI transport
	"""
	from app.main import app
	from fastapi.testclient import TestClient

	with TestClient(app) as c:
		yield c


@pytest.fixture()
def calibration_manager():
	"""
	real module-level singleton, reset to a clean slate per test
	"""
	from app.api.calibration import manager

	manager.reset()
	yield manager
	manager.reset()


@pytest.fixture(autouse=True)
def idle_pipeline(client, monkeypatch):
	monkeypatch.setattr('app.cv.stream.LINGER_SECONDS', 0.2)
	yield
	from app.api.gestures import stream

	client.portal.call(stream.shutdown)
