# /services/drone-control/adapters/dummy_drone_adapter.py
"""
A minimal implementation of the DroneAdapter abc to use as a stub for testing
and to show off dynamic switching between adapters
"""

import logging

from services.commands.command import CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

logger = logging.getLogger(__name__)


class DummyDroneAdapter(DroneAdapter):
	"""
	Does absolutely nothing but log. This can be considered
	our mocked implementation of 'dynamic drone adapter switching'
	"""

	def __init__(self) -> None:
		self._connected: bool = False

	async def connect(self) -> bool:
		if self._connected:
			logger.info('DummyDroneAdapter already connected. ignoring')
			return False
		logger.info('DummyDroneAdapter connected')
		self._connected = True
		return True

	async def disconnect(self) -> None:
		"""
		Release the connection and land the drone
		"""
		if not self._connected:
			logger.info('DummyDroneAdapter already disconnected. ignoring')
			return
		logger.info('DummyDroneAdapter disconnected')
		self._connected = False

	async def takeoff(self) -> None:
		"""
		Arm the drone and ascend to a safe altitude
		"""
		logger.info('DummyDroneAdapter took off')

	async def land(self) -> None:
		"""
		Safely descend and disarm the drone
		Should block other operations until the drone
		is on the ground.
		"""
		self._assert_connected()
		logger.info('DummyDroneAdapter: landed')

	async def move(self, direction: CommandType, **kwargs) -> None:
		"""
		A single directional movement or rotation
		**kwargs - Values extracted from Command.payload by execute().
		- these will be implemented at a later stage, and are completely optional
		"""
		self._assert_connected()
		logger.info(
			'DummyDroneAdapter: move %s)',
			direction.name,
		)

	async def hover(self) -> None:
		"""
		Cancel any active movement and hold a specified position
		Should take prioriy over all commands except an emergency landing
		"""
		logger.info(
			'DummyDroneAdapter: Hover called)',
		)

	async def emergency_stop(self) -> None:
		"""
		Cancel any active movement and hold current position
		Maybe initiate a landing, not sure what would be best
		"""
		logger.info(
			'DummyDroneAdapter: Emergency stop called.)',
		)

	async def get_telemetry(self) -> TelemetryData:
		"""
		Return a snapshot of the current drone state
		Should be constantly polling
		"""
		self._assert_connected()
		return TelemetryData(
			altitude_m=1,
			speed_ms=2,
			battery_pct=300.0,
			heading_deg=0,
			is_flying=True,
			source='dummy',
		)

	def _assert_connected(self) -> None:
		"""
		Raises a runtime error if the adapter is not connected.

		Called at the top of every method involving movement to prevent uncaught
		failures slipping through
		"""
		if not self._connected:
			raise RuntimeError(
				'DummyDroneAdapter is not connected. Await connect() before issuing commands.'
			)
