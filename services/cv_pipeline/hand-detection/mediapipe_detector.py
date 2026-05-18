# /services/cv-pipeline/hand-detection/mediapipe_detector.py

"""
Hand detection using MediaPipe and opencv
-> Takes captured frame from camera_feed.py
-> Returns hand detection result with landmarks, max 2 hands
-> Gesture interpretation done in recoginsers
"""

import logging
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional

import mediapipe as mp
import numpy as np

# camera_feed.py imports -> 1st in chain then this file
from camera_feed import CaptureFrame

logger = logging.getLogger(__name__)

# hands logic
_mp_hands = mp.solutions.hands
_mp_drawing = mp.solutions.drawing_utils

#consts
#points on one hand = 21
NUM_LANDMARKS = 21
MAX_HANDS = 2

#Enums 
class Handedness(Enum):
    LEFT = auto()
    RIGHT = auto()
    
#Data classes

@dataclass 
class HandLandmark:
    """
        A single landmark point from mp
        x, y normalised to [0.0, 1.0] relative to frame dimesions
        z represents depth relative to wrist 
        - val = closer to cam
        + val = further from cam
    """
    x: float
    y: float
    z: float
    
@dataclass
class DetectedHand:
    """
        One hand detected -> must xontain all 21 landmarks and L/R hand
        landmark vals:
        0 = wrist
        4 = thumb finger tip
        8 = index finger tip
        12 = middle finger tip
        16 = ring finger tip
        20 = pinky finger tip
        
        reference for landmark layout: https://mediapipe.readthedocs.io/en/latest/solutions/hands.html
    """
    handedness: Handedness
    #landmark always = 21
    landmarks: list[HandLandmark]
    #mediapipe confidence for telemetry 
    confidence: float
    
@dataclass
class HandDetectionResult:
    """
        Result returned with HandDetectionPipeline.detect_hands()
        hands = empty when no hands in camera view (never none)
    """
    hands: list[DetectedHand] = field(default_factory = list)
    frame_index: int = 0
    
    @property
    def has_hands(self) -> bool:
        return len(self.hands) > 0
    
    @property
    def has_hands(self) -> bool:
        return len(self.hands) > 0
    
    @property
    def hand_count(self) -> int:
        return len(self.hands)
    
#Configs
@dataclass 
class DetectorConfig:
    #confidence threshholds - lower = more detections but can also make more false positives
    min_detection_confidence: float = 0.7
    mon_tracking_confidence: float = 0.5
    #static_image_mode = F -> mediapipe tracks acrosss frames
    static_image_mode: bool = False
    
#hand detection pipeline
class HandDetectionPipeline:
    """
        Wrap mp hands
        Receives a captured frame from cam feed, runs the hand landmarks to detect
        and returns a result
        
        algorithm expected outcome:
        open() -> detect_hands() (loop) -> close()
    """
    
    def __init__(self, config: DetectorConfig = DetectorConfig()) -> None:
        self._config = config
        self._hands: Optional[mp.solutions.hands.Hands] = None

    #lifecycle algorithm
    def open(self) -> None:
        """
            Initiate mp hands model
        """
        self.hands = _mp_hands.Hands(
            static_image_mode = self._config.static_image_mode,
            max_num_hands = MAX_HANDS,
            min_detection_confidence = self._config.min_detection_confidence,
            min_tracking_confidence = self._config.min_tracking_confidence,
        )
        
        logger.info(
            "HandDetectionPipeline ready — max_hands=%d, "
            "detection_conf=%.2f, tracking_conf=%.2f",
            MAX_HANDS,
            self._config.min_detection_confidence,
            self._config.min_tracking_confidence,
        )
        
    def close(self) -> None:
        """
            Release mp resources, it kinda feel like c++ yk free up memory, get it ;O
            I'll see myself out
        """
        if self._hands:
            self._hands.close()
            self._hands = None
            logger.info("HandDetectionPipeline closed")
            
    #context managaer
    def __enter__(self) -> "HandDetectionPipeline":
        self.open()
        return self

    def __exit__(self, *_) -> None:
        self.close()
    
#detection

def detect_hands(self, frame: CapturedFrame) -> HanddetectionResult:
    """
        Run mp hand detection on a captured frame
        Retrun = hand detection result (once again never none)
        no hands found = result is empty list
    """
    if self._hands is None:
        logger.error("detect_hands() called before open()")
        return HandsDetectionResult(frame_index = frame.frame.frame_index)
    
    #mp expects rgb (done in camera_feed.py)
    mp_result = self._hands.process(frame.rgb_frame)
    
    if not mp_result.multi_hand_landmarks:
        # no hands found = empty result
        logger.debug("No hands found in frame %d", frame.frame_index)
        return HandDetectionResult(frame_index = frame.frame_index)
    
    detected = []
    for hand_landmarks, handedness_info in zip(
        mp_result.mult_hand_landmarks,
        mp_result.multi_handedness,
    ):
        
        detected.append(self._extract_landmarks(hand_landmarks, handedness_info))
        
    logger.debug(
        "Frame %d - detected %d hand(s)", frame.frame_index, len(detected)
    )
    
    return HandDetectionResult(hands=detected, frame_index = frame.frame_index)

    def _extract_landmarks(
        self,
        hand_landmarks,
        handedness_info,
    ) -> DetectedHand:
        """
            Convert a mp hand result into DetectedHand dataclass
            extracts all 21 landmarks as HandLandmark objects
        """
        
        landmarks = [
            HandLandmark(x = lm.x, y = lm.y, z = lm.z)
            for lm in hand_landmarks.landmark
        ]
        
        # mp labels from own perspective (mirrored so flip)
        # left swaps right to match user shown hand
        raw_label = handedness_info.classification[0].label
        confidence = handedness_info.classification[0].score
        
        if raw_label == "Left":
            handedness = Handedness.RIGHT
        else:
            handedness = Handedness.LEFT

        return DetectedHand(
            handedness = handedness,
            landmarks = landmarks,
            confidence = confidence
        )
        

        
            




