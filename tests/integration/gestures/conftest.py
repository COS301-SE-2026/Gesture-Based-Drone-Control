import sys

import pytest
from _gesture_helpers import REPO_ROOT

for p in (str(REPO_ROOT), str(REPO_ROOT / 'apps' / 'backend')):
	if p not in sys.path:
		sys.path.insert(0, p)


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
