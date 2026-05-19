# /services/cv_pipeline/gestures/recognizers/rule_based.py
"""
Rule-based gesture recognition using mediapipe landmark positions
How it works:
-> Receives a DetectedHand from mediapipe_detector.py
-> Uses landmark x/y positions to determine finger states
-> returns GestureResult
"""

import logging

# hand detection import
from cv_pipeline.hand_detection.mediapipe_detector import DetectedHand, Handedness

# pull interface + shared types from the recognizer module
from .gesture_recognizer import (
	FingerState,
	Gesture,
	GestureRecognizer,
	GestureResult,
)

logger = logging.getLogger(__name__)

# land mark consts
THUMB_MCP = 2
THUMB_IP = 3
THUMB_TIP = 4

INDEX_PIP = 6
INDEX_TIP = 8

MIDDLE_PIP = 10
MIDDLE_TIP = 12

RING_PIP = 14
RING_TIP = 16

PINKY_PIP = 18
PINKY_TIP = 20


# rule-based recognizer
class RuleBasedRecognizer(GestureRecognizer):
	"""
	Classifies gestures using landmark geometry
	Finger up detection:
	-> For index, middle, ring, pinky: tip.y < pip.y
	(y=0 is top of frame, so tip above pip = finger extended)
	-> For thumb: compare tip.x vs mcp.x adjusted for handedness
	(thumb extends horizontally, not vertically)
	"""

	def interpret_gesture(self, hand: DetectedHand) -> GestureResult:
		"""
		Takes a DetectedHand, checks every finger and return GestureResult
		"""

		lm = hand.landmarks

		finger_state = FingerState(
			thumb=self._is_thumb_up(lm, hand.handedness),
			index=self._is_finger_up(lm, INDEX_TIP, INDEX_PIP),
			middle=self._is_finger_up(lm, MIDDLE_TIP, MIDDLE_PIP),
			ring=self._is_finger_up(lm, RING_TIP, RING_PIP),
			pinky=self._is_finger_up(lm, PINKY_TIP, PINKY_PIP),
		)

		gesture = self._classify(finger_state)

		return GestureResult(
			gesture=gesture,
			finger_state=finger_state,
			handedness=hand.handedness,
			confidence=hand.confidence,
		)

	# finger state helpers
	def _is_finger_up(self, landmarks, tip_idx: int, pip_idx: int) -> bool:
		"""
		Returns True if the finger tip is above the pip joint.
		y increases downward so tip.y < pip.y means extended
		"""

		return landmarks[tip_idx].y < landmarks[pip_idx].y

	def _is_thumb_up(self, landmarks, handedness: Handedness) -> bool:
		"""
		Thumb extends horizontally so we compare x positions
		For a right hand: tip.x < ip.x means thumb is out to the left
		For a left hand:  tip.x > ip.x means thumb is out to the right
		Accounts for the mirror flip applied in camera_feed.py

		Heads up: this gets shaky if the user tilts/rotates their wrist,
		since the thumb stops being purely horizontal. Fine for demo 1,
		revisit by comparing against the index MCP if false counts pile up
		"""

		tip_x = landmarks[THUMB_TIP].x
		ip_x = landmarks[THUMB_IP].x

		if handedness == Handedness.RIGHT:
			return tip_x < ip_x
		else:
			return tip_x > ip_x

	# gesture classification
	def _classify(self, fs: FingerState) -> Gesture:
		"""
		Maps finger count to a Gesture
		Specific patterns (fist, open palm) take priority over raw count
		"""
		count = fs.count

		if count == 0:
			return Gesture.FIST

		if count == 5:
			return Gesture.OPEN_PALM

		# map count to gesture
		count_map = {
			1: Gesture.ONE_FINGER,
			2: Gesture.TWO_FINGERS,
			3: Gesture.THREE_FINGERS,
			4: Gesture.FOUR_FINGERS,
		}

		return count_map.get(count, Gesture.UNKNOWN)
