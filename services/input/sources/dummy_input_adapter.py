"""
Minimal InputAdapter implementation used for testing and simulation.

This adapter does not listen to real input devices.
Instead, it exposes a manual trigger method to simulate input events
and verify pipeline (InputAdapter -> Command -> DroneAdapter).
"""

import logging

from services.commands.command import Command, CommandType
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)


class DummyInputAdapter(InputAdapter):
	"""
	A deterministic input source for tests.

	Instead of real keyboard/gesture input, you manually call
	trigger_* methods to simulate user actions.
	"""

	def __init__(self) -> None:
		super().__init__()
		self._started = False
		self.emitted: list[Command] = []  # use for assets in tests

	async def start(self) -> None:
		"""
		In real adapters this would spawn listeners or background tasks.
		Here we only mark state as active.
		"""
		logger.info('DummyInputAdapter started')
		self._started = True

		# if you cannot tell i got lazy right about here. no docs for you

	def trigger_takeoff(self) -> None:
		self._emit(Command(type=CommandType.TAKEOFF, source='dummy-input'))

	def trigger_land(self) -> None:
		self._emit(Command(type=CommandType.LAND, source='dummy-input'))

	def trigger_move_forward(self) -> None:
		self._emit(Command(type=CommandType.MOVE_FORWARD, source='dummy-input'))

	def trigger_move_backward(self) -> None:
		self._emit(Command(type=CommandType.MOVE_BACKWARD, source='dummy-input'))

	def trigger_rotate_cw(self) -> None:
		self._emit(Command(type=CommandType.ROTATE_CW, source='dummy-input'))

	def trigger_rotate_ccw(self) -> None:
		self._emit(Command(type=CommandType.ROTATE_CCW, source='dummy-input'))

	def trigger_hover(self) -> None:
		self._emit(Command(type=CommandType.HOVER, source='dummy-input'))

	def trigger_emergency_stop(self) -> None:
		self._emit(Command(type=CommandType.EMERGENCY_STOP, source='dummy-input'))

	def _emit(self, command: Command) -> None:
		"""
		Override only to capture emitted commands for testing
		Still fully respects parent behavior
		Just makes things easier
		"""
		self.emitted.append(command)
		super()._emit(command)
