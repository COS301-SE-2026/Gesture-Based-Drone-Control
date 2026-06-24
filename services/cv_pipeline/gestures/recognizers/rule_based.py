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

MIDDLE_MCP = 9
MIDDLE_PIP = 10
MIDDLE_TIP = 12

RING_MCP = 13
RING_PIP = 14
RING_TIP = 16

PINKY_MCP = 17
PINKY_PIP = 18
PINKY_TIP = 20

# angle number here now to say if a finger is up when its straight enough based on degree
# can alter value if its too strict
FINGER_STRAIGHT_DEG = 160.0
# THUMB_STRAIGHT_DEG = 150.0


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
			index=self._is_finger_up(lm, tip_idx=INDEX_TIP, pip_idx=INDEX_PIP, mcp_idx=INDEX_MCP),
			middle=self._is_finger_up(
				lm, tip_idx=MIDDLE_TIP, pip_idx=MIDDLE_PIP, mcp_idx=MIDDLE_MCP
			),
			ring=self._is_finger_up(lm, tip_idx=RING_TIP, pip_idx=RING_PIP, mcp_idx=RING_MCP),
			pinky=self._is_finger_up(lm, tip_idx=PINKY_TIP, pip_idx=PINKY_PIP, mcp_idx=PINKY_MCP),
		)

		gesture = self._classify(finger_state)

		return GestureResult(
			gesture=gesture,
			finger_state=finger_state,
			handedness=hand.handedness,
			confidence=hand.confidence,
		)

	# finger state helpers
	def _is_finger_up(self, landmarks, tip_idx: int, pip_idx: int, mcp_idx: int) -> bool:
		"""
		Returns True if the finger tip is above the pip joint.
		y increases downward so tip.y < pip.y means extended
		"""
		angle = self._angle(landmarks[mcp_idx], landmarks[pip_idx], landmarks[tip_idx])
		return angle >= FINGER_STRAIGHT_DEG

	def _angle(self, a, b, c) -> float:
		"""
		Angle 0-180 at vertex vfor med by points a,b,c
		Dot product to construct b->a, b->c
		"""
		bax = a.x - b.x
		bay = a.y - b.y
		bcx = c.x - b.x
		bcy = c.y - b.y

		mag = math.hypot(bax, bay) * math.hypot(bcx, bcy)
		if mag == 0:
			return 0.0

		cos = (bax * bcx + bay * bcy) / mag
		cos = max(-1.0, min(1.0, cos))
		return math.degrees(math.acos(cos))

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

		# angle = self._angle(landmarks[THUMB_MCP], landmarks[THUMB_IP], landmarks[THUMB_TIP])	
		# return angle >= THUMB_STRAIGHT_DEG

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
