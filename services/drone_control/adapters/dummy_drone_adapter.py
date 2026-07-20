# /services/drone-control/adapters/dummy_drone_adapter.py
"""
A minimal implementation of the DroneAdapter abc to use as a stub for testing
and to show off dynamic switching between adapters

Tracks a simulated local x/y position (metres from where it took off)
and altitude so frontend has real displacement vals to plot on the
leaflet CRS.Simple map without a real sim or hardware connected
"""

import logging
import math

from services.commands.command import CommandType, AnalogInput
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

logger = logging.getLogger(__name__)

DEFAULT_SPEED_MS: float = 2.0
DEFAULT_DURATION_S: float = 0.5
DEFAULT_ROTATE_DEG: float = 15.0
DEFAULT_ALT_STEP_M: float = 0.5


class DummyDroneAdapter(DroneAdapter):
	"""
	Simulates a drone moving in local 3d space. no real sim or hardware
	behind this - we just want enough for the integrated state (x/y_displacement and altitude_m)
	to drive the gps page and map end to end
	"""

	def __init__(self) -> None:
		self._connected: bool = False

		# simulate the local state, origin(0,0,0)
		self._x_displacement: float = 0.0
		self._y_displacement: float = 0.0
		self._altitude_m: float = 0.0
		self._heading_deg: float = 0.0
		self._is_flying: bool = False

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
		self._assert_connected()
		self._is_flying = True
		self._altitude_m = 1.5
		logger.info('DummyDroneAdapter took off')

	async def land(self) -> None:
		"""
		Safely descend and disarm the drone
		Should block other operations until the drone
		is on the ground.
		"""
		self._assert_connected()
		self._is_flying = False
		self._altitude_m = 0.0
		logger.info('DummyDroneAdapter: landed')

	async def move(self, direction: CommandType, **kwargs) -> None:
		"""
		Integrates fake position/altitude. forward/back/left/right are the body frame,
		so they get rotated into world x/y using the current heading - same as AirSim
		A single directional movement or rotation
		**kwargs - Values extracted from Command.payload by execute().
		- these will be implemented at a later stage, and are completely optional
		"""
		self._assert_connected()

		if direction is CommandType.ROTATE_CW:
			self._heading_deg = (self._heading_deg + DEFAULT_ROTATE_DEG) % 360
		elif direction is CommandType.ROTATE_CCW:
			self._heading_deg = (self._heading_deg - DEFAULT_ROTATE_DEG) % 360
		elif direction is CommandType.MOVE_UP:
			self._altitude_m += DEFAULT_ALT_STEP_M
		elif direction is CommandType.MOVE_DOWN:
			self._altitude_m -= DEFAULT_ALT_STEP_M
		else:
			body_vec = {
				CommandType.MOVE_FORWARD: (1, 0),
				CommandType.MOVE_BACKWARD: (-1, 0),
				CommandType.MOVE_RIGHT: (0, 1),
				CommandType.MOVE_LEFT: (0, -1),
			}.get(direction)

			if body_vec:
				dist = DEFAULT_SPEED_MS * DEFAULT_DURATION_S
				heading_rad = math.radians(self._heading_deg)
				fwd, right = body_vec
				# rotate body frame vect into the world frame by the current heading
				self._x_displacement += dist * (
					fwd * math.cos(heading_rad) - right * math.sin(heading_rad)
				)
				self._y_displacement += dist * (
					fwd * math.sin(heading_rad) + right * math.cos(heading_rad)
				)

		logger.info(
			'DummyDroneAdapter: move %s)',
			direction.name,
		)
  
	# TODO implement
	async def analog(self, input: AnalogInput) -> None:
		...

	async def hover(self) -> None:
		"""
		Cancel any active movement and hold a specified position
		Should take prioriy over all commands except an emergency landing
		"""
		self._assert_connected()
		logger.info('DummyDroneAdapter: hover')

	async def emergency_stop(self) -> None:
		"""
		Cancel any active movement and hold current position
		Maybe initiate a landing, not sure what would be best
		"""
		logger.warning('DummyDroneAdapter: EMERGENCY STOP CALLED')
		self._is_flying = False

	async def get_telemetry(self) -> TelemetryData:
		"""
		Return a snapshot of the current drone state
		Should be constantly polling
		"""
		self._assert_connected()
		return TelemetryData(
			altitude_m=self._altitude_m,
			speed_ms=DEFAULT_SPEED_MS if self._is_flying else 0.0,
			battery_pct=100.0,
			heading_deg=self._heading_deg,
			is_flying=self._is_flying,
			x_displacement=round(self._x_displacement, 3),
			y_displacement=round(self._y_displacement, 3),
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
