import math
import os
import sys
from unittest.mock import MagicMock

import pytest

sys.modules['mediapipe'] = MagicMock()
_services_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, _services_dir)

from cv_pipeline.gestures.recognizers.gesture_recognizer import Gesture #noqa: E402
from cv_pipeline.gestures.recognizers.motion_based import ( # noqa: E402
    LATCH_SECONDS,
    REFACTORY_SECONDS,
    STALE_SECONDS,
    MotionBasedRecognizer,
)
from cv_pipeline.hand_detection.mediapipe_detector import ( # noqa:E402
    DetectedHand,
    Handedness,
    HandLandmark,
)

FRAME_DT = 1.0 / 30.0
PALM = 0.12
SWIPES = {Gesture.SWIPE_LEFT, Gesture.SWIPE_RIGHT, Gesture.SWIPE_UP, Gesture.SWIPE_DOWN}

class FakeClock:
    """Injected time_source so no test ever sleeps"""
    
    def __init__(self) -> None:
        self.now = 0.0
        
    def __call__(self) -> float:
        return self.now
    
    def tick(self, seconds, float = FRAME_DT) -> None:
        self.now += seconds

def make_hand(cx=0.5, cy=0.5, palm=PALM, handedness=Handedness.RIGHT, confidence=0.95):
    """
    Synthetic hand centred on (cx, cy) with a given palm span
    
    Only the palm landmarks and the wrist -> middle MPC span matter here
    Push/Pull reads from palm
    """
    lm = [HandLandmark(cx, cy, 0.0) for _ in range(21)]
    lm[0] = HandLandmark(cx, cy + palm / 2, 0.0)
    lm[9] = HandLandmark(cx, cy - palm / 2, 0.0)
    lm[5] = HandLandmark(cx - 0.02, cy - palm / 2, 0.0)
    lm[13] = HandLandmark(cx + 0.02, cy - palm / 2, 0.0)
    lm[17] = HandLandmark(cx + 0.03, cy - palm / 4, 0.0)
    return DetectedHand(handedness=handedness, landmarks=lm, confidence=confidence)

def feed(rec, clock, points, palm=PALM, handedness=Handedness.RIGHT, dt=FRAME_DT):
    results = []
    for cx, cy in points:
        clock.tick(dt)
        results.append(rec.intepret_gesture(make_hand(cx, cy, palm, handedness)))
    return results

def gestures(results):
    return [r.gesture for r in results]

def line(x, y, dx, dy, frames=11):
    return [(x + dx * i, y + dy * i) for i in range(frames)]

def circle(frames=16, radius=0.06, clockwise=True):
    pts = []
    for i in range(frames):
        a = 2 * math.pi * i / (frames - 1)
        pts.append(
            (
                0.5 + radius * math.cos(-a if not clockwise else a),
                0.5 + radius * math.sin(-a if not clockwise else a),
            )
        )
    return pts

@pytest.fixture()
def clock():
    return FakeClock()

@pytest.fixture()
def rec(clock):
    return MotionBasedRecognizer(time_source=clock)

@pytest.mark.parametrize(
    ('path', 'expected'),
    [
        (line(0.30, 0.5, 0.045, 0.0), Gesture.SWIPE_RIGHT),
        (line(0.75, -0.045, 0.0), Gesture.SWIPE_LEFT),
        (line(0.5, 0.25, 0.0, 0.045), Gesture.SWIPE_DOWN),
        (line(0.5, 0.75, 0.0, -0.045), Gesture.SWIPE_UP),
    ],
)
def test_swipes(rec, clock, path, expected):
    assert expected in gestures(feed(rec, clock, path))
    
def test_gesture_is_latched_across_frames(rec, clock):
    """
    A raw snipe classifies for a frame or 2, gesture adapter needs min stable frames 
    agreeing frames befoire it emits
    """
    held = [
        g
        for g in gestures(feed(rec, clock, line(0.30, 0.5, 0.045, 0.0)))
        if g is Gesture.SWIPE_RIGHT
    ]
    
    assert len(held) >= 2