# /services/cv_pipeline/gestures/recognizers/gesture_recognizer.py
# interface class for strategy pattern, allow use of both ml and rule based

"""
Abstract class for ml and rule-based
Rule-based only implemented for now as ml is way too complicated at the moment
gesture_engine.py uses this class (strategy pattern)

Also owns the shared types (Gesture, FingerState, GestureResult) so that
ml_based.py can return the same shape as rule_based.py without either
one importing from the other
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum, auto

# hand-detection import
from cv_pipeline.hand_detection.mediapipe_detector import DetectedHand, Handedness


# gesture enum
class Gesture(Enum):
	# basic states

	# 0 fingers up
	FIST = auto()
	# all fingers up (that is, you have all 5)
	OPEN_PALM = auto()

	# finger counts
	ONE_FINGER = auto()
	TWO_FINGERS = auto()
	THREE_FINGERS = auto()
	FOUR_FINGERS = auto()

	# unknown = confidence too low or unrecognised pattern
	UNKNOWN = auto()


# finger state
@dataclass
class FingerState:
	"""
	Tracks which fingers up for one hand
	-> True = finger up
	-> False = finger down
	"""

	thumb: bool = False
	index: bool = False
	middle: bool = False
	ring: bool = False
	pinky: bool = False

	@property
	def count(self) -> int:
		# no. of fingers up
		return sum([self.thumb, self.index, self.middle, self.ring, self.pinky])


# gesture result
@dataclass
class GestureResult:
	"""
	Result of gesture recognition for one hand
	Contains classified gesture and raw finger stats
	"""

	gesture: Gesture
	finger_state: FingerState
	# pass handedness through so gesture engine knows which hand this is for
	handedness: Handedness
	# confidence = from mediapipe passed through for telemetry data
	confidence: float = 0.0


# recognizer interface
class GestureRecognizer(ABC):
	"""
	Interface for ml/rule-based
	Both recognisers must use interpret_gesture()
	gesture_engine.py uses this to stay decoupled from implementation
	"""

	@abstractmethod
	def interpret_gesture(self, hand: DetectedHand) -> GestureResult:
		"""
		Takes single detected hand and returns GestureResult
		To be implemented in all subclasses
		"""
