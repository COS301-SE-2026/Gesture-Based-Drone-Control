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
    





