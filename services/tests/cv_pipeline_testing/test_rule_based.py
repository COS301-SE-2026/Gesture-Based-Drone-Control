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

#dont remove the noqa comment i need the import structure this way, linting complians import must come at very top, this stops the warning
from cv_pipeline.gestures.recognizers.gesture_recognizer import (  # noqa: E402
	FingerState,
	Gesture,
	GestureResult,
)

from cv_pipeline.gestures.recognizers.rule_based import (  # noqa: E402
	INDEX_MCP,
	INDEX_PIP,
	INDEX_TIP,
	MIDDLE_PIP,
	MIDDLE_TIP,
	PINKY_PIP,
	PINKY_TIP,
	RING_PIP,
	RING_TIP,
	THUMB_IP,
	THUMB_TIP,
	RuleBasedRecognizer,
)

from cv_pipeline.hand_detection.mediapipe_detector import (  # noqa: E402
	NUM_LANDMARKS,
	DetectedHand,
	Handedness,
	HandLandmark,
)

#helpers
def make_hand(
	thumb_up: bool = False,
	index_up: bool = False,
	middle_up: bool = False,
	ring_up: bool = False,
	pinky_up: bool = False,
	handedness: Handedness = Handedness.RIGHT,
	confidence: float = 0.95,
) -> DetectedHand:
	"""
	Build a DetectedHand with landmark positions that show the desired
	finger states.

	y axis: 0 = top, 1 = bottom. A finger is "up" when tip.y < pip.y.
	-> finger up:   tip.y = 0.2, pip.y = 0.5
	-> finger down: tip.y = 0.8, pip.y = 0.5

	Thumb extension is distance-based: tip is "up" when its distance from
	the index MCP is greater than the IP joint's distance from the index MCP
	We anchor the index MCP at (0.4, 0.5) and choose thumb positions so:
	-> thumb up:   thumb_tip far from index_mcp 
	-> thumb down: thumb_tip close to / inside the palm 
	"""
	# start every landmark in the centre and irrelevant points stay neutral
	landmarks = [HandLandmark(x=0.5, y=0.5, z=0.0) for _ in range(NUM_LANDMARKS)]

	# four vertical fingers
	for tip_idx, pip_idx, is_up in [
		(INDEX_TIP, INDEX_PIP, index_up),
		(MIDDLE_TIP, MIDDLE_PIP, middle_up),
		(RING_TIP, RING_PIP, ring_up),
		(PINKY_TIP, PINKY_PIP, pinky_up),
	]:
		landmarks[pip_idx] = HandLandmark(x=0.5, y=0.5, z=0.0)
		tip_y = 0.2 if is_up else 0.8
		landmarks[tip_idx] = HandLandmark(x=0.5, y=tip_y, z=0.0)

	# thumb: distance from index_mcp at (0.4, 0.5)
	# ip joint sits at (0.3, 0.5) — distance ~0.10 from index_mcp
	# extended tip lands at (0.05, 0.5) — distance ~0.35 > 0.10 -> "up"
	# curled tip lands at (0.45, 0.5) — distance ~0.05 < 0.10 -> "down"
	landmarks[INDEX_MCP] = HandLandmark(x=0.4, y=0.5, z=0.0)
	landmarks[THUMB_IP] = HandLandmark(x=0.3, y=0.5, z=0.0)
	if thumb_up:
		landmarks[THUMB_TIP] = HandLandmark(x=0.05, y=0.5, z=0.0)
	else:
		landmarks[THUMB_TIP] = HandLandmark(x=0.45, y=0.5, z=0.0)

	return DetectedHand(
		handedness=handedness,
		landmarks=landmarks,
		confidence=confidence,
	)

#finger stats
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


#gesture result
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


#finger detection helpers
class TestIsFingerUp:
	def test_finger_up_when_tip_above_pip(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=True)
		assert recognizer._is_finger_up(hand.landmarks, INDEX_TIP, INDEX_PIP) is True

	def test_finger_down_when_tip_below_pip(self):
		recognizer = RuleBasedRecognizer()
		hand = make_hand(index_up=False)
		assert recognizer._is_finger_up(hand.landmarks, INDEX_TIP, INDEX_PIP) is False

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
		assert recognizer._is_thumb_up(right.landmarks) == recognizer._is_thumb_up(
			left.landmarks
		)

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


#gesture classification
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