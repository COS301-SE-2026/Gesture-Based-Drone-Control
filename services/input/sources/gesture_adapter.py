# /services/input/sources/gesture_adapter.py

"""
Concrete InputAdapter that gets info from the shared CV pipeline
and translates gestures into drone Commands

This will not parse JSON like most of the other input adapters,
because the CV pipeline runs entirely on backend.
Making this interpret the broadcasted gesture data used by the frontend would mean
backend->frontend->back->front; which is not good.

Will rely on GestureStream.subscribe() and interpret the shared queue
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

IDLE_TIMEOUT_S: float = 3.0
MIN_CONFIDENCE: float = 0.85
MIN_STABLE_FRAMES: int = 2

# Define maps for each type of mapping; two-hand, asymmetrical, and single hand

# does not matter which hand is doing what
# use a frozen set (just an immutable set) because mutable sets cannot be hashed
TWO_HAND_MAP: dict[frozenset, CommandType] = {
	frozenset({'OPEN_PALM', 'OPEN_PALM'}): CommandType.EMERGENCY_STOP,
	frozenset({'THREE_FINGERS', 'THREE_FINGERS'}): CommandType.TAKEOFF,
	frozenset({'FIST', 'FIST'}): CommandType.LAND,
	frozenset({'ONE_FINGER', 'ONE_FINGER'}): CommandType.MOVE_FORWARD,
	frozenset({'TWO_FINGERS', 'TWO_FINGERS'}): CommandType.MOVE_BACKWARD,
}

# asymmetric, so [right, left] ordered
# use an immutable tuple since order matters here
ASYMMETRICAL_TWO_HAND_MAP: dict[tuple[str, str], CommandType] = {
	('ONE_FINGER', 'OPEN_PALM'): CommandType.ROTATE_CW,
	('OPEN_PALM', 'ONE_FINGER'): CommandType.ROTATE_CCW,
	('OPEN_PALM', 'TWO_FINGERS'): CommandType.MOVE_LEFT,
	('TWO_FINGERS', 'OPEN_PALM'): CommandType.MOVE_RIGHT,
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
		self._stable_key: str | None = None
		self._last_gesture_ts: float = time.monotonic()
		self._stable_count: int = 0
		self._last_command: CommandType | None = None

		# used by status endpoint
		self.last_resolution: str = 'none'
		self.last_confidence: float = 0.0

	async def start(self) -> None:
		"""
		connect to the stream and subscribe to it. initialise all vars
		"""
		stream = self._get_stream()
		self._last_gesture_ts = time.monotonic()
		self._queue = await stream.subscribe()
		# continuously deq and process... 226 returns
		self._task = asyncio.create_task(self._consume(), name='gesture-adapter-consumer')

		logger.info('GestureAdapter: started')

	async def stop(self) -> None:
		"""
		Unsub from stream and clean up
		"""
		logger.debug('GestureAdapter: stop() called')
		if self._task is not None:
			try:
				self._task.cancel()
				await self._task
			except asyncio.CancelledError:
				pass
			finally:
				self._task = None

		if self._queue is not None:
			stream = self._get_stream()
			await stream.unsubscribe(self._queue)

		logger.info('GestureAdapter: stopped()')

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
		if self._queue is None:
			return

		try:
			while True:
				payload = await self._queue.get()
				# actually handle the data
				self._process_payload(payload)
				self._check_idle()
		except asyncio.CancelledError:  # shouldnt realistically hit this one
			logger.debug('GestureAdapter: consumer cancelled')
			raise
		except Exception as ex:
			logger.exception(f'GestureAdapter: error in consumer: {ex}')
			raise

	def _process_payload(self, payload: Any) -> None:
		"""
		Process the hands as given in the stream. the schema:
		model_config = {
		'json_schema_extra': {
		'examples': [
		{
		'type': 'gesture_frame',
		'frame_index': 142,
		'timestamp': 1719831600.123,
		'fps': 28.7,
		'hands': [
		{
		'handedness': 'RIGHT',
		'gesture': 'OPEN_PALM',
		'fingers': 5,
		'confidence': 0.95,
		'speed': 0.12,
		'landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}],
		}
		],
		}
		]
		}
		}
		"""
		hands = getattr(payload, 'hands', [])

		# filter out ambiguity. assume CV pipeline works well enough to classify
		confident = [h for h in hands if h.confidence >= self._min_confidence]

		if not confident:
			self._reset_stability()
			return

		# build snapshot for this frame of handedness. format better
		by_side: dict[str, str] = {h.handedness.upper(): h.gesture for h in confident}
		# log lowest confidence frame used
		self.last_confidence = round(min(h.confidence for h in confident), 3)

		cmd_type = self._resolve(by_side)
		if cmd_type is None:
			self._reset_stability()
			return

		# need consecutive stable frames to emit
		key = cmd_type.name
		if key == self._stable_key:
			self._stable_count += 1
		else:
			self._stable_key = key
			self._stable_count = 1
			return

		# gatekeep
		if self._stable_count < self._min_stable_frames:
			return

		# update for logging purposes (can also use for more gatekeeping...maybe)
		self._last_command = cmd_type
		self._last_gesture_ts = time.monotonic()
		self.last_resolution = key

		# holy shit i forgot this line
		self._emit(Command(type=cmd_type, source='gesture'))

		logger.info(
			'GestureAdapter: executing: %s -> %s',
			by_side,
			cmd_type.name,
		)

	def _resolve(self, by_side: dict[str, str]) -> CommandType | None:
		"""
		Helper to resolve a {hand:gesture} snapshot into a commandType

		priorities asymmetric two hand, then symmetric two hand, and finally single hand
		"""
		right = by_side.get('RIGHT')
		left = by_side.get('LEFT')

		# case 1: both hands present
		if right and left:
			# case 1.1: defined in asymmetrical map?
			asym = ASYMMETRICAL_TWO_HAND_MAP.get((right, left))
			if asym is not None:
				return asym
			# case  1.2: defined in symmetrical map?
			sym = TWO_HAND_MAP.get(frozenset({right, left}))
			if sym is not None:
				return sym

		# case 2: one or the other
		single = right or left
		if single:
			return SINGLE_HAND_MAP.get(single)

		# case oopsy
		return None

	def _check_idle(self) -> None:
		"""
		if we are idle, hover safely in place
		"""
		elapsed = time.monotonic() - self._last_gesture_ts
		if elapsed >= self._idle_timeout and self.last_resolution != 'idle-hover':
			logger.info('GestureAdapter: idle %.1fs, HOVERing', elapsed)
			self._last_command = CommandType.HOVER
			self.last_resolution = 'idle-hover'
			self._emit(Command(type=CommandType.HOVER, source='gesture-idling'))

	def _reset_stability(self) -> None:
		self._stable_key = None
		self._stable_count = 0

	@staticmethod
	def _get_stream():
		"""
		lazy import to not get anything outdated
		"""
		from app.api.gestures import stream

		return stream
