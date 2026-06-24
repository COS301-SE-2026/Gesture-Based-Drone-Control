# /services/cv-pipeline/drone-control/adapters/airsim_adapter.py

"""
Concrete DroneAdapter that serves as a wrapper for the
airsim Python client library

Prereqs:
	1) AirSim instance already running and listening on the configured
		hostport before connect() is called
		default: localhost:41451

	2) AirSim Python package, should be part of your venv if
		'uv run' is executed in the services folder

Notes:
the coordinate system

AirSim uses a right handed, North-East-Down system:
+x = North  (forward in default world orientation)
+y = East   (right)
+z = Down   (into the ground, NEGATIVE when airborne)

This means:
- "Move up"   -> negative z velocity
- "Move down" -> positive z velocity
- Altitude    -> negate the z position component

All conversions are handled in this adapter, such that telemetrydata
consumers receive comparable and consistent data across all adapter types

AirSim async API

Most AirSim movement methods return a Future like object (await assignment, like a promise).
Calling .join() on them blocks the calling thread until the action completes.
Because our application is async (FastAPI / asyncio), we run .join()
inside asyncio.get_event_loop().run_in_executor() to avoid blocking
the event loop.

For simplicity in this minimal implementation, .join() is called directly.
**Mark TODOs where this should be made non-blocking in production.

"""

from __future__ import annotations

import asyncio
import logging
import math
from typing import TYPE_CHECKING

from services.commands.command import CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

# allow rest of package to be imported if airsim is not installed
if TYPE_CHECKING:
	import airsim as _airsim

logger = logging.getLogger(__name__)

# Movement config
# These will be configurable when fine tuning is needed

# how far to travel per discrete move command (metres)
DEFAULT_DISTANCE_M: float = 1.0

# travel speed for velocity-based moves (m/s)
DEFAULT_SPEED_MS: float = 2.0

# how long to apply velocity before auto-hovering (seconds)
# shorter = snappier but less distance covered per keypress
DEFAULT_DURATION_S: float = 0.5

# degrees to rotate per ROTATE_CW / ROTATE_CCW command
DEFAULT_ROTATE_DEG: float = 15.0

# yaw rate used during rotation (degrees per second)
DEFAULT_YAW_RATE_DPS: float = 45.0


class AirSimAdapter(DroneAdapter):
	"""
	Wraps airsim.MultirotorClient to implement the DroneAdapter

	Parameters
	host : str
		IP address of the machine running AirSim. Use "localhost" when
		AirSim is on the same machine as the Python process, or the
		LAN IP when running AirSim on a separate machine.
	port : int
		AirSim RPC port. Default is 41451.
	vehicle_name : str
		Name of the multirotor vehicle in the AirSim settings.json.
		Default "". If you have multiple vehicles, pass the correct name.
	"""

	def __init__(
		self,
		host: str = 'localhost',
		port: int = 41451,
		vehicle_name: str = '',
	) -> None:
		# apparently convention for one '_' to signal private member vars... the more you know
		self._host = host
		self._port = port
		self._vehicle = vehicle_name
		self._client: '_airsim.MultirotorClient | None' = None
		self._connected: bool = False

	# logic for the connection lifecycle

	@staticmethod
	async def _run(fn):
		"""
		Internal helper to await a blocking callable in the default thread pool
		executor

		Usage:
			await self._run(lambda: self._client.takeoffAsync().join())

		The lambda captures both the AirSim *Async call and the .join()
		so the whole blocking operation happens off the event loop thread.
		This needs to be used since AirSim doesn't play nice with async calls,
		as I have regrettably found out through a long and painful night
		"""
		loop = asyncio.get_event_loop()
		return await loop.run_in_executor(None, fn)

	async def connect(self) -> bool:
		"""
		Connect to airsim, enable API control, and arm the vehicle

		Returns false (doesnt raise an error) if airsim is unreachable
		This allows the application to degrade naturally rather than throw
		and burn
		"""

		try:
			import inspect

			import airsim  # type: ignore (the package does in fact exist...)
			import msgpack

			# this is the stupidest patch ever
			# newer msgpack versions lack the encoding kewarg that msgpack-rpc-python uses
			# patch the packer and unpacker to allow airsim and pas to work together in one env
			# i hate it
			# i hate it here
			if 'encoding' not in inspect.signature(msgpack.Packer.__init__).parameters:
				oldpacker = msgpack.Packer

				class _PatchedPacker(oldpacker):
					def __init__(self, *args, **kwargs):
						kwargs.pop('encoding', None)  # get rid of it entirely
						super().__init__(*args, **kwargs)  # and pass to parent

				msgpack.Packer = _PatchedPacker

			if 'encoding' not in inspect.signature(msgpack.Unpacker.__init__).parameters:
				oldunpacker = msgpack.Unpacker

				class _PatchedUnpacker(oldunpacker):
					def __init__(self, *args, **kwargs):
						kwargs.pop('encoding', None)  # get rid of it entirely
						super().__init__(*args, **kwargs)  # and pass to parent

				msgpack.Unpacker = _PatchedUnpacker

			def _connect_blocking():
				# AirSim's MultirotorClient may be broken.
				# look into how it handles ip and port -
				# for the life of me i couldnt get it working
				using_defaults = self._host in ('localhost', '127.0.0.1') and self._port == 41451
				if using_defaults:
					client = airsim.MultirotorClient()
				else:  # this will likely break but its kept here just in case
					client = airsim.MultirotorClient(ip=self._host, port=self._port)
				client.confirmConnection()
				client.enableApiControl(True, self._vehicle)
				client.armDisarm(True, self._vehicle)
				return client

			self._client = await self._run(_connect_blocking)
			self._connected = True

			logger.info(
				'AirSimAdapter: connected to %s:%d (vehicle=%r)',
				self._host,
				self._port,
				self._vehicle or 'default',
			)
			return True

		except Exception as ex:
			logging.exception('AirSimAdapter: connection failed - %s', ex)
			self._connected = False
			return False

	async def disconnect(self) -> None:
		"""
		Disarm the drone, release API control, and mark status as disconnected
		"""

		if self._client and self._connected:
			try:
				client = self._client
				vehicle = self._vehicle
				await self._run(
					lambda: (
						client.armDisarm(False, vehicle),
						client.enableApiControl(False, vehicle),
					)
				)
			except Exception as ex:
				logger.warning('AirSimAdapter: error during disconnect - %s', ex)
			finally:
				self._connected = False
				logger.info('AirSimAdapter: disconnected')

	# Flight commands
	async def takeoff(self) -> None:
		"""
		Ascend to AirSim's default hover altitude, around 3m

		This blocks the thread until the drone reports that it has
		reached hover altitude. in prod, we should replace .join()
		with run_in_executor so we dont block the event loop
		"""

		self._assert_connected()
		logger.info('AirSimAdapter: takeoff')
		# TODO: wrap run_in_executor for async correctness in prod. this is good enough for now
		await self._run(lambda: self._client.takeoffAsync(vehicle_name=self._vehicle).join())

	async def land(self) -> None:
		"""
		Descend to the ground and disarm the drone
		"""

		self._assert_connected()
		logger.info('AirSimAdapter: land')
		await self._run(lambda: self._client.landAsync(vehicle_name=self._vehicle).join())

	async def hover(self) -> None:
		"""
		Cancel whatever movement is happening now and hold current altitude

		hoverAsync() from the AirSim api implements this behaviour for us
		"""

		self._assert_connected()
		logger.info('AirSimAdapter: hover')
		await self._run(lambda: self._client.hoverAsync(vehicle_name=self._vehicle).join())

	async def emergency_stop(self) -> None:
		"""
		Cancel all pending tasks and immediately hover

		cancelLastTask() is the closest AirSim implementation of an emergency
		stop. It aborts the active task immediately.
		We then issue hoverAsync() to stay in place
		"""

		if self._client is None:
			logger.warning('AirSimAdapter: emergency_stop called but the client is Null')
			return

		logger.warning('AirSimAdapter: EMERGENCY STOP CALLED')
		try:
			client = self._client
			vehicle = self._vehicle
			# dont run with jojin since we want minimal lataency on this command
			await self._run(
				lambda: (
					client.cancelLastTask(vehicle),
					client.hoverAsync(vehicle_name=vehicle),
				)
			)
		except Exception as ex:
			logging.exception('AirSimAdapter: error during emergency_stop - %s', ex)

	async def move(self, direction: CommandType, **kwargs) -> None:
		"""
		A discrete directional move or rotation.

		Params:

		direction: CommandType
			Movement direction based on the enum passed in.
			All rotations are dispatch using a helper _rotate, else use
			baked in velocity based movement

		**kwargs
			Parity with the command payload:
			duration_s : float , seconds to apply the velocity       (0.5 default)
			speed_ms   : float , movement speed in metres per second (2.0 default)
			degrees    : float , rotation amount for ROTATE_*        (15.0 default)

		Recall that AirSim's movement maps to (vx, vy, vz) vectors in the North, East, Down frame
		MOVE_UP uses a negative vz because NED points down for whatever reason
		"""

		self._assert_connected()

		# rotation is handled separately
		if direction in (CommandType.ROTATE_CW, CommandType.ROTATE_CCW):
			await self._rotate(direction, degrees=kwargs.get('degrees', DEFAULT_ROTATE_DEG))
			return

		# check if speed was passed in
		speed = kwargs.get('speed_ms', DEFAULT_SPEED_MS)

		# map command types to velocity vectors in airsim's movement system (x,y,-z)
		velocity_map: dict[CommandType, tuple[float, float, float]] = {
			CommandType.MOVE_FORWARD: (speed, 0.0, 0.0),
			CommandType.MOVE_BACKWARD: (-speed, 0.0, 0.0),
			CommandType.MOVE_RIGHT: (0.0, speed, 0.0),
			CommandType.MOVE_LEFT: (0.0, -speed, 0.0),
			CommandType.MOVE_UP: (0.0, 0.0, -speed),  # up => -z
			CommandType.MOVE_DOWN: (0.0, 0.0, speed),
		}

		vec = velocity_map.get(direction)

		# skip undefined movements
		if vec is None:
			logger.warning(
				'AirSimAdapter.move: Skipping, no velocity vector defined for %s', direction.name
			)
			return

		vx, vy, vz = vec
		duration = kwargs.get('duration_s', DEFAULT_DURATION_S)

		logger.info(
			'AirSimAdapter: move %s (vx=%.2f vy=%.2f vz=%.2f duration=%.2fs)',
			direction.name,
			vx,
			vy,
			vz,
			duration,
		)

		client = self._client
		vehicle = self._vehicle

		# apply a constant velocity for 'duration' seconds
		await self._run(
			lambda: client.moveByVelocityAsync(
				vx,
				vy,
				vz,
				duration,
				vehicle_name=vehicle,
			).join()
		)

		# Snap to hover after each move so the drone doesn't drift.
		await self._run(lambda: client.hoverAsync(vehicle_name=vehicle).join())

	# TELEMETRY DATA

	async def get_telemetry(self) -> TelemetryData:
		"""
		Query AirSim for the current drone state and
		normalise the data to be encapsulated in a
		TelemetryData object

		Returns a zeroed TelemetryData if not connected
		to ensure safety
		"""

		if not self._connected or self._client is None:
			return TelemetryData(source='airsim-disconnected')

		try:
			client = self._client
			vehicle = self._vehicle
			state = await self._run(lambda: client.getMultirotorState(vehicle_name=vehicle))

			kin = state.kinematics_estimated
			pos = kin.position
			vel = kin.linear_velocity
			speed = math.sqrt(vel.x_val**2 + vel.y_val**2 + vel.z_val**2)

			# NED: z is negative when airborne, so negate for a positive altitude
			altitude = max(0.0, -pos.z_val)

			# LandedState.Landed == 1, Flying == 0 (check AirSim source)
			# airsim is stupid and uses either a plain int or enum depending on version.
			# this handles both
			landed = state.landed_state
			is_flying = (landed if isinstance(landed, int) else landed.value) != 1

			return TelemetryData(
				altitude_m=altitude,
				speed_ms=round(speed, 3),
				battery_pct=100.0,  # AirSim has no battery model
				heading_deg=self._get_heading_deg(),
				is_flying=is_flying,
				source='airsim',
			)
		except Exception as ex:
			logging.exception('AirSimAdapter.get_telemetry: error - %s', ex)
			return TelemetryData(source='airsim-error')

	# Private helpers only called internally

	async def _rotate(self, direction: CommandType, degrees: float) -> None:
		"""
		Yaw in place by 'degrees' at DEFAULT_YAW_RATE_DPS

		Positive yaw rate -> clockwise when viewed from above
		"""
		# decide which direction to rotate
		yaw_rate = (
			DEFAULT_YAW_RATE_DPS if direction is CommandType.ROTATE_CW else -DEFAULT_YAW_RATE_DPS
		)
		duration = abs(degrees / DEFAULT_YAW_RATE_DPS)

		logger.info(
			'AirSimAdapter: rotate %s (%.1f° at %.1f°/s over %.2fs)',
			direction.name,
			degrees,
			abs(yaw_rate),
			duration,
		)

		client = self._client
		vehicle = self._vehicle
		await self._run(
			lambda: client.rotateByYawRateAsync(yaw_rate, duration, vehicle_name=vehicle).join()
		)

	def _get_heading_deg(self, state=None) -> float:
		"""
		Helper to convert the current orientation quaternion to a heading in degrees
		Degree is defined as [0,360] clockwise from North
		"""

		try:
			import airsim

			if state is None:
				state = self._client.getMultirotorState(vehicle_name=self._vehicle)

			orientation = state.kinematics_estimated.orientation
			_, _, yaw = airsim.to_eularian_angles(orientation)
			return math.degrees(yaw) % 360.0

		except Exception as ex:
			logger.warning('AirSimAdapter._get_heading_deg: returning 0 due to error - %s', ex)
			return 0.0

	def _assert_connected(self) -> None:
		"""
		Raises a runtime error if the adapter is not connected to a sim vehicle.

		Called at the top of every method involving movement to prevent uncaught
		failures slipping through
		"""
		if not self._connected or self._client is None:
			raise RuntimeError(
				'AirSimAdapter is not connected.Await connect() before issuing commands.'
			)
