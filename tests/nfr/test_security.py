"""
QR-07 / NFR4.1 -> access token lifetime is short enough to limit exposure
"""

from __future__ import annotations

from services.auth.auth_settings import get_auth_settings
from tests.nfr._helpers import emit

MAX_LIFETIME_MINUTES = 30


def test_access_token_lifetime_bounded():
	minutes = get_auth_settings().access_token_expire_minutes
	passed = 0 < minutes <= MAX_LIFETIME_MINUTES

	emit(
		'QR-07',
		'NFR4.1',
		'access-token lifetime (minutes)',
		actual=minutes,
		target=f' <= {MAX_LIFETIME_MINUTES}',
		passed=passed,
	)

	assert passed, f'token lifetime {minutes} min outside (0, {MAX_LIFETIME_MINUTES})'
