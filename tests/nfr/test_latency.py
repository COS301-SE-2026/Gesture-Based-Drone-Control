"""
QR-03 / NFR1.1 -> single-frame gesture recognition latency
"""

from __future__ import annotations

import time

from services.cv_pipeline.gestures.recognizers.rule_based import RuleBasedRecognizer
from tests.nfr._helpers import emit, hand, load_dataset, p95

TARGET_P95_MS = 50.0


def test_recognition_latency_p95():
	recognizer = RuleBasedRecognizer()
	features, _ = load_dataset()
	hands = [hand(f) for f in features]

	for h in hands[:50]:
		recognizer.interpret_gesture(h)

	samples_ms = []
	for h in hands:
		start = time.perf_counter()
		recognizer.interpret_gesture(h)
		samples_ms.append((time.perf_counter() - start) * 1000)

	value = round(p95(samples_ms), 4)
	passed = value < TARGET_P95_MS

	emit(
		'QR-03',
		'NFR1.1',
		'p95 single-frame recognition latency (ms)',
		actual=value,
		target=f'< {TARGET_P95_MS}',
		passed=passed,
		frames=len(samples_ms),
		mean_ms=round(sum(samples_ms) / len(samples_ms), 4),
	)

	assert passed, f'p95 latency {value} ms exceeds {TARGET_P95_MS} ms'
