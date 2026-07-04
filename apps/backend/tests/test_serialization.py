"""
Testing for hand presence and population,
No hands detected, detection itself being None
And gesture/metric lists that are shorter than the hands list
"""

import pytest
from app.cv.serialization import serialize_event
from cv_pipeline.gestures.gesture_engine import GestureEngineResult
from cv_pipeline.gestures.recognizers.gesture_recognizer import (
	FingerState,
	Gesture,
	GestureResult,
)
from cv_pipeline.hand_detection.mediapipe_detector import (
	DetectedHand,
	HandDetectionResult,
	Handedness,
	HandLandmark,
)
from cv_pipeline.processing.pipeline import CapturedFrame, HandMetrics, PipelineEvent


# builders
def make_landmarks(x: float = 0.5, y: float = 0.5, z: float = 0.0) -> list[HandLandmark]:
	return [HandLandmark(x=x, y=y, z=z) for _ in range(21)]


def make_hand(
	handedness: Handedness = Handedness.RIGHT,
	confidence: float = 0.95,
) -> DetectedHand:
	return DetectedHand(handedness=handedness, landmarks=make_landmarks(), confidence=confidence)


def make_event(
	*,
	frame_index: int = 1,
	timestamp: float = 100.0,
	fps: float = 28.7,
	detection: HandDetectionResult | None = None,
	hand_gestures: list[GestureResult] | None = None,
	hand_metrics: list[HandMetrics] | None = None,
) -> PipelineEvent:
	frame = CapturedFrame(
		bgr_frame=None, rgb_frame=None, frame_index=frame_index, timestamp=timestamp
	)
	return PipelineEvent(
		frame=frame,
		detection=detection,
		engine_result=GestureEngineResult(
			hand_gestures=hand_gestures if hand_gestures is not None else [],
			frame_index=frame_index,
		),
		hand_metrics=hand_metrics if hand_metrics is not None else [],
		fps=fps,
	)


# tests
class TestSerializeTopLevelFields:
	def test_passes_through_frame_metadata(self):
		event = make_event(frame_index=142, timestamp=1719831600.123, fps=28.74)
		payload = serialize_event(event)

		assert payload.frame_index == 142
		assert payload.timestamp == 1719831600.123
		assert payload.fps == 28.7

	def test_type_discriminator_defaults_to_gesture_frame(self):
		payload = serialize_event(make_event())
		assert payload.type == 'gesture_frame'


class TestSerializeEventNoHands:
	def test_detection_is_none(self):
		"""
		before detector opens, event.detection may be None outright
		"""
		event = make_event(detection=None)
		payload = serialize_event(event)
		assert payload.hands == []

	def test_detection_present_but_empty(self):
		"""
		No hands in cam view -> HandDetectionResult(hands=[])
		"""
		event = make_event(detection=HandDetectionResult(hands=[]))
		payload = serialize_event(event)
		assert payload.hands == []


class TestSerializeEventWithOneHand:
	def test_full_hand_data_round_trips(self):
		hand = make_hand(handedness=Handedness.RIGHT, confidence=0.954321)
		gesture_result = GestureResult(
			gesture=Gesture.OPEN_PALM,
			finger_state=FingerState(thumb=True, index=True, middle=True, ring=True, pinky=True),
			handedness=Handedness.RIGHT,
			confidence=0.95,
		)
		metric = HandMetrics(handedness=Handedness.RIGHT, confidence=0.95, speed=0.123456)

		event = make_event(
			detection=HandDetectionResult(hands=[hand]),
			hand_gestures=[gesture_result],
			hand_metrics=[metric],
		)
		payload = serialize_event(event)

		assert len(payload.hands) == 1
		out = payload.hands[0]
		assert out.handedness == 'RIGHT'
		assert out.gesture == 'OPEN_PALM'
		assert out.fingers == 5
		assert out.confidence == 0.954
		assert out.speed == 0.1235
		assert len(out.landmarks) == 21
		assert out.landmarks[0].x == 0.5

	def test_landmarks_are_rounded(self):
		hand = make_hand()
		hand.landmarks[0] = HandLandmark(x=0.123456789, y=0.987654321, z=0.000000001)
		event = make_event(
			detection=HandDetectionResult(hands=[hand]),
			hand_gestures=[GestureResult(Gesture.FIST, FingerState(), Handedness.RIGHT, 0.9)],
			hand_metrics=[HandMetrics(Handedness.RIGHT, 0.9, 0.0)],
		)
		payload = serialize_event(event)
		lm = payload.hands[0].landmarks[0]
		assert lm.x == 0.1235
		assert lm.y == 0.9877
		assert lm.z == -0.0


class TestSerializeEventWithTwoHands:
	def test_both_hands_present_in_order(self):
		left = make_hand(handedness=Handedness.LEFT, confidence=0.8)
		right = make_hand(handedness=Handedness.RIGHT, confidence=0.9)
		gr_left = GestureResult(Gesture.FIST, FingerState(), Handedness.LEFT, 0.8)
		gr_right = GestureResult(
			Gesture.OPEN_PALM,
			FingerState(thumb=True, index=True, middle=True, ring=True, pinky=True),
			Handedness.RIGHT,
			0.9,
		)
		m_left = HandMetrics(Handedness.LEFT, 0.8, 0.05)
		m_right = HandMetrics(Handedness.RIGHT, 0.9, 0.10)

		event = make_event(
			detection=HandDetectionResult(hands=[left, right]),
			hand_gestures=[gr_left, gr_right],
			hand_metrics=[m_left, m_right],
		)
		payload = serialize_event(event)

		assert len(payload.hands) == 2
		assert payload.hands[0].handedness == 'LEFT'
		assert payload.hands[0].gesture == 'FIST'
		assert payload.hands[1].handedness == 'RIGHT'
		assert payload.hands[1].gesture == 'OPEN_PALM'


class TestSerializeEventDefensiveFallbacks:
	"""
	detection.hands, engine_result.hand_gestures, and hand_metrics are built
	from the same detection pass and should always be the same length and
	order -- but serialize_event must not crash if they ever drift, e.g. one
	extra hand detected with no matching gesture/metric computed yet.
	"""

	def test_missing_gesture_result_falls_back_to_unknown(self):
		hand = make_hand()
		event = make_event(
			detection=HandDetectionResult(hands=[hand]),
			hand_gestures=[],  # shorter than detection.hands
			hand_metrics=[],
		)
		payload = serialize_event(event)

		assert len(payload.hands) == 1
		assert payload.hands[0].gesture == 'UNKNOWN'
		assert payload.hands[0].fingers == 0
		assert payload.hands[0].speed == 0.0

	def test_two_hands_one_missing_gesture(self):
		left = make_hand(handedness=Handedness.LEFT)
		right = make_hand(handedness=Handedness.RIGHT)
		gr_left = GestureResult(Gesture.FIST, FingerState(), Handedness.LEFT, 0.9)
		# only one gesture result for two hands
		event = make_event(
			detection=HandDetectionResult(hands=[left, right]),
			hand_gestures=[gr_left],
			hand_metrics=[HandMetrics(Handedness.LEFT, 0.9, 0.0)],
		)
		payload = serialize_event(event)

		assert payload.hands[0].gesture == 'FIST'
		assert payload.hands[1].gesture == 'UNKNOWN'
		assert payload.hands[1].speed == 0.0

	def test_confidence_still_comes_from_detected_hand_not_gesture_result(self):
		"""
		detected_hand.confidence (mediapipe handedness score) is independent
		of whether a gesture_result exists for it.
		"""
		hand = make_hand(confidence=0.777)
		event = make_event(
			detection=HandDetectionResult(hands=[hand]),
			hand_gestures=[],
			hand_metrics=[],
		)
		payload = serialize_event(event)
		assert payload.hands[0].confidence == 0.777


class TestGestureFramePayloadValidation:
	"""Field constraints on the pydantic models themselves."""

	def test_fingers_out_of_range_rejected(self):
		from app.cv.serialization import HandOut

		with pytest.raises(Exception):
			HandOut(
				handedness='RIGHT',
				gesture='OPEN_PALM',
				fingers=6,  # max is 5
				confidence=0.9,
				speed=0.0,
				landmarks=[{'x': 0.0, 'y': 0.0, 'z': 0.0}] * 21,
			)

	def test_landmarks_must_be_exactly_21(self):
		from app.cv.serialization import HandOut

		with pytest.raises(Exception):
			HandOut(
				handedness='RIGHT',
				gesture='OPEN_PALM',
				fingers=5,
				confidence=0.9,
				speed=0.0,
				landmarks=[{'x': 0.0, 'y': 0.0, 'z': 0.0}] * 20,  # one short
			)
