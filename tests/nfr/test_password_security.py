"""
QR-08 / NFR2.2 -> credential handling: password hashing work factor is
deliberately expesnive (bcrypt cost floor)
QR-09 / NFR2.2 -> credential handling: strength policy rejects weak passwords
QR-10 / NFR2.2 -> credential handling: indentical passwords hash to distinct digests
"""

from __future__ import annotations

import time

from services.auth.auth_settings import get_auth_settings
from services.auth.password_service import (
	hash_password,
	validate_password_strength,
	verify_password,
)
from tests.nfr._helpers import emit

MIN_BCRYPT_ROUNDS = 12
GOOD_PASSWORD = 'Str0ng!Pass'

WEAK_PASSWORDS = [
	('Sh1!', 'too short'),
	('alllowercase1!', 'no uppercase'),
	('ALLUPPERCASE1', 'no lowercase'),
	('NoDigitsHere!', 'no number'),
	('NoSpecial123', 'no special character'),
]


def test_bcrypt_work_factor():
	rounds = get_auth_settings().bcrypt_rounds

	start = time.perf_counter()
	digest = hash_password(GOOD_PASSWORD)
	elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

	passed = rounds >= MIN_BCRYPT_ROUNDS and digest.startswith('$2')

	emit(
		'QR-08',
		'NFR2.2',
		'bcrypt cost factor (rounds)',
		actual=rounds,
		target=f'>= {MIN_BCRYPT_ROUNDS}',
		passed=passed,
		hash_time_ms=elapsed_ms,
	)

	assert rounds >= MIN_BCRYPT_ROUNDS, f'bcrypt rounds too low at {rounds}'
	assert verify_password(GOOD_PASSWORD, digest), 'hash did not verify against original'


def test_weak_passwords_rejected():
	rejected = 0
	leaked = []
	for password, reason in WEAK_PASSWORDS:
		try:
			validate_password_strength(password)
			leaked.append(f'{reason}: accepted')
		except ValueError:
			rejected += 1

	strong_ok = validate_password_strength(GOOD_PASSWORD) == GOOD_PASSWORD

	passed = rejected == len(WEAK_PASSWORDS) and strong_ok

	emit(
		'QR-09',
		'NFR2.2',
		'weak password rejected by strength policy',
		actual=f'{rejected}/{len(WEAK_PASSWORDS)}',
		target='all rejected',
		passed=passed,
		leaked=leaked,
		strong_password_accepted=strong_ok,
	)

	assert not leaked, f'weak password slipped through: {leaked}'
	assert strong_ok, 'a compliant password was rejected'


def test_hashes_are_salted():
	first = hash_password(GOOD_PASSWORD)
	second = hash_password(GOOD_PASSWORD)

	distinct = first != second
	both_verify = verify_password(GOOD_PASSWORD, first) and verify_password(GOOD_PASSWORD, second)

	passed = distinct and both_verify

	emit(
		'QR-10',
		'NFR2.2',
		'identical passwords produce distinct digests',
		actual='distinct' if distinct else 'identical',
		target='distinct',
		passed=passed,
		both_verify=both_verify,
	)

	assert distinct, 'same password hashed to identical digests (missing salt)'
	assert both_verify, 'salted digests failed to verify'
