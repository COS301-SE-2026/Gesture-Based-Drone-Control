# unit testing for rule_based.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_rule_based.py -v

import os
import sys
from unittest.mock import MagicMock

import pytest

# mediapipe gets pulled in via the recognizer's import of mediapipe_detector,
# so mock it before any cv_pipeline.* imports happen
_mock_mp = MagicMock()
sys.modules['mediapipe'] = _mock_mp

# add services/ to sys.path so cv_pipeline.* imports resolve
_services_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, _services_dir)

# dont remove the noqa comment i need the import structure this way,
# linting complians import must come at very top, this stops the warning
from cv_pipeline.gestures.recognizers.gesture_recognizer import (  # noqa: E402
	FingerState,
	Gesture,
	GestureResult,
)
from cv_pipeline.gestures.recognizers.rule_based import (  # noqa: E402
	INDEX_MCP,
	INDEX_PIP,
	INDEX_TIP,
	RuleBasedRecognizer,
)
from cv_pipeline.hand_detection.mediapipe_detector import (  # noqa: E402
	DetectedHand,
	Handedness,
	HandLandmark,
)


# helpers
def make_hand(
	thumb_up=False,
	index_up=False,
	middle_up=False,
	ring_up=False,
	pinky_up=False,
	handedness=Handedness.RIGHT,
	confidence=0.95,
) -> DetectedHand:
	"""
	Builds a synthetic hand where 'up' fingers have collinear MCP-PIP-TIP
	(angle ~180°) and 'down' fingers have the tip folded back (angle ~60°).
	"""
	lm = [HandLandmark(0.5, 0.5, 0.0)] * 21  # base: all landmarks at centre

	def straight(mcp, pip, tip_lm):
		# tip continues in same direction as pip->mcp reversed — ~180 deg at pip
		return mcp, pip, HandLandmark(2 * pip.x - mcp.x, 2 * pip.y - mcp.y, 0.0)

	def curled(mcp, pip, _):
		# tip folds back toward mcp — sharp angle at pip
		return mcp, pip, HandLandmark(mcp.x, mcp.y + 0.01, 0.0)

	# thumb: landmarks 2 (MCP), 3 (IP), 4 (TIP)
	mcp = HandLandmark(0.42, 0.85, 0.0)
	pip = HandLandmark(0.36, 0.80, 0.0)
	tip = HandLandmark(0.28, 0.74, 0.0) if thumb_up else HandLandmark(0.46, 0.68, 0.0)
	lm = list(lm)
	lm[2] = mcp
	lm[3] = pip
	lm[4] = tip

	# index: 5 (MCP), 6 (PIP), 8 (TIP)
	mcp = HandLandmark(0.45, 0.65, 0.0)
	pip = HandLandmark(0.44, 0.50, 0.0)
	builder = straight if index_up else curled
	_, _, tip = builder(mcp, pip, None)
	lm[5] = mcp
	lm[6] = pip
	lm[8] = tip

	# middle: 9, 10, 12
	mcp = HandLandmark(0.50, 0.64, 0.0)
	pip = HandLandmark(0.50, 0.48, 0.0)
	builder = straight if middle_up else curled
	_, _, tip = builder(mcp, pip, None)
	lm[9] = mcp
	lm[10] = pip
	lm[12] = tip

	# ring: 13, 14, 16
	mcp = HandLandmark(0.55, 0.65, 0.0)
	pip = HandLandmark(0.55, 0.50, 0.0)
	builder = straight if ring_up else curled
	_, _, tip = builder(mcp, pip, None)
	lm[13] = mcp
	lm[14] = pip
	lm[16] = tip

	# pinky: 17, 18, 20
	mcp = HandLandmark(0.60, 0.67, 0.0)
	pip = HandLandmark(0.60, 0.54, 0.0)
	builder = straight if pinky_up else curled
	_, _, tip = builder(mcp, pip, None)
	lm[17] = mcp
	lm[18] = pip
	lm[20] = tip

	return DetectedHand(handedness=handedness, landmarks=lm, confidence=confidence)


# finger stats
class TestFingerState:
	def test_defaults_all_down(self):
		fs = FingerState()
		assert fs.thumb is False
		assert fs.index is False
		assert fs.middle is False
		assert fs.ring is False
		assert fs.pinky is False
		assert fs.count == 0

	def test_count_with_all_up(self):
		fs = FingerState(thumb=True, index=True, middle=True, ring=True, pinky=True)
		assert fs.count == 5

	def test_count_with_three_up(self):
		fs = FingerState(index=True, middle=True, ring=True)
		assert fs.count == 3


# gesture result
class TestGestureResult:
	def test_fields_stored_correctly(self):
		fs = FingerState(index=True)
		result = GestureResult(
			gesture=Gesture.ONE_FINGER,
			finger_state=fs,
			handedness=Handedness.RIGHT,
			confidence=0.88,
		)
		assert result.gesture == Gesture.ONE_FINGER
		assert result.finger_state is fs
		assert result.handedness == Handedness.RIGHT
		assert result.confidence == pytest.approx(0.88)


# finger detection helpers
class TestIsFingerUp:
	def test_finger_up_when_tip_above_pip(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True)
		assert recognizer._is_finger_up(hand.landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP) is True

	def test_finger_down_when_tip_below_pip(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=False)
		assert recognizer._is_finger_up(hand.landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP) is False


class TestIsThumbUp:
	def test_thumb_up_when_tip_far_from_index_mcp(self):
		"""Extended thumb: tip is further from index_mcp than ip joint is."""
		recognizer = RuleBasedRecognizer()
		hand = make_hand(thumb_up=True)
		assert recognizer._is_thumb_up(hand.landmarks) is True

	def test_thumb_down_when_tip_near_index_mcp(self):
		"""Curled thumb: tip crosses toward the palm, closer to index_mcp."""
		recognizer = RuleBasedRecognizer()
		hand = make_hand(thumb_up=False)
		assert recognizer._is_thumb_up(hand.landmarks) is False

	def test_thumb_detection_handedness_invariant(self):
		"""Same landmark geometry should give the same result regardless of handedness."""
		recognizer = RuleBasedRecognizer()
		right = make_hand(thumb_up=True, handedness=Handedness.RIGHT)
		left = make_hand(thumb_up=True, handedness=Handedness.LEFT)
		assert recognizer._is_thumb_up(right.landmarks) == recognizer._is_thumb_up(left.landmarks)


class TestDistance:
	def test_distance_zero_for_same_point(self):
		recognizer = RuleBasedRecognizer()
		p = HandLandmark(x=0.5, y=0.5, z=0.0)
		assert recognizer._distance(p, p) == pytest.approx(0.0)

	def test_distance_unit_for_horizontal_gap(self):
		recognizer = RuleBasedRecognizer()
		a = HandLandmark(x=0.0, y=0.5, z=0.0)
		b = HandLandmark(x=1.0, y=0.5, z=0.0)
		assert recognizer._distance(a, b) == pytest.approx(1.0)

	def test_distance_pythagorean(self):
		recognizer = RuleBasedRecognizer()
		a = HandLandmark(x=0.0, y=0.0, z=0.0)
		b = HandLandmark(x=3.0, y=4.0, z=0.0)
		assert recognizer._distance(a, b) == pytest.approx(5.0)


# gesture classification
class TestClassifyFist:
	def test_fist_when_all_fingers_down(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand()  # everything False by default
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.FIST
		assert result.finger_state.count == 0


class TestClassifyOpenPalm:
	def test_open_palm_when_all_fingers_up(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(
			thumb_up=True,
			index_up=True,
			middle_up=True,
			ring_up=True,
			pinky_up=True,
		)
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.OPEN_PALM
		assert result.finger_state.count == 5


class TestClassifyFingerCounts:
	def test_one_finger_index_only(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True)
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.ONE_FINGER
		assert result.finger_state.count == 1

	def test_two_fingers_index_and_middle(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True, middle_up=True)
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.TWO_FINGERS
		assert result.finger_state.count == 2

	def test_three_fingers(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True, middle_up=True, ring_up=True)
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.THREE_FINGERS
		assert result.finger_state.count == 3

	def test_four_fingers(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True, middle_up=True, ring_up=True, pinky_up=True)
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.FOUR_FINGERS
		assert result.finger_state.count == 4

	def test_one_finger_thumb_only(self):
		"""Counts based on total fingers up — any single finger gives ONE_FINGER."""
		recognizer = RuleBasedRecognizer()
		hand = make_hand(thumb_up=True)
		result = recognizer.interpret_gesture(hand)
		assert result.gesture == Gesture.ONE_FINGER
		assert result.finger_state.count == 1


# interpret_gesture — result fields
class TestInterpretGestureResult:
	def test_returns_gesture_result(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True)
		result = recognizer.interpret_gesture(hand)
		assert isinstance(result, GestureResult)

	def test_handedness_passed_through(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True, handedness=Handedness.LEFT)
		result = recognizer.interpret_gesture(hand)
		assert result.handedness == Handedness.LEFT

	def test_confidence_passed_through(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True, confidence=0.77)
		result = recognizer.interpret_gesture(hand)
		assert result.confidence == pytest.approx(0.77)

	def test_finger_state_reflects_landmarks(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(thumb_up=True, index_up=True, pinky_up=True)
		result = recognizer.interpret_gesture(hand)
		assert result.finger_state.thumb is True
		assert result.finger_state.index is True
		assert result.finger_state.middle is False
		assert result.finger_state.ring is False
		assert result.finger_state.pinky is True
