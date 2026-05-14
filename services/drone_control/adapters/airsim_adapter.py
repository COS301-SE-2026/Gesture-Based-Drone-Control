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

import logging
from typing import TYPE_CHECKING

from services.drone_control.adapters.drone_adapter import DroneAdapter

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

	async def connect(self) -> bool:
		"""
		Connect to airsim, enable API control, and arm the vehicle

		Returns false (doesnt raise an error) if airsim is unreachable
		This allows the application to degrade naturally rather than throw
		and burn
		"""

		try:
			import airsim  # type: ignore (the package does in fact exist...)

			# raises if airsim unreachable
			self._client = airsim.MultirotorClient(ip=self._host, port=self._port)

			self._client.enableApiControl(True, self._vehicle)
			self._client.armDisarm(True, self._vehicle)

			self._connected = True
			logger.info(
				'AirSimAdapter: connected to $s:%d (vehicle=%r)',
				self._host,
				self._port,
				self._vehicle or 'unknown',
			)

			return True

		except Exception as ex:
			logger.error('AirSimAdapter: connection failed - %s', ex)
			self._connected = False
			return False

	async def disconnect(self) -> None:
		"""
		Disarm the drone, release API control, and mark status as disconnected
		"""

		if self._client and self._connected:
			try:
				self._client.armDisarm(False, self._vehicle)
				self._client.enableApiControl(False, self._vehicle)
			except Exception:
				logger.warning('AirSimAdapter: error')
			finally:
				self._connected = False
				logger.info('AirSimAdapter: disconnected')

	# Flight commands
