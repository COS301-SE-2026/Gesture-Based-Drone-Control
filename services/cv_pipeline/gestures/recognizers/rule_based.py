# /services/cv_pipeline/gestures/recognizers/rule_based.py
"""
Rule-based gesture recognition using mediapipe landmark positions
How it works:
-> Receives a DetectedHand from mediapipe_detector.py
-> Uses landmark x/y positions to determine finger states
-> returns GestureResult
"""

import logging
import math

# hand detection import
from cv_pipeline.hand_detection.mediapipe_detector import DetectedHand

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

INDEX_MCP = 5
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
	-> For thumb: distance(thumb_tip, index_mcp) vs distance(thumb_ip, index_mcp)
		(thumb extended = tip further from index knuckle than the IP joint)
		Using index_mcp as reference makes the check rotation-invariant —
		works whether the hand is upright, tilted, or sideways.
	"""

	def interpret_gesture(self, hand: DetectedHand) -> GestureResult:
		"""
		Takes a DetectedHand, checks every finger and return GestureResult
		"""

		lm = hand.landmarks

		finger_state = FingerState(
			thumb=self._is_thumb_up(lm),
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

	def _is_thumb_up(self, landmarks) -> bool:
		"""
		Check thumb extension using distance from the index finger MCP.

		The thumb is extended when its tip is further from the index knuckle
		(landmark 5) than its IP joint (landmark 3) is. Curled thumbs cross
		toward the palm, putting the tip closer to or behind the index MCP.

		This is rotation-invariant (works at any wrist angle) and handedness-
		invariant (no need to pass left vs right) — both big improvements
		over the old tip.x vs ip.x rule
		"""

		index_mcp = landmarks[INDEX_MCP]
		thumb_tip = landmarks[THUMB_TIP]
		thumb_ip = landmarks[THUMB_IP]

		tip_dist = self._distance(thumb_tip, index_mcp)
		ip_dist = self._distance(thumb_ip, index_mcp)

		return tip_dist > ip_dist

	def _distance(self, a, b) -> float:
		"""Euclidean distance between two landmarks in normalised x/y space"""
		return math.hypot(a.x - b.x, a.y - b.y)

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
