"""
Concrete Input Adapter for motion recognizer

Reads hand motion but same shared cv pipeline, same subscription to the stream
, same stabilitly gating and command history, so all of that is inherited rather
than copied

gesture vocab is different, swapped in as class attributes

UNKNOWN is dropped before resolving, because an idle hand under motion recognizer
reports UNKNOWN on every single

the continuous joystick path, which the pose recognizers have no equivalent for

Pose adapter untouched, so rule and ml keep working exaclty as before
and the user picks between them at connect time
"""

from __future__ import annotations

import logging
import time
from typing import Any

from services.commands.command import AnalogInput, Command, CommandType
from services.input.sources.gesture_adapter import GestureAdapter

logger = logging.getLogger(__name__)

# both hands doing the same thing at the same time
# frozensets collapse duplicates, same as the pose maps, and the lookup in
# _resolve collapses the same way so this still matchrs
MOTION_TWO_HAND_MAP: dict[frozenset, CommandType] = {
	frozenset({'SWIPE_UP', 'SWIPE_UP'}): CommandType.TAKEOFF,  # NOSONAR
	frozenset({'SWIPE_DOWN', 'SWIPE_DOWN'}): CommandType.LAND,  # NOSONAR
	frozenset({'PULL', 'PULL'}): CommandType.EMERGENCY_STOP,  # NOSONAR
}

# nothing asymmetric yet, but _resolve still checks this map first so it has
# to exist, left empty rather than removed so the resolution order is intact
MOTION_ASYMMETRICAL_TWO_HAND_MAP: dict[tuple[str, str], CommandType] = {}

# single handed, works with either hand
MOTION_SINGLE_HAND_MAP: dict[str, CommandType] = {
	'SWIPE_LEFT': CommandType.MOVE_LEFT,
	'SWIPE_RIGHT': CommandType.MOVE_RIGHT,
	'SWIPE_UP': CommandType.MOVE_UP,
	'SWIPE_DOWN': CommandType.MOVE_DOWN,
	'PUSH': CommandType.MOVE_FORWARD,
	'PULL': CommandType.MOVE_BACKWARD,
	'CIRCLE_CW': CommandType.ROTATE_CW,
	'CIRCLE_CCW': CommandType.ROTATE_CCW,
}


class MotionAdapter(GestureAdapter):
	"""
	Translates hand motion into drone commands

	Inherits GestureStream lifecycle from GestureAdapter

	Emits 2 kinds of command:

	Discrete: one per motion gesture, not continuous

	Continuous: one ANALOG command per frame while the hand sits off its
	nuetral origin. This iss the path to use for sustained flight
	"""

	TWO_HAND_MAP = MOTION_TWO_HAND_MAP
	ASYMMETRICAL_TWO_HAND_MAP = MOTION_ASYMMETRICAL_TWO_HAND_MAP
	SINGLE_HAND_MAP = MOTION_SINGLE_HAND_MAP

	def _select_hands(self, hands: list[Any]) -> list[Any]:
		"""
		Confidence filter then the analog pass then drop UNKNOWN

		UNKNOWN has to go before _resolve sees the frame. _resolve does
		single - right or left, which prefers the right hand, and under the
		motion recognizer a hand that is simply not moving reports UNKNOWN on
		every frame. Leave it in and an idle right hand silently swallows every
		gesture the left hand makes

		The analog pass runs on the confidenct hands before that filter, since
		continuous control does not care whether a discrete gesture fired
		"""

		confident = super()._select_hands(hands)
		if not confident:
			return confident

		self._process_motion(confident)

		return [h for h in confident if h.gesture != 'UNKNOWN']

	def _process_motion(self, hands: list[Any]) -> None:
		"""
		Continuous joystick style control from HandOut.motion

		motion is None unde the rule and ml recognizer, so this
		qieutly does nothing if the pieline is not actually in motion mode

		Deflections arrive already deadzoned and clamped by rhe recognizer, so
		unlike the gamepad there is no second deadzone pass here
		"""
		motions = {h.handedness.upper(): h.motion for h in hands if getattr(h, 'motion', None)}
		if not motions:
			return

		# one hand flies, a second hand only contributes yaw
		primary = motions.get('RIGHT') or motions.get('LEFT')
		if primary is None:
			return

		yaw_hand = motions.get('LEFT') if 'RIGHT' in motions else None

		analog = AnalogInput(
			left_x=primary.x,
			left_y=-primary.depth,
			right_y=primary.y,
			right_x=yaw_hand.x if yaw_hand is not None else 0.0,
		)

		if not any((analog.left_x, analog.left_y, analog.right_x, analog.right_y)):
			return

		##holding a deflection is still the user flying, so dont let the idle
		# timeout decide they wandered off and force a HOVER underneath them
		self._last_gesture_ts = time.monotonic()

		logger.debug('MotionAdapter: analog %r', analog)
		self._emit(Command(CommandType.ANALOG, payload={'input': analog}, source='motion'))
