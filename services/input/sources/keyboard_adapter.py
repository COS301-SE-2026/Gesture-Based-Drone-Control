# /services/input/sources/keyboard_adapter.py

"""
A concrete InputAdapter that recieves browser key events forwarded
over a WebSocket connection and maps them to appropriate Command objects

The drone SDK runs in the python process, meaning the browser cannot talk
to it directly. The react frontend will thus capture raw keydown/up events and
forwards them as a JSON object through a WebSocket to FastAPI.
This adapter receives those messages and converts them into Commands that can
be used by the DroneAdapter.

This means that this adapter is not a standard keyboard listener like was implemented
as a proof of concept. Instead, it purely translates a message shape to a command.

Message format (subject to change but hopefully not):

	{ "key": "ArrowUp", "event": "keydown" }
	{ "key": "ArrowUp", "event": "keyup" }

Currently we only consider keydown events. keyup is recieved and ignored for now,
but its included such that we can eventually support continuous movement without changing
any endpoints or parsing, only this file would be changed.

Keymapping:

The KEY_MAP dict is the single source of truth. currently custom keybinds are not supported,
however it can be added at a later stage.

	Arrow keys    : directional movement (forward/back/left/right)
	W / S         : altitude up / down
	A / D         : rotate counter-clockwise / clockwise
	T             : takeoff
	L             : land
	Spacebar      : hover (cancel movement)
	Escape        : EMERGENCY_STOP

"""

from __future__ import annotations

import logging
from typing import Any

from commands.command import Command, CommandType
from input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

# KEEP THIS DICT UNCHANGED FOR NOW
# Key names are the exact strings produced by the browsers KeyboardEvent.key property
# This is the reference used for these names:  https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
KEY_MAP: dict[str, CommandType] = {
	# Directional movement - arrow keys
	'ArrowUp': CommandType.MOVE_FORWARD,
	'ArrowDown': CommandType.MOVE_BACKWARD,
	'ArrowLeft': CommandType.MOVE_LEFT,
	'ArrowRight': CommandType.MOVE_RIGHT,
	# Altitude - W/S
	'w': CommandType.MOVE_UP,
	's': CommandType.MOVE_DOWN,
	# Rotation - A/D
	'a': CommandType.ROTATE_CCW,
	'd': CommandType.ROTATE_CW,
	# Flight control
	't': CommandType.TAKEOFF,
	'l': CommandType.LAND,
	' ': CommandType.HOVER,  # spacebar
	# Safety - always reachable
	'Escape': CommandType.EMERGENCY_STOP,
}


class KeyboardAdapter(InputAdapter):
	"""
	Maps forwarded browser key events to appropriate commands.

	Usage: FastAPI WebSockets

	Example initialization:
				adapter = KeyboardAdapter()
		adapter.set_handler(lambda cmd: asyncio.create_task(drone.execute(cmd)))
		await adapter.start()

		@app.websocket("/ws/keyboard")
		async def ws_keyboard(ws: WebSocket):
			await ws.accept()
			while True:
				msg = await ws.receive_json()
				adapter.handle_message(msg)

	Usage: PyTest unit testing:
		received: list[Command] = []
		adapter = KeyboardAdapter()
		adapter.set_handler(received.append)

		adapter.handle_message({"key": "t", "event": "keydown"})
		assert received[0].type == CommandType.TAKEOFF

	"""

	def start(self) -> None:
		"""
		No initialization needed for this adapter
		This one is entirely event driven with no background tasks
		"""
		logger.info('KeyboardAdapter: ready (waiting for WebSocket messages)')

	def handle_message(self, message: dict[str, Any]) -> None:
		"""
		Process a single forwarded key event from the browser.

		Call this from the FastAPI WebSocket route every time a JSON
		message arrives on the relevant channel.

		Parameters:

		message : dict
			Must contain:
			"key"   : str  - the browser KeyboardEvent.key value
			"event" : str  - "keydown" or "keyup"

		Unknown keys and keyup events are silently ignored so
		that normal browser behaviour (like F12, Ctrl+R) is not
		accidentally suppressed.
		"""
		try:
			event = message.get('event', '')
			key = message.get('key', '')
		except AttributeError:
			logger.warning('KeyboardAdapter: received non-dict message: %r', message)
			return

		# only act on keydown. keyup will be accepted at some point just not yet
		if event != 'keydown':
			return

		command_type = KEY_MAP.get(key)

		if command_type is None:
			# unmapped key, log at DEBUG because theres tons of these
			# logs but is visible when debugging new key bindings.
			logger.debug('KeyboardAdapter: unmapped key %r - ignoring', key)
			return

		command = Command(
			type=command_type,
			source='keyboard',
		)

		# If the handler is a coroutine function (e.g. DroneAdapter.execute),
		# wrap it in a Task so _emit can stay synchronous.
		# _emit() itself handles the None-handler case with a warning.
		self._emit(command)

	def get_bindings(self) -> dict[str, str]:
		"""
		Return a human-readable summary of current key bindings.

		Useful for rendering a controls legend in the dashboard UI or
		for logging on startup.

		returns dict mapping key label to command name:
			{"ArrowUp": "MOVE_FORWARD", "t": "TAKEOFF", ...}
		"""
		return {key: cmd.name for key, cmd in KEY_MAP.items()}
