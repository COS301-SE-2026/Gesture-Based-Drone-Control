"""
QR-17 / NFR7.1 -> a liveness probe exists for every major subsystem
QR-18 / NFR7.2 -> health probes require no authentication

this is tested by looking whether each subsystem exposes a liveness endpoint,
and that those endpoints are eachable without a session

monitor badge would go in readme but even then our app is not deployed
to a website but packaged through github releases so uptime would be 100% all
the time just with new updated version being roled out
"""

from __future__ import annotations

import sys

from tests.nfr._helpers import REPO_ROOT, emit

# evety subsystem that should answer a liveness probe
EXPECTED_HEALTH_ROUTES = {
	'/api/health',
	'/api/auth/health',
	'/api/drone/health',
	'/api/gestures/health',
}


def _generated_openapi():
	"""Pull schema FastAPI generates from live app or none"""
	backend = REPO_ROOT / 'apps' / 'backend'
	for entry in (str(REPO_ROOT), str(backend)):
		if entry not in sys.path:
			sys.path.insert(0, entry)
	try:
		from app.main import app

		return app.openapi()
	except Exception:
		return None


def test_every_subsystem_exposes_a_health_probe():
	spec = _generated_openapi()
	assert spec is not None, 'backend not importable; run under uv so app.main resolves'

	present = {p for p in spec['paths'] if p.endswith('/health')}
	missing = sorted(EXPECTED_HEALTH_ROUTES - present)

	emit(
		'QR-17',
		'NFR7.1',
		'subsystems exposing a liveness probe',
		actual=f'{len(EXPECTED_HEALTH_ROUTES) - len(missing)}/{len(EXPECTED_HEALTH_ROUTES)}',
		target='all present',
		passed=not missing,
		health_routes=sorted(present),
		missing=missing,
	)

	assert not missing, f'subsystem with no health probe: {missing}'


def test_health_probes_need_no_authentication():
	"""An uptime monitor cant authenticate, so probes must be open"""
	spec = _generated_openapi()
	assert spec is not None, 'backend not importable; run under uv'

	gated = []
	for route in EXPECTED_HEALTH_ROUTES:
		operation = spec['paths'].get(route, {}).get('get', {})
		if operation.get('security'):
			gated.append(route)

	emit(
		'QR-18',
		'NFR7.2',
		'health probes reachable without authentication',
		actual=f'{len(EXPECTED_HEALTH_ROUTES) - len(gated)}/{len(EXPECTED_HEALTH_ROUTES)}',
		target='all unauthenticated',
		passed=not gated,
		auth_gated=gated,
	)

	assert not gated, f'health probes requiring auth (monitor cannot reach): {gated}'
