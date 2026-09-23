import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from services.commands.command import CommandType
from services.input.sources.gesture_adapter import GestureAdapter
from services.input.sources.input_adapter import InputAdapter
from services.input.sources.motion_adapter import MotionAdapter

def motion(x=0.0, y=0.0, depth=0.0):
    """Stand in for serialization.MotionOUt, the shape the dapter reads"""
    return SimpleNamespace(x=x, y=y, depth=depth)

def hand(side, gesture, confidence=0.95, hand_motion=None):
    return SimpleNamespace(
        handedness=side, gesture=gesture, confidence=confidence, motion=hand_motion
    )

def frame(*hands):
    return SimpleNamespace(hands=list(hands))

def make_adapter(event_log=None):
    adapter = MotionAdapter(min_stable_frames=2, event_log=event_log or MagicMock())
    adapter.set_handler(MagicMock())
    return adapter

def emitted(adapter):
    return [call[0][0].type for call in adapter._handler.call_args_list]

def analog(adapter):
    return [
        call[0][0].payload['input']
        for call in adapter._handler.call_args_list
        if call[0][0].type is CommandType.ANALOG
    ]
    
def run(adapter, payload, frames=4):
    """
    Feed the same frame repeatedly
    """
    for _ in range(frames):
        adapter._process_payload(payload)
        
@pytest.fixture()
def adapter():
    return make_adapter()

@pytest.mark.parametrize(
    ('gesture', 'expected'),
    [
        ('SWIPE_LEFT', CommandType.MOVE_LEFT),
        ('SWIPE_RIGHT', CommandType.MOVE_RIGHT),
        ('SWIPE_UP', CommandType.MOVE_UP),
        ('SWIPE_DOWN', CommandType.MOVE_DOWN)
        ('PUSH', CommandType.MOVE_FORWARD),
        ('PULL', CommandType.MOVE_BACKWARD),
        ('CIRCLE_CW', CommandType.ROTATE_CW),
        ('CIRCLE_CCW', CommandType.ROTATE_CCW),
    ],
)
def test_single_hands_motions_resolve(adapter, gesture, expected):
    assert adapter._resolve({'RIGHT': gesture}) is expected
    assert adapter._resolve({'LEFT': gesture}) is expected
    
@pytest.mark.parametrize(
    ('gesture', 'expected'),
    [
        ('SWIPE_UP', CommandType.TAKEOFF),
        ('SWIPE_DOWN', CommandType.LAND),
        ('PULL', CommandType.EMERGENCY_STOP),
    ],
)
def test_both_hands_together_resolve(adapter, gesture, expected):
    assert adapter._resolve({'RIGHT': gesture, 'LEFT': gesture}) is expected
    
def test_the_two_adapters_do_not_understand_each_other(adapter):
    """
    MotionAdapter swaps the maps wholesale rather than adding to them
    """
    pose = GestureAdapter(min_stable_frames=2)
    
    assert adapter._resolve({'RIGHT': 'OPEN_PALM'}) is None
    assert adapter._resolve({'RIGHT': 'FIST', 'LEFT': 'FIST'}) is None
    assert pose._resolve({'RIGHT': 'SWIPE_LEFT'}) is None
    assert pose._resolve({'RIGHT': 'OPEN_PALM'}) is CommandType.HOVER
    assert pose._resolve({'RIGHT': 'FIST', 'LEFT': 'FIST'}) is CommandType.LAND
    
def test_idle_hand_does_not_mask_the_other_hand(adapter):
    run(adapter, frame(hand('RIGHT', 'UNKNOWN'), hand('LEFT', 'SWIPE_RIGHT')))
    
    assert CommandType.MOVE_RIGHT in emitted(adapter)