# unit testing for mediapipe_detector.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_mediapipe_detector.py -v
 
import os
import sys
from unittest.mock import MagicMock, patch
 
import numpy as np
import pytest
 
# find hand-detection and camera folders
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "cv_pipeline", "hand-detection"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "cv_pipeline", "camera"))
 
from mediapipe_detector import (
    DetectedHand,
    DetectorConfig,
    HandDetectionPipeline,
    HandDetectionResult,
    HandLandmark,
    Handedness,
    MAX_HANDS,
    NUM_LANDMARKS,
)
 
#helpers 
def make_blank_frame():
    """Returns a mock CapturedFrame with blank rgb and bgr arrays."""
    from camera_feed import CapturedFrame
    return CapturedFrame(
        bgr_frame=np.zeros((480, 640, 3), dtype=np.uint8),
        rgb_frame=np.zeros((480, 640, 3), dtype=np.uint8),
        frame_index=1,
    )
 
 
def make_mock_landmark(x=0.5, y=0.5, z=0.0):
    """Returns a mock mediapipe landmark."""
    lm = MagicMock()
    lm.x = x
    lm.y = y
    lm.z = z
    return lm
 
 
def make_mock_hand_landmarks(num=NUM_LANDMARKS):
    """Returns a mock mediapipe hand_landmarks object with 21 landmarks."""
    mock = MagicMock()
    mock.landmark = [make_mock_landmark(x=i * 0.01, y=i * 0.01, z=0.0) for i in range(num)]
    return mock
 
 
def make_mock_handedness(label="Right", score=0.95):
    """Returns a mock mediapipe handedness classification object."""
    classification = MagicMock()
    classification.label = label
    classification.score = score
    mock = MagicMock()
    mock.classification = [classification]
    return mock
 
 
def make_open_pipeline(config=None):
    """Returns a HandDetectionPipeline with mediapipe mocked open."""
    with patch("mediapipe_detector.mp.solutions.hands.Hands") as mock_hands_cls:
        mock_hands = MagicMock()
        mock_hands_cls.return_value = mock_hands
        pipeline = HandDetectionPipeline(config or DetectorConfig())
        pipeline.open()
        return pipeline, mock_hands
 
#const
class TestConstants:
    def test_num_landmarks(self):
        assert NUM_LANDMARKS == 21
 
    def test_max_hands(self):
        assert MAX_HANDS == 2
 
 
#detector config
class TestDetectorConfig:
    def test_defaults(self):
        config = DetectorConfig()
        assert config.min_detection_confidence == 0.7
        assert config.min_tracking_confidence  == 0.5
        assert config.static_image_mode is False
 
    def test_custom_values(self):
        config = DetectorConfig(
            min_detection_confidence=0.9,
            min_tracking_confidence=0.8,
            static_image_mode=True,
        )
        assert config.min_detection_confidence == 0.9
        assert config.min_tracking_confidence  == 0.8
        assert config.static_image_mode is True
 
 
#landmarks
class TestHandLandmark:
    def test_fields_stored_correctly(self):
        lm = HandLandmark(x=0.1, y=0.2, z=-0.05)
        assert lm.x == 0.1
        assert lm.y == 0.2
        assert lm.z == -0.05
        
#hand detection 
class TestDetectedHand:
    def test_fields_stored_correctly(self):
        landmarks = [HandLandmark(x=0.0, y=0.0, z=0.0)] * NUM_LANDMARKS
        hand = DetectedHand(
            handedness=Handedness.LEFT,
            landmarks=landmarks,
            confidence=0.95,
        )
        assert hand.handedness == Handedness.LEFT
        assert len(hand.landmarks) == NUM_LANDMARKS
        assert hand.confidence == 0.95
 
 
#detection result
class TestHandDetectionResult:
    def test_empty_by_default(self):
        result = HandDetectionResult()
        assert result.has_hands is False
        assert result.hand_count == 0
        assert result.hands == []
 
    def test_has_hands_true_when_hands_present(self):
        landmarks = [HandLandmark(x=0.0, y=0.0, z=0.0)] * NUM_LANDMARKS
        hand = DetectedHand(handedness=Handedness.RIGHT, landmarks=landmarks, confidence=0.9)
        result = HandDetectionResult(hands=[hand], frame_index=1)
        assert result.has_hands is True
        assert result.hand_count == 1
 
    def test_hand_count_two_hands(self):
        landmarks = [HandLandmark(x=0.0, y=0.0, z=0.0)] * NUM_LANDMARKS
        hand = DetectedHand(handedness=Handedness.RIGHT, landmarks=landmarks, confidence=0.9)
        result = HandDetectionResult(hands=[hand, hand], frame_index=2)
        assert result.hand_count == 2
 
    def test_frame_index_stored(self):
        result = HandDetectionResult(frame_index=42)
        assert result.frame_index == 42
 
 
# pipeline open()
class TestHandDetectionPipelineOpen:
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_open_initialises_mediapipe(self, mock_hands_cls):
        mock_hands = MagicMock()
        mock_hands_cls.return_value = mock_hands
 
        pipeline = HandDetectionPipeline()
        pipeline.open()
 
        mock_hands_cls.assert_called_once_with(
            static_image_mode=False,
            max_num_hands=MAX_HANDS,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_open_with_custom_config(self, mock_hands_cls):
        mock_hands_cls.return_value = MagicMock()
        config = DetectorConfig(min_detection_confidence=0.9, min_tracking_confidence=0.8)
        pipeline = HandDetectionPipeline(config)
        pipeline.open()
 
        mock_hands_cls.assert_called_once_with(
            static_image_mode=False,
            max_num_hands=MAX_HANDS,
            min_detection_confidence=0.9,
            min_tracking_confidence=0.8,
        )
 
 
#pipeline close
class TestHandDetectionPipelineClose:
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_close_releases_mediapipe(self, mock_hands_cls):
        mock_hands = MagicMock()
        mock_hands_cls.return_value = mock_hands
 
        pipeline = HandDetectionPipeline()
        pipeline.open()
        pipeline.close()
 
        mock_hands.close.assert_called_once()
        assert pipeline._hands is None
 
    def test_close_before_open_does_not_crash(self):
        pipeline = HandDetectionPipeline()
        pipeline.close()  # should be a no-op
 
 
#hand context manager
class TestHandDetectionPipelineContextManager:
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_context_manager_opens_and_closes(self, mock_hands_cls):
        mock_hands = MagicMock()
        mock_hands_cls.return_value = mock_hands
 
        with HandDetectionPipeline() as pipeline:
            assert pipeline._hands is not None
 
        mock_hands.close.assert_called_once()
 
 
#detect hands()
class TestDetectHands:
    def test_returns_empty_result_before_open(self):
        pipeline = HandDetectionPipeline()
        frame = make_blank_frame()
        result = pipeline.detect_hands(frame)
 
        assert isinstance(result, HandDetectionResult)
        assert result.has_hands is False
        assert result.frame_index == frame.frame_index
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_returns_empty_result_when_no_hands(self, mock_hands_cls):
        mock_hands = MagicMock()
        mock_hands.process.return_value = MagicMock(multi_hand_landmarks=None)
        mock_hands_cls.return_value = mock_hands
 
        pipeline = HandDetectionPipeline()
        pipeline.open()
        result = pipeline.detect_hands(make_blank_frame())
 
        assert result.has_hands is False
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_returns_result_with_one_hand(self, mock_hands_cls):
        hand_lms = make_mock_hand_landmarks()
        handedness = make_mock_handedness(label="Right", score=0.95)
 
        mp_result = MagicMock()
        mp_result.multi_hand_landmarks = [hand_lms]
        mp_result.multi_handedness     = [handedness]
 
        mock_hands = MagicMock()
        mock_hands.process.return_value = mp_result
        mock_hands_cls.return_value = mock_hands
 
        pipeline = HandDetectionPipeline()
        pipeline.open()
        result = pipeline.detect_hands(make_blank_frame())
 
        assert result.has_hands is True
        assert result.hand_count == 1
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_returns_result_with_two_hands(self, mock_hands_cls):
        hand_lms  = make_mock_hand_landmarks()
        handedness = make_mock_handedness()
 
        mp_result = MagicMock()
        mp_result.multi_hand_landmarks = [hand_lms, hand_lms]
        mp_result.multi_handedness     = [handedness, handedness]
 
        mock_hands = MagicMock()
        mock_hands.process.return_value = mp_result
        mock_hands_cls.return_value = mock_hands
 
        pipeline = HandDetectionPipeline()
        pipeline.open()
        result = pipeline.detect_hands(make_blank_frame())
 
        assert result.hand_count == 2
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_frame_index_passed_through(self, mock_hands_cls):
        mock_hands = MagicMock()
        mock_hands.process.return_value = MagicMock(multi_hand_landmarks=None)
        mock_hands_cls.return_value = mock_hands
 
        frame = make_blank_frame()
        frame.frame_index = 99
 
        pipeline = HandDetectionPipeline()
        pipeline.open()
        result = pipeline.detect_hands(frame)
 
        assert result.frame_index == 99
 
 
# extract landmarks
class TestExtractLandmarks:
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_extracts_21_landmarks(self, mock_hands_cls):
        mock_hands_cls.return_value = MagicMock()
        pipeline = HandDetectionPipeline()
        pipeline.open()
 
        hand = pipeline._extract_landmarks(
            make_mock_hand_landmarks(),
            make_mock_handedness(),
        )
        assert len(hand.landmarks) == NUM_LANDMARKS
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_landmark_values_correct(self, mock_hands_cls):
        mock_hands_cls.return_value = MagicMock()
        pipeline = HandDetectionPipeline()
        pipeline.open()
 
        lms = make_mock_hand_landmarks()
        hand = pipeline._extract_landmarks(lms, make_mock_handedness())
 
        assert hand.landmarks[0].x == pytest.approx(0.0)
        assert hand.landmarks[1].x == pytest.approx(0.01)
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_handedness_flipped_left_to_right(self, mock_hands_cls):
        # mp "Left" should map to Handedness.RIGHT (mirrored)
        mock_hands_cls.return_value = MagicMock()
        pipeline = HandDetectionPipeline()
        pipeline.open()
 
        hand = pipeline._extract_landmarks(
            make_mock_hand_landmarks(),
            make_mock_handedness(label="Left"),
        )
        assert hand.handedness == Handedness.RIGHT
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_handedness_flipped_right_to_left(self, mock_hands_cls):
        # mp "Right" should map to Handedness.LEFT (mirrored)
        mock_hands_cls.return_value = MagicMock()
        pipeline = HandDetectionPipeline()
        pipeline.open()
 
        hand = pipeline._extract_landmarks(
            make_mock_hand_landmarks(),
            make_mock_handedness(label="Right"),
        )
        assert hand.handedness == Handedness.LEFT
 
    @patch("mediapipe_detector.mp.solutions.hands.Hands")
    def test_confidence_stored_correctly(self, mock_hands_cls):
        mock_hands_cls.return_value = MagicMock()
        pipeline = HandDetectionPipeline()
        pipeline.open()
 
        hand = pipeline._extract_landmarks(
            make_mock_hand_landmarks(),
            make_mock_handedness(score=0.88),
        )
        assert hand.confidence == pytest.approx(0.88)
 