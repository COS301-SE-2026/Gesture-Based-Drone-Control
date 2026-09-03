"""
QR-04 / NFR3.2 -> every recognisable gesture maps to a defined drone command
QR-05 / NFR3.2 -> two-hand combinations resolve to the expected command
QR-06 / NFR3.2 -> low-confidence frames are rejected by the confidence gate
"""

from __future__ import annotations

from services.input.sources.gesture_adapter import (
	ASYMMETRICAL_TWO_HAND_MAP,
	MIN_CONFIDENCE,
	SINGLE_HAND_MAP,
	TWO_HAND_MAP,
	GestureAdapter,
)
from tests.nfr._helpers import emit


def _resolve(by_side):
	return GestureAdapter.__new__(GestureAdapter)._resolve(by_side)


def test_single_hand_gestures_map_to_commands():
	resolved = {g: _resolve({'RIGHT': g}) for g in SINGLE_HAND_MAP}
	unmapped = [g for g, c in resolved.items() if c is None]

	emit(
		'QR-04',
		'NFR3.2',
		'single-hand gestures resloving to command',
		actual=f'{len(SINGLE_HAND_MAP) - len(unmapped)}/{len(SINGLE_HAND_MAP)}',
		target='all mapped',
		passed=not unmapped,
		mapped={g: c.name for g, c in resolved.items() if c},
	)

	assert not unmapped, f'gestures with no command: {unmapped}'


def test_two_hand_combinations_resolve():
	failures = []
	for (r, left), expected in ASYMMETRICAL_TWO_HAND_MAP.items():
		if _resolve({'RIGHT': r, 'LEFT': left}) != expected:
			failures.append(f'{r}+{left}')
	for combo, expected in TWO_HAND_MAP.items():
		pair = tuple(combo)
		g1 = pair[0]
		g2 = pair[1] if len(pair) > 1 else pair[0]
		if _resolve({'RIGHT': g1, 'LEFT': g2}) != expected:
			failures.append(f'{g1}+{g2}')

	total = len(ASYMMETRICAL_TWO_HAND_MAP) + len(TWO_HAND_MAP)
	emit(
		'QR-05',
		'NFR3.2',
		'two-hand combinations resolving correctly',
		actual=f'{total - len(failures)}/{total}',
		target='all resolve',
		passed=not failures,
		failures=failures,
	)

	assert not failures, f'combos that did not resolve as expected: {failures}'


def test_confidence_threshold_is_enforec():
	emit(
		'QR-06',
		'NFR3.2',
		'minimum confidence threshold for command emission',
		actual=MIN_CONFIDENCE,
		target='>= 0.85',
		passed=MIN_CONFIDENCE >= 0.85,
	)

	assert MIN_CONFIDENCE >= 0.85, f'confidence gate too low at{MIN_CONFIDENCE}'
