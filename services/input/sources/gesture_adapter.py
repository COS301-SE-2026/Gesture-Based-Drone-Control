# /services/input/sources/gesture_adapter.py

"""
Concrete InputAdapter that gets info from the shared CV pipeline 
and translates gestures into drone Commands

This will not parse JSON like most of the other input adapters,
because the CV pipeline runs entirely on backend.
Making this interpret the broadcasted gesture data used by the frontend would mean
backend->frontend->back->front; which is not good.

Will rely on GestureStream.subscribe()  and interpret the shared queue
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from services.commands.command import CommandType, Command
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

# tunable parameters

IDLE_TIMEOUT_S: float = 3.0
MIN_CONFIDENCE: float = 0.85
MIN_STABLE_FRAMES: int = 2

# Define maps for each type of mapping; two-hand, asymmetrical, and single hand

# does not matter which hand is doing what
# use a frozen set (just an immutable set) because mutable sets cannot be hashed
TWO_HAND_MAP: dict[frozenset, CommandType] = {
    frozenset({'OPEN_PALM', 'OPEN_PALM'}): CommandType.EMERGENCY_STOP,
    frozenset({'OPEN_PALM', 'FIST'}): CommandType.TAKEOFF,
    frozenset({'FIST', 'FIST'}): CommandType.LAND,
    frozenset({'FIST', 'ONE_FINGER'}): CommandType.MOVE_FORWARD,
    frozenset({'FIST', 'TWO_FINGERS'}): CommandType.MOVE_BACKWARD,
}

# asymmetric, so [right, left] ordered
# use an immutable tuple since order matters here
ASYMMETRICAL_TWO_HAND_MAP: dict[tuple[str, str], CommandType] = {
    ('ONE_FINGER', 'FIST'): CommandType.ROTATE_CW,
    ('FIST', 'ONE_FINGER'): CommandType.ROTATE_CCW,
    ('FIST', 'TWO_FINGERS'): CommandType.MOVE_RIGHT,
    ('TWO_FINGERS', 'FIST'): CommandType.MOVE_LEFT,
}

# single handed commands. work with either one
# just a single string to commmandttype mapping
SINGLE_HAND_MAP: dict[str, CommandType] = {
    'OPEN_PALM': CommandType.HOVER,
    'ONE_FINGER': CommandType.MOVE_UP,
    'TWO_FINGERS': CommandType.MOVE_DOWN,
}


class GestureAdapter(InputAdapter):
    """
    Subscribe to the shared GestureStream emit Commands from this.

    Same lifecycle as the other input adapters, but start() and stop()
    handle interfacing with the stream.

    Starting customisation here, user can configure parameters (or
    possibly the system adjusts dynamically):
    - idle_timeout_s
    - min_confidence
    - min_stable_frames
    """

    def __init__(
        self,
        idle_timeout_s: float = IDLE_TIMEOUT_S,
        min_confidence: float = MIN_CONFIDENCE,
        min_stable_frames: float = MIN_STABLE_FRAMES,
    ) -> None:
        super().__init__()
        self._idle_timeout = idle_timeout_s
        self._min_confidence = min_confidence
        self._min_stable_frames = min_stable_frames

        # for the GestureStream queue
        self._task: asyncio.Task | None = None
        self._queue: asyncio.Queue | None = None
        
        # safety and extra info
        self._last_gesture_ts: float = time.monotonic()

    async def start(self) -> None:
        """
        connect to the stream and subscribe to it. initialise all vars
        """
        stream = self._get_stream()
        self._last_gesture_ts = time.monotonic()
        self._queue = await stream.subscribe()
        # continuously deq and process... 226 returns
        self._task = asyncio.create_task(self._consume(), name="gesture-adapter-consumer")
        
        logger.info("GestureAdapter: started")    
        
    async def stop(self) -> None:
        """
        Unsub from stream and clean up
        """
    
    async def handle_message(self, message: dict[str, Any]) -> None:
        """
        not actually used yet... all data comes from the queue
        also not sure if i should just make this the consume function
        """
        pass
    
    async def _consume(self) -> None:
        """
        Keep trying to deq and process the head of the queue
        """
        if self._queue is None: return
        
        try:
            while True:
                payload = await self._queue.get()
                # actually handle the data
                self._process_payload(payload)
                self._check_idle()
        except asyncio.CancelledError:  # shouldnt realistically hit this one
            logger.debug("GestureAdapter: consumer cancelled")
            raise
        except  Exception as ex:
            logger.exception(f"GestureAdapter: error in consumer: {ex}")
            raise
    
    def  _process_payload(self, payload: Any) -> None:
        """TODO actually figure out that goblin code in stream"""
        ...
    
    def _check_idle(self) -> None:
        """
        if we are idle, hover safely in place
        """
        elapsed = time.monotonic() - self._last_gesture_ts
        if elapsed >= self._idle_timeout:
            self._emit(Command(type=CommandType.HOVER, source="gesture-idling"))
            
    @staticmethod
    def _get_stream():
        """
        lazy import to not get anything outdated
        """
        from app.api.gestures import stream
        return stream
