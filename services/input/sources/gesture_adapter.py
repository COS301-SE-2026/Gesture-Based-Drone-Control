# /services/input/sources/gesture_adapter.py

"""
Concrete InputAdapter that gets info from the shared CV pipeline and translates gestures into drone Commands

This will not parse JSON like most of the other input adapters, because the CV pipeline runs entirely on backend.
Making this interpret the broadcasted gesture data used by the frontend would mean  backend->frontend->back->front
which is not good.

Will rely on GestureStream.subscribe()  and interpret the shared queue
"""


from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from services.commands.command import Command, CommandType
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

# tunable parameters

IDLE_TIMEOUT_S: float =  3.0
MIN_CONFIDENCE: float = 0.85
MIN_STABLE_FRAMES: int = 2

# Define maps for each type of mapping; two-hand, asymmetrical, and single hand

# does not matter which hand is doing what
# use a frozen set (just an immutable set) because mutable sets cannot be hashed
TWO_HAND_MAP: dict[frozenset, CommandType] = {
    frozenset({"OPEN_PALM",  "OPEN_PALM"}) : CommandType.EMERGENCY_STOP,
    frozenset({"OPEN_PALM",  "FIST"}) : CommandType.TAKEOFF,
    frozenset({"FIST",  "FIST"}) : CommandType.LAND,
    frozenset({"FIST",  "ONE_FINGER"}) : CommandType.MOVE_FORWARD,
    frozenset({"FIST",  "TWO_FINGERS"}) : CommandType.MOVE_BACKWARD,
}

# asymmetric, so [right, left] ordered
# use an immutable tuple since order matters here
ASYMMETRICAL_TWO_HAND_MAP: dict[tuple[str,  str], CommandType] = {
    ("ONE_FINGER",  "FIST") : CommandType.ROTATE_CW,
    ("FIST",  "ONE_FINGER") : CommandType.ROTATE_CCW,
    ("FIST",  "TWO_FINGERS") : CommandType.MOVE_RIGHT,
    ("TWO_FINGERS",  "FIST") : CommandType.MOVE_LEFT,
}

# single handed commands. work with either one
# just a single string to commmandttype mapping
SINGLE_HAND_MAP: dict[str, CommandType] = {
    'OPEN_PALM': CommandType.HOVER,
    'ONE_FINGER' : CommandType.MOVE_UP,
    'TWO_FINGERS': CommandType.MOVE_DOWN,
}