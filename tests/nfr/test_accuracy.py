"""
QR-01 / NFR3.1 -> gesture classification accuracy over labelled dataset
QR-02 / NFR3.2 -> per gesture accuracy floor
"""

from __future__ import annotations

import collections

from services.cv_pipeline.gestures.recognizers.rule_based import RuleBasedRecognizer
from tests.nfr._helpers import VOCABULARY, emit, hand, load_dataset

TARGET_ACCURACY = 0.95
MIN_SAMPLES = 300


def _classify_all():
	recognizer = RuleBasedRecognizer()
	features, labels = load_dataset()
	predictions = [recognizer.interpret_gesture(hand(f)).gesture.name for f in features]
	return predictions, labels


def test_overall_accuracy():
	predictions, labels = _classify_all()
	assert len(labels) >= MIN_SAMPLES, f'need >= {MIN_SAMPLES} samples, got {len(labels)}'

	correct = sum(p == t for p, t in zip(predictions, labels))
	accuracy = correct / len(labels)

	confusions = collections.Counter(
		f'{t}->{p}' for p, t in zip(predictions, labels) if p != t
	).most_common(5)

	emit(
		'QR-01',
		'NFR3.1',
		'gesture classification accuracy (%)',
		actual=round(accuracy * 100, 2),
		target=f'>= {TARGET_ACCURACY * 100}',
		passed=accuracy >= TARGET_ACCURACY,
		samples=len(labels),
		top_confusions=confusions,
	)

	assert accuracy >= TARGET_ACCURACY, (
		f'accuracy {accuracy:.1%} below target; top confusion: {confusions[:3]}'
	)


def test_per_gesture_accuracy():
	predictions, labels = _classify_all()

	per_gesture = {}
	for gesture in VOCABULARY:
		idx = [i for i, t in enumerate(labels) if t == gesture]
		if idx:
			hits = sum(predictions[i] == gesture for i in idx)
			per_gesture[gesture] = round(100 * hits / len(idx), 1)

	worst = min(per_gesture.values()) if per_gesture else 0.0

	emit(
		'QR-02',
		'NFR3.2',
		'lowest per-gesture accuracy (%)',
		actual=worst,
		target=f'>= {TARGET_ACCURACY * 100}',
		passed=worst >= TARGET_ACCURACY * 100,
		per_gesture=per_gesture,
	)

	assert worst >= TARGET_ACCURACY * 100, f'weakest gesture at {worst}%: {per_gesture}'
