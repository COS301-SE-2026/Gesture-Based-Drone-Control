import os
import sys
from unittest.mock import MagicMock

import numpy as np
import pytest

_mock_mp = MagicMock()
sys.modules['mediapipe'] = _mock_mp

_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, _repo_root)

from services.cv_pipeline.gestures.recognizers.gesture_recognizer import Gesture  # noqa: E402
from services.cv_pipeline.gestures.recognizers.ml_based import (  # noqa: E402
	NUM_FEATURES,
	MLBasedRecognizer,
	extract_features,
)
from services.cv_pipeline.hand_detection.mediapipe_detector import (  # noqa: E402
	DetectedHand,
	Handedness,
	HandLandmark,
)


# helpers
def make_hand(handedness=Handedness.RIGHT, confidence=0.95, offset=0.0, scale=1.0):
	"""Synethetic hand with distinct landmark per index so the feature vector isnt degenerate."""
	lm = []
	for i in range(21):
		x = (0.30 + i * 0.01) * scale + offset
		y = (0.50 - i * 0.015) * scale + offset
		lm.append(HandLandmark(x, y, 0.0))
	return DetectedHand(handedness=handedness, landmarks=lm, confidence=confidence)


class FakeModel:
	"""Stands in for trained sklearn estimator loaded from joblib"""

	def __init__(self, classes, proba):
		self.classes_ = list(classes)
		self._proba = proba
		self.seen = []

	def predict_proba(self, features):
		self.seen.append(features)
		return np.array([self._proba])


@pytest.fixture
def patch_joblib(monkeypatch):
	"""Load a fakemodel instead of reading gesture_mlp.joblib off disk"""

	def _install(model, exists=True):
		monkeypatch.setattr(
			'services.cv_pipeline.gestures.recognizers.ml_based.Path.exists',
			lambda _self: exists,
		)
		monkeypatch.setattr(
			'services.cv_pipeline.gestures.recognizers.ml_based.joblib.load',
			lambda _path: model,
		)
		return model

	return _install


# tests
class TestExtractFeatures:
	def test_returns_flat_vector_of_expected_length(self):
		assert extract_features(make_hand()).shape == (NUM_FEATURES,)

	def test_translation_invariant(self):
		"""Moving the hand across the frame must not change the features"""
		a = extract_features(make_hand(offset=0.0))
		b = extract_features(make_hand(offset=0.25))
		assert np.allclose(a, b, atol=1e-5)

	def test_scale_invariant(self):
		"""Hand size /distance from camera must not change features"""
		a = extract_features(make_hand(scale=1.0))
		b = extract_features(make_hand(scale=2.0))
		assert np.allclose(a, b, atol=1e-5)

	def test_left_hand_is_mirrored_not_shifted(self):
		"""Left hand get x reflected so one model serves both hands, A mirrored
		right hand and the left hand must land on the same feature vector"""
		right = make_hand(handedness=Handedness.RIGHT)
		mirrored = DetectedHand(
			handedness=Handedness.LEFT,
			landmarks=[HandLandmark(-p.x, p.y, p.z) for p in right.landmarks],
			confidence=right.confidence,
		)
		assert np.allclose(extract_features(right), extract_features(mirrored), atol=1e-5)

	def test_degenerate_hand_does_not_divide_by_zero(self):
		"""All landmarks stacked"""
		flat = DetectedHand(
			handedness=Handedness.RIGHT,
			landmarks=[HandLandmark(0.5, 0.5, 0.0)] * 21,
			confidence=0.9,
		)
		features = extract_features(flat)
		assert features.shape == (NUM_FEATURES,)
		assert not np.isnan(features).any()


class TestModelLoading:
	def test_missing_model_raises_file_not_found(self, monkeypatch):
		monkeypatch.setattr(
			'services.cv_pipeline.gestures.recognizers.ml_based.Path.exists',
			lambda _self: False,
		)
		with pytest.raises(FileNotFoundError):
			MLBasedRecognizer()

	def test_classes_are_read_off_the_model(self, patch_joblib):
		patch_joblib(FakeModel(['FIST', 'OPEN_PALM'], [0.9, 0.1]))
		assert MLBasedRecognizer()._classes == ['FIST', 'OPEN_PALM']

	def test_confident_prediction_maps_onto_the_enum(self, patch_joblib):
		patch_joblib(FakeModel(['FIST', 'OPEN_PALM'], [0.05, 0.95]))
		result = MLBasedRecognizer().interpret_gesture(make_hand())

		assert result.gesture is Gesture.OPEN_PALM
		assert result.confidence == pytest.approx(0.95)

	def test_low_confidence_becomes_unknown(self, patch_joblib):
		patch_joblib(FakeModel(['FIST', 'OPEN_PALM'], [0.45, 0.55]))
		result = MLBasedRecognizer(min_confidence=0.6).interpret_gesture(make_hand())

		assert result.gesture is Gesture.UNKNOWN
		assert result.confidence == pytest.approx(0.55)

	def test_label_outside_the_enum_becomes_unknown(self, patch_joblib):
		patch_joblib(FakeModel(['NOT_A_GESTURE'], [1.0]))
		result = MLBasedRecognizer().interpret_gesture(make_hand())
		assert result.gesture is Gesture.UNKNOWN

	def test_handedness_passes_through(self, patch_joblib):
		patch_joblib(FakeModel(['FIST'], [1.0]))
		result = MLBasedRecognizer().interpret_gesture(make_hand(handedness=Handedness.LEFT))
		assert result.handedness is Handedness.LEFT

	def test_finger_state_still_comes_from_geometry(self, patch_joblib):
		"""The model only predicts a gesture; finger counts stay rule-based"""
		patch_joblib(FakeModel(['FIST'], [1.0]))
		result = MLBasedRecognizer().interpret_gesture(make_hand())
		assert 0 <= result.finger_state.count <= 5

	def test_model_receives_a_single_batched_row(self, patch_joblib):
		model = patch_joblib(FakeModel(['FIST'], [1.0]))
		MLBasedRecognizer().interpret_gesture(make_hand())
		assert model.seen[0].shape == (1, NUM_FEATURES)
