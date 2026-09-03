"""
QR-01 / NFR3.1 -> gesture classification accuracy over labelled dataset
QR-02 / NFR3.1 -> per gesture accuracy floor
"""

from __future__ import annotations

import collections

import pytest

from services.cv_pipeline.gestures.recognizers.ml_based import MLBasedRecognizer
from services.cv_pipeline.gestures.recognizers.rule_based import RuleBasedRecognizer
from tests.nfr._helpers import VOCABULARY, emit, hand, load_dataset

TARGET_ACCURACY = 0.95
MIN_SAMPLES = 300


def _classify_all(recognizer):
	features, labels = load_dataset()
	predictions = [recognizer.interpret_gesture(hand(f)).gesture.name for f in features]
	return predictions, labels


def _ml_recognizer():
	try:
		return MLBasedRecognizer()
	except FileNotFoundError:
		pytest.skip('trained ML model (gesture_mlp.joblib) not available')


def _overall(predictions, labels) -> float:
	correct = sum(p == t for p, t in zip(predictions, labels))
	return correct / len(labels)


def _per_gesture(predictions, labels) -> dict[str, float]:
	out: dict[str, float] = {}
	for gesture in VOCABULARY:
		idx = [i for i, t in enumerate(labels) if t == gesture]
		if idx:
			hits = sum(predictions[i] == gesture for i in idx)
			out[gesture] = round(100 * hits / len(idx), 1)
	return out


def test_ml_overall_accuracy():
	predictions, labels = _classify_all(_ml_recognizer())
	assert len(labels) >= MIN_SAMPLES, f'need >= {MIN_SAMPLES} samples, got {len(labels)}'

	accuracy = _overall(predictions, labels)

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
		engine='ml',
		samples=len(labels),
		top_confusions=confusions,
	)

	assert accuracy >= TARGET_ACCURACY, (
		f'ML accuracy {accuracy:.1%} below target; top confusion: {confusions[:3]}'
	)


def test_ml_per_gesture_accuracy():
	predictions, labels = _classify_all(_ml_recognizer())

	per_gesture = _per_gesture(predictions, labels)

	worst = min(per_gesture.values()) if per_gesture else 0.0

	emit(
		'QR-02',
		'NFR3.1',
		'lowest per-gesture accuracy (%)',
		actual=worst,
		target=f'>= {TARGET_ACCURACY * 100}',
		passed=worst >= TARGET_ACCURACY * 100,
		engine='ml',
		per_gesture=per_gesture,
	)

	assert worst >= TARGET_ACCURACY * 100, f'weakest ML gesture at {worst}%: {per_gesture}'


def test_rule_based_accuracy_is_recorded():
	"""
	Rule-based is at its design ceiling and is expected to sit below target.
	This records the measured value as evidence (passed=True because meeting
	the target is not this engine's job) so the matrix documents the gap that
	motivates the ML recognizer. It never fails the build.
	"""
	predictions, labels = _classify_all(RuleBasedRecognizer())

	accuracy = _overall(predictions, labels)
	per_gesture = _per_gesture(predictions, labels)
	worst = min(per_gesture.values()) if per_gesture else 0.0

	emit(
		'QR-01-rule',
		'NFR3.1',
		'rule-based accuracy, informational (%)',
		actual=round(accuracy * 100, 2),
		target='informational (ML is the gated engine)',
		passed=True,
		engine='rule',
		lowest_per_gesture=worst,
		per_gesture=per_gesture,
	)

	# sanity only: the recognizer runs and classifies the whole set
	assert len(predictions) == len(labels)
