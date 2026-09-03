"""
QR-12 / NFR2.1 -> short-lived session token rejected when expired
"""

from __future__ import annotations

import uuid

from services.auth.auth_settings import get_auth_settings
from services.auth.token_service import TokenError, TokenService
from tests.nfr._helpers import emit


def _service(**overrides) -> TokenService:
	settings = get_auth_settings().model_copy(update=overrides)
	return TokenService(settings)


def test_invalid_tokens_are_rejected():
	user_id = uuid.uuid4()
	failures = []
	checks = 0

	good = _service()
	checks += 1
	try:
		payload = good.validate_access_token(good.create_access_token(user_id))
		if payload.user_id != user_id:
			failures.append('valid: wrong subject returned')
	except TokenError:
		failures.append('valid: rejected a legitimate token')

	expired = _service(access_token_expire_minutes=0)
	checks += 1
	try:
		expired.validate_access_token(expired.create_access_token(user_id))
		failures.append('expired: accepted')
	except TokenError:
		pass

	forger = _service(jwt_secret_key='a-totally-different-secret-key-value')
	checks += 1
	try:
		good.validate_access_token(forger.create_access_token(user_id))
		failures.append('bad signature: accepted')
	except TokenError:
		pass

	other_aud = _service(jwt_audience='some_other_audience')
	checks += 1
	try:
		good.validate_access_token(other_aud.create_access_token(user_id))
		failures.append('bad audience: accepted')
	except TokenError:
		pass

	other_iss = _service(jwt_issuer='not_gbdc')
	checks += 1
	try:
		good.validate_access_token(other_iss.create_access_token(user_id))
		failures.append('bad issuer: accepted')
	except TokenError:
		pass

	passed = not failures

	emit(
		'QR-12',
		'NFR2.1',
		'invalid access tokens rejected',
		actual=f'{checks - len(failures)}/{checks}',
		target='all rejected',
		passed=passed,
		failures=failures,
	)

	assert passed, f'token validation gaps: {failures}'
