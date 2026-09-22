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
from typing import Optional

# hand-detection import
from services.cv_pipeline.hand_detection.mediapipe_detector import DetectedHand, Handedness


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
 
	#motion gestures
	SWIPE_LEFT = auto()
	SWIPE_RIGHT = auto()
	SWIPE_UP = auto()
	SWIPE_DOWN = auto()
	PUSH = auto()
	PULL = auto()
	CIRCLE_CW = auto()
	CIRCLE_CCW = auto()

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

#continous motion
@dataclass
class MotionVector:
	"""
	Continuous hand motion for one hand, joystick style
	
	Each axis is a deflection in [-1.0, 1.0], already deadzoned and clamped
	All 0 means the hand is sitting in its neutral position, or the
	recognizer in use does not track motion at all
	
	x: positive is toward the right of the frame
	y: positive is toward the bottom of the frame
	depth: positive is toward camera
	"""

	x: float = 0.0
	y: float = 0.0
	depth: float = 0.0

	@property
	def is_neutral(self) -> bool:
		return self.x == 0.0 and self.y == 0.0 and self.depth == 0.0

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
	#continuous motion, only populated by MotionBasedRecognizer
	#stays None under rule and ml so existing consumers are unaffected
	motion: Optional[MotionVector] = None


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
