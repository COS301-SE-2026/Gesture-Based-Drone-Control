# /services/cv-pipeline/recognizers/ml_based.py
"""
ML-based gesture recognition using mediapipe landmark positions
How it works:
	->Receives a detected hand from mediapipe_detector.py
	-> Normalises the 21 landmarks into a 63-value feature vector
	-> Feeds the vector through a trained sklearn MLP classifier
	-> Returns GestureResult

The model file is produced by ml_training/train_model.py, if it doesnt
exist yet, collect data first with ml_training/collect_landmarks.py

Why landmarks instead of raw frames:
interpret_gesture() only gets a detected hand, so the classifier works on geometry
Mediapipe solves vision problem so a tiny MLP on 63 floats is microseconds per hand
and generalises across lighting and backgrounds for free
"""

import logging
from pathlib import Path

import joblib
import numpy as np

from services.cv_pipeline.hand_detection.mediapipe_detector import DetectedHand, Handedness

from .gesture_recognizer import (
	Gesture,
	GestureRecognizer,
	GestureResult,
)
from .rule_based import RuleBasedRecognizer

logger = logging.getLogger(__name__)

# landamrk consts
WRIST = 0
MIDDLE_MCP = 9

# 21 landmarks * (x,y,z)
NUM_FEATURES = 63

# default location the training script writes to
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / 'models' / 'gesture_mlp.joblib'

# below this predicted probability we return unkown insteaf of guessing
DEFAULT_MIN_CONFIDENCE = 0.6


# feature extraction
# shared by inference and training (collect_landmarks.py imports this)
def extract_features(hand: DetectedHand) -> np.ndarray:
	"""
	Turns a detected hand into a normalised 63-value feature factor

	Normalisation steps:
	1.) translate: subtract the wrsit so position in frame doesnt matter
	2.) scale: divide by wrist->middle_mcp so hand size /distance from camera dont matter
	3.) mirror: flip x for LEFT hands so one model handles both hands
	"""
	lm = hand.landmarks
	wrist = lm[WRIST]

	pts = np.array(
		[[p.x - wrist.x, p.y - wrist.y, p.z - wrist.z] for p in lm],
		dtype=np.float32,
	)

	# paml length as the scale reference
	scale = float(np.hypot(pts[MIDDLE_MCP][0], pts[MIDDLE_MCP][1]))
	if scale < 1e-6:
		# degenerate hand
		scale = float(np.abs(pts).max()) or 1.0
	pts /= scale

	if hand.handedness == Handedness.LEFT:
		pts[:, 0] *= -1.0

	return pts.flatten()


# ml recognizer
class MLBasedRecognizer(GestureRecognizer):
	"""
	Classifies gestures with a trained sklearn model instead of hand rules

	Swap it in at runtime:
		engine.set_recognizer(MLBasedRecognizer())

	Labels are Gesture enum names (FIST, OPEN_PALM, ONE_FINGER, ...) so the
	model output maps straight back onto the enum
	Anything the model inst confident about becomes Gesture.UNKNOWN
	"""

	def __init__(
		self,
		model_path: Path | str = DEFAULT_MODEL_PATH,
		min_confidence: float = DEFAULT_MIN_CONFIDENCE,
	) -> None:
		self._model_path = Path(model_path)
		self._min_confidence = min_confidence

		if not self._model_path.exists():
			raise FileNotFoundError(
				f'No trained model at {self._model_path} '
				'Collect data with ml_training/collect_landmarks.py '
				'then train with ml_training/train_model.py'
			)

		self._model = joblib.load(self._model_path)
		self._classes: list[str] = [str(c) for c in self._model.classes_]

		self._finger_helper = RuleBasedRecognizer()

		logger.info(
			'MLBasedRecognizer loaded %s, classes=%s, min_confidence=%.2f',
			self._model_path.name,
			self._classes,
			self._min_confidence,
		)

	def interpret_gesture(self, hand: DetectedHand) -> GestureResult:
		"""
		Takes a Detecetd hand, runs the classifier and returns GestureResult
		"""
		features = extract_features(hand).reshape(1, -1)

		proba = self._model.predict_proba(features)[0]
		best_idx = int(np.argmax(proba))
		best_prob = float(proba[best_idx])
		label = self._classes[best_idx]

		if best_prob >= self._min_confidence and label in Gesture.__members__:
			gesture = Gesture[label]
		else:
			gesture = Gesture.UNKNOWN

		finger_state = self._finger_helper.interpret_gesture(hand).finger_state

		logger.debug(
			'ml gesture=%s prob=%.2f (hand=%s)',
			gesture.name,
			best_prob,
			hand.handedness.name,
		)

		return GestureResult(
			gesture=gesture,
			finger_state=finger_state,
			handedness=hand.handedness,
			# model probability, not mediapipe detection confidence
			confidence=best_prob,
		)
