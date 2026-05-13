# /services/cv-pipeline/drone-control/adapters/drone_adapter.py

"""
The DroneAdepter abstract base class and TelemetryData dataclass
- Interface that every drone adapter must implement

DroneAdapter:
    The main point of interation is execute(command).
    Adapter design pattern used so that callers do not
    need to know the gory details of whatever drone sim
    or drone sdk they are interacting with

TelemetryData:
    A basic dataclass returned by get_telemetry(). All
    concrete adapters must return at lease these fields.
    A sentinel value may be used for unsupported values,
    such as 100% for airsim.

"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from services.commands import Command, CommandType

logger = logging.getLogger(__name__)

class TelemetryData:
    """ 
    All drone adapters return this shape from get_telemetry()
    extra : dict
        Escape hatch for adapter-specific values that don't belong in
        the standard fields. Use sparingly. Consumers must not depend
        on keys in this dict being present.
    """

    altitude_m:   float = 0.0
    speed_ms:     float = 0.0
    battery_pct:  float = 100.0
    heading_deg:  float = 0.0
    is_flying:    bool  = False
    source:       str   = "unknown"
    extra:        dict  = field(default_factory=dict)


class DroneAdapter(ABC):
	"""
	The abstract base class for all drone interaction

	Subclasses serve as wrappers for a specific sdk or sim api.
	All interaction with the drone, both from FastAPI routes and
	input adapters, need to be routed through execute(Command)
	on an instance of a concrete subclass

	Class flow:
	1) create the adapter with connection params (localhost, drone ip, etc.)
	2) await adapter.connect() for a True
	3) Pass commands via await adapter.execute(command)
	4) Poll telemetry via await adapter.get_telemetry()
	5) await adapter.disconnect() at shutdown. Should safely land the drone
	"""

	# Abstract methods that every concrete adapter must implement
	@abstractmethod
	async def connect(self) -> bool:
		"""
		establish a connection to the drone or sim
		"""
		...

	@abstractmethod
	async def disconnect(self) -> None:
		"""
		Release the connection and land the drone
		"""
		...

	@abstractmethod
	async def takeoff(self) -> None:
		"""
		Arm the drone and ascend to a safe altitude
		"""
		...

	@abstractmethod
	async def land(self) -> None:
		"""
		Safely descend and disarm the drone
		Should block other operations until the drone
		is on the ground.
		"""
		...

	@abstractmethod
	async def move(self, direction: CommandType, **kwargs) -> None:
		"""
		A single directional movement or rotation
		**kwargs - Values extracted from Command.payload by execute().
		- these will be implemented at a later stage, and are completely optional
		"""
		...

	@abstractmethod
	async def hover(self) -> None:
		"""
		Cancel any active movement and hold a specified position
		Should take prioriy over all commands except an emergency landing
		"""
		...

	@abstractmethod
	async def emergency_stop(self) -> None:
		"""
		Cancel any active movement and hold current position
		Maybe initiate a landing, not sure what would be best
		"""
		...

	@abstractmethod
	async def get_telemetry(self) -> TelemetryData:
		"""
		Return a snapshot of the current drone state
		Should be constantly polling
		"""
		...

	# concrete method for command dispatch
	async def execute(self, command: Command) -> None:
		"""
		Dispatch a command to the appropriate adapter method
		The single entry point for all callers. Keep routing logic here
		instad of the api or input adapters.

		The control structure here should mirror CommandType exactly,
		we need to be able to map all possible commands. When one is added there,
		immediately add it here.

		emergency stop is handled first.
		"""

		logger.info('DroneAdapter.execute: %r', command)

		t = command.type
		if t is CommandType.EMERGENCY_STOP:
			await self.emergency_stop()

		elif t is CommandType.TAKEOFF:
			await self.takeoff()

		elif t is CommandType.LAND:
			await self.land()

		elif t is CommandType.HOVER:
			await self.hover()

		elif t in (
			CommandType.MOVE_UP,
			CommandType.MOVE_DOWN,
			CommandType.MOVE_FORWARD,
			CommandType.MOVE_BACKWARD,
			CommandType.MOVE_LEFT,
			CommandType.MOVE_RIGHT,
			CommandType.ROTATE_CW,
			CommandType.ROTATE_CCW,
		):
			await self.move(t)  # (t, **command.payload) when that is implemented

		else:
			# should only be possible when we get a new CommandType
			logger.warning(
				'DroneAdapter.execute: no handler for CommandType.%s. \
                           Have you wired it up in drone_adapter.py?',
				t.name,
			)
