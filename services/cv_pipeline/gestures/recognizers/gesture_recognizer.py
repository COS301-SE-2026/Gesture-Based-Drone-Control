# /services/cv-pipeline/recognizers/gesture_recognizer.py
# interface class for strategy pattern, allow use of both ml and rule based

"""
    Abstract class for ml and rule-based
    Rule-based only implemented for now as ml is way too complicated at the moment
    gesture_engine.py uses this class (strategy pattern)
"""

from abc import ABC, abstractmethod

#hand-detection import
from mediapipe_detector import DetectedHand

class GestureRecognizer(ABC):
    """
        Interface for ml/rule-based
        Both recognisers must use interpret_gesture()
        gesture_engine.py uses this to stay decoupled from implementation
    """
    
    @abstractmethod
    def interpret_gesture(self, hand: DetectedHand) -> "GestureResult":
        """
            Takes single detected hand and returns GestureResult
            To be implemented in all subclasses
        """
