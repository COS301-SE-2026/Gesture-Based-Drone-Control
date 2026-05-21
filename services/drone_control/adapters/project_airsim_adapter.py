# services/drone_control/adapters/project_airsim_adapter.py

"""
Concrete DroneAdapter wrapping the Project AirSim Python client
Enables us to use the more updated unreal 5 Project Airsim

Project AirSim vs legacy AirSim

The legacy airsim package used msgpackrpc + a Tornado IOLoop internally,
which conflicted with asyncio and required threading workarounds.
(the workarounds never actually worked)

Project AirSim's client is built on pynng and is properly async-native.
Every drone method (takeoff_async, move_by_velocity_body_frame_async, etc.)
is a real coroutine that can be awaited directly

Coordinate system

Project AirSim uses the same NED as legacy AirSim
+x = North / forward    +y = East / right    +z = Down

Movement uses body-frame velocity (move_by_velocity_body_frame_async) so
forward/back/left/right are relative to whichever way the drone is facing,
which is the natural expectation for manual control.
The legacy version sort of had tank controls, its a bit awkward.

World() needs a scene config file. We bundle a copy of the package and
sim_config such that environments are consistent and we are able to deploy eventually.
This code will likely have to be modified, so it serves as a place to keep our own fork.
The paths are evaluated at runtime so nothing needs to be copied or hardcoded.

Connection parameters

Project AirSim uses two separate ports:
topics_port   : pub-sub stream (default 8989)
services_port : RPC commands   (default 8990)
These are different from the legacy AirSim port (41451)

"""

from __future__ import annotations

import asyncio
import logging
import math
import pathlib
from typing import TYPE_CHECKING

from services.commands.command import CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

if TYPE_CHECKING:
	import projectairsim as _pas

logger = logging.getLogger(__name__)

# defaults for movement. tweakable, same as airsim
DEFAULT_SPEED_MS: float = 8.0
DEFAULT_DURATION_S: float = 0.5
DEFAULT_ROTATE_DEG: float = 15.0
DEFAULT_YAW_RATE_DPS: float = 120.0

# the drone drops like a rock, drift it up a lil every time we move horzontally
GRAVITY_COMP_VZ: float = -0.3


def _find_sim_config() -> str:
	"""
	Internal method to resolve the sim_config/ dir to pass to World()

	Searches vendors/sim_config and vendors/projectairsim/gym_envs

	Raises a runtime error if nothing is found
	"""
	# this code is so ass
	repo_root = pathlib.Path(__file__).resolve().parent.parent.parent.parent

	# vendors/sim_config
	bundled = repo_root / 'vendors' / 'sim_config'
	if bundled.is_dir():
		return str(bundled) + '/'

	# fallback
	try:
		import projectairsim

		pkg_root = pathlib.Path(projectairsim.__file__).parent
		candidate = pkg_root / 'gym_envs' / 'sim_config'
		if candidate.is_dir():
			return str(candidate) + '/'
	except ImportError:
		pass

	raise RuntimeError(
		'Could not find sim_config/. '
		'Copy ProjectAirSim/client/python/example_user_scripts/sim_config into vendors/sim_config'
	)


class ProjectAirSimAdapter(DroneAdapter):
	"""
	Wraps projectairsim.Drone to implement DroneAdapter.

	Parameters:
	    host : str
	        IP of the machine running Project AirSim. Default 127.0.0.1 localhost
	    topics_port : int
	        Pub-sub port. Default 8989.
	    services_port : int
	        RPC services port. Default 8990.
	    vehicle_name : str
	        Vehicle name as defined in the scene config. Default "Drone1".
	    scene_config : str
	        Scene config filename (not full path). Default "scene_basic_drone.jsonc".
	    sim_config_path : str | None
	        Override the sim_config directory. Auto-detected from the package if None.
	"""

	# holy constructor
	def __init__(
		self,
		host: str = '127.0.0.1',
		topics_port: int = 8989,
		services_port: int = 8990,
		vehicle_name: str = 'Drone1',
		scene_config: str = 'scene_basic_drone.jsonc',
		sim_config_path: str | None = None,
	) -> None:
		self._host = host
		self._topics_port = topics_port
		self._services_port = services_port
		self._vehicle_name = vehicle_name
		self._scene_config = scene_config
		self._sim_config_path = sim_config_path  # resolved in connect()

		self._client: '_pas.ProjectAirSimClient | None' = None
		self._drone: '_pas.Drone | None' = None
		self._connected: bool = False

	# Connection lifecycle

	async def connect(self) -> bool:
		"""
		Connect to Project AirSim, initialize the scene, and arm the dronw

		Returns False if fail rather than throw
		"""
		try:
			import projectairsim
			from projectairsim import Drone, World

			# Resolve sim_config path once only at connect time
			config_path = self._sim_config_path or _find_sim_config()
			logger.info('ProjectAirSimAdapter: using sim_config at %s', config_path)

			self._client = projectairsim.ProjectAirSimClient(
				address=self._host,
				port_topics=self._topics_port,
				port_services=self._services_port,
			)

			self._client.connect()

			world = World(
				client=self._client,
				scene_config_name=self._scene_config,
				sim_config_path=config_path,
			)

			self._drone = Drone(self._client, world, self._vehicle_name)
			self._drone.enable_api_control()

			self._connected = True
			logger.info(
				'ProjectAirSimAdapter: connected to %s (topics=%d services=%d vehicle=%r)',
				self._host,
				self._topics_port,
				self._services_port,
				self._vehicle_name,
			)
			return True

		except Exception as ex:
			logging.exception('ProjectAirSimAdapter: connection failed - %s', ex)
			self._connected = False
			return False

	async def disconnect(self) -> None:
		"""
		Disarm the drone, disable API control, disconnect

		Uses a brief sleep to allow any async responses time to arrive
		before the port closes. otherwise we get flooded with 'Object closed'
		errors.
		"""

		if self._drone and self._connected:
			try:
				await self.land()
				# can increase if error messages still flooding
				await asyncio.sleep(5)
				self._drone.disarm()
				self._drone.disable_api_control()
			except Exception as ex:
				logger.warning('ProjectAirSimAdapter: error during disarm - %s', ex)

		if self._client:
			try:
				self._client.disconnect()
			except Exception as ex:
				logger.warning('ProjectAirSimAdapter: error during disconnect - %s', ex)

		self._connected = False
		logger.info('ProjectAirSimAdapter: disconnected')

	# Flight commands

	async def takeoff(self) -> None:
		"""
		Arm the drone and ascend to a safe altitude
		"""
		self._assert_connected()

		logger.info('ProjectAirSimAdapter: arming the drone')
		self._drone.arm()
		logger.info('ProjectAirSimAdapter: taking off')
		await self._drone.takeoff_async()

	async def land(self) -> None:
		"""
		Safely descend and disarm the drone
		Should block other operations until the drone
		is on the ground.
		"""
		self._assert_connected()

		logger.info('ProjectAirSimAdapter: landing the drone')
		await self._drone.land_async()
		# wait until altitude confirms touchdown
		for _ in range(10):  # max 5 seconds
			await asyncio.sleep(0.5)
			t = await self.get_telemetry()
			if not t.is_flying:
				break

		logger.info('ProjectAirSimAdapter: disarming the drone')
		self._drone.disarm()

	async def move(self, direction: CommandType, **kwargs) -> None:
		"""
		A single discrete directional movement or rotation

		Body frame means that vx/vy/vz are relative to the drone's current
		orientation, rather than global. Controls more like you'd expect.

		Params:
		    direction : CommandType
		    **kwargs:
		        speed_ms : float m/s default 3.0
		        duration_s : float seconds default 0.1
		        degrees : float [ROTATE_CW/CCW] default 15.0

		This will need to be refactored at some point down the road to allow for analog movement.
		Will likely require changes in CommandType
		"""
		self._assert_connected()

		# pass to dedicated rotation handler if needed
		if direction in (CommandType.ROTATE_CCW, CommandType.ROTATE_CW):
			await self._rotate(direction, degrees=kwargs.get('degrees', DEFAULT_ROTATE_DEG))
			return

		speed = kwargs.get('speed_ms', DEFAULT_SPEED_MS)
		duration = kwargs.get('duration_s', DEFAULT_DURATION_S)

		# vx = forward, vy=right, vz=down # NOSONAR
		velocity_map: dict[CommandType, tuple[float, float, float]] = {
			CommandType.MOVE_FORWARD: (speed, 0.0, GRAVITY_COMP_VZ),
			CommandType.MOVE_BACKWARD: (-speed, 0.0, GRAVITY_COMP_VZ),
			CommandType.MOVE_RIGHT: (0.0, speed, GRAVITY_COMP_VZ),
			CommandType.MOVE_LEFT: (0.0, -speed, GRAVITY_COMP_VZ),
			CommandType.MOVE_UP: (0.0, 0.0, -speed),  # up = -z
			CommandType.MOVE_DOWN: (0.0, 0.0, speed),
		}

		vec = velocity_map.get(direction)
		if vec is None:
			logger.warning('ProjectAirSimAdapter.move: no vector for %s — skipping', direction.name)
			return

		# I forgot python could split like this its cool
		vx, vy, vz = vec
		logger.info(
			'ProjectAirSimAdapter: move %s (vx=%.2f vy=%.2f vz=%.2f dur=%.2fs)',
			direction.name,
			vx,
			vy,
			vz,
			duration,
		)

		await self._drone.move_by_velocity_body_frame_async(vx, vy, vz, duration)

	async def hover(self) -> None:
		"""
		Cancel any active movement and hold a specified position
		Should take prioriy over all commands except an emergency landing

		hover_async should exist i hope
		"""
		self._assert_connected()

		logger.info('ProjectAirSimAdapter: hovering...')
		await self._drone.hover_async()

	async def emergency_stop(self) -> None:
		"""
		Cancel any active movement and hold current position
		Maybe initiate a landing, not sure what would be best
		"""
		if self._drone is None:
			logger.warning('ProjectAirSimAdapter: emergency_stop called but drone is None')
			return

		logger.warning('ProjectAirSimAdapter: EMERGENCY STOP CALLED')
		try:
			await self._drone.hover_async()
			self._drone.disarm()
		except Exception as ex:
			logger.error('ProjectAirSimAdapter: error during emergency_stop - %s', ex)

	async def get_telemetry(self) -> TelemetryData:
		"""
		Return a normalised snapshot of current drone state.
		Returns zeroed TelemetryData if disconnected.

		State is read via get_ground_truth_kinematics(), which is a
		synchronous RPC call that returns a dict. Shape taken from
		rover.py:

		    {
		        "pose": {
		            "position":    {"x": float, "y": float, "z": float},
		            "orientation": {"w": float, "x": float, "y": float, "z": float}
		        },
		        "twist": {
		            "linear":  {"x": float, "y": float, "z": float},
		            "angular": {"x": float, "y": float, "z": float}
		        }
		    }
		"""

		if not self._connected or self._drone is None:
			return TelemetryData(source='projectairsim-disconnected')

		try:
			state = self._drone.get_ground_truth_kinematics()
			logger.debug('get_ground_truth_kinematics raw: %r', state)

			pose = state.get('pose', {})
			position = pose.get('position', {})
			orientation = pose.get('orientation', {})
			twist = state.get('twist', {})
			linear_vel = twist.get('linear', {})

			z = position.get('z', 0.0)
			altitude = max(0.0, -z)

			vx = linear_vel.get('x', 0.0)
			vy = linear_vel.get('y', 0.0)
			vz = linear_vel.get('z', 0.0)
			# its like a triangle but 3
			speed = math.sqrt(vx**2 + vy**2 + vz**2)

			# this where scary math happens
			heading = self._yaw_from_quaternion_dict(orientation)
			is_flying = altitude > 0.1

			return TelemetryData(
				altitude_m=round(altitude, 3),
				speed_ms=round(speed, 3),
				battery_pct=100.0,
				heading_deg=heading,
				is_flying=is_flying,
				source='projectairsim',
			)
		except Exception as ex:
			# this one is the fragile one...
			logging.exception('ProjectAirSimAdapter.get_telemetry: error - %s', ex)
			logger.debug('Telemetry exception detail', exc_info=True)
			return TelemetryData(source='projectairsim-error')

	# PRIVATE HELPER FUNCTIONS

	async def _rotate(self, direction: CommandType, degrees: float) -> None:
		"""
		Adjust yaw in place. A positive yaw is defined as clockwise when viewed from above
		"""
		yaw_rate = (
			DEFAULT_YAW_RATE_DPS if direction is CommandType.ROTATE_CW else -DEFAULT_YAW_RATE_DPS
		)

		duration = abs(degrees / DEFAULT_YAW_RATE_DPS)
		logger.info(
			'ProjectAirSimAdapter: rotate %s (%.1fdeg at %.1fdeg/s over %.2fs)',
			direction.name,
			degrees,
			abs(yaw_rate),
			duration,
		)
		# hell yeah its built in
		await self._drone.rotate_by_yaw_rate_async(yaw_rate, duration)

	@staticmethod
	def _yaw_from_quaternion_dict(q: dict) -> float:
		"""
		Extract compass heading [0, 360) from a quaternion dict.
		either {w, x, y, z} and {w_val, x_val, y_val, z_val} key shapes
		Holy scary math :(

		quaternion is a 4d system used to represent a 3D state
		consists of one real number (scalar for rotation w)
		and 3 imaginary numbers
		q = w + xi + yj + zk where ijk = -1 = i^2 = j^2 = k^2

		get only the yaw component of a quaternion to euler conversion

		yaw = atan2(2(wz+wy),1 -2(y^2+z^2))
		"""
		try:
			w = q.get('w', q.get('w_val', 1.0))
			x = q.get('x', q.get('x_val', 0.0))
			y = q.get('y', q.get('y_val', 0.0))
			z = q.get('z', q.get('z_val', 0.0))
			siny_cosp = 2.0 * (w * z + x * y)
			cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
			return math.degrees(math.atan2(siny_cosp, cosy_cosp)) % 360.0
		except Exception as ex:
			logger.warning('ProjectAirSimAdapter._yaw_from_quaternion_dict: returning 0 - %s', ex)
			return 0.0

	def _assert_connected(self) -> None:
		"""Raise RuntimeError if not connected. Guards every command method."""
		if not self._connected or self._drone is None:
			raise RuntimeError(
				'ProjectAirSimAdapter is not connected. Await connect() before issuing commands.'
			)
