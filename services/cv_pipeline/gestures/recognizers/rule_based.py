# /services/cv-pipeline/recognizers/rule_based.py
"""
    Rule-based gesture recognition using mediapipe landmark positions
    How it works:
    -> Receives a DetectedHand from mediapipe_detector.py
    -> Uses landmark x/y positions to determine finger states
    -> returns GestureResult
"""
