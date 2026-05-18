# /services/cv-pipeline/drone-control/command/command.py

"""
The Command dataclass and CommandType enum, to standardize
communication between both Adapter patterns.

A command simply carries intent, what operation should be performed
in the concrete adapter. It is purposefully minimal, and aims to keep
the input adapters (gesture, keyboard, etc.) fully decoupled from the drone
adapters (AirSim, XFly, etc.)

This class can be extended to allow for more commands. SImply add a new command in
the CommandType enum, and add a case for this in DroneAdapter.execute() to route it properly.
Then, implement the method in every concrete adapter that supports it,
and map it in every InputAdapter
that should be able to trigger the command.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any


class CommandType(Enum):
	"""
	Types of commands that can be sent to a drone

	Each member here maps to exactly one method on DroneAdapter.
	"""

	TAKEOFF = auto()
	LAND = auto()
	MOVE_UP = auto()
	MOVE_DOWN = auto()
	MOVE_LEFT = auto()
	MOVE_RIGHT = auto()
	MOVE_FORWARD = auto()
	MOVE_BACKWARD = auto()
	ROTATE_CW = auto()
	ROTATE_CCW = auto()
	HOVER = auto()
	EMERGENCY_STOP = auto()


# Prirority constants
# Use these names to make things more readable
PRIORITY_NORMAL = 1
PRIORITY_HIGH = 10  # will be used at some points
PRIORITY_CRITICAL = 999


@dataclass
class Command:
	"""
		Represents a command to be sent to a drone.

		Immutable data object representing a single option.
		Instances are read-only after creation since nothing in the
		pipeline would need to mutate a Command once emitted by an
	InputAdapter.

		Attributes:

		type : CommandType
				the action to performed, required as there is no default

		payload : dict[str, Any]
				Optional params that modify how the command executes.
				Useful for more complex Commands and possibly macros
				or intelligent pathfinding.

				Keys (to be implemented):
						"distance_m" - How far to move
						"speed_ms"   - Movement speed (m/s)
						"duration_s  - how long to apply movement (s)
						"degrees"    - rotation amount (degrees)

		priority : int
				Ordering hit for a future async priority queue.
				Higher number = higher priority. dont set manually,
				this should be handled higher up in the pipeline

		source : str
				Tag identifying which InputAdapter created the command.
				Just used for logging and debugging

		Examples
	--------
	Basic takeoff:
		cmd = Command(type=CommandType.TAKEOFF, source="keyboard")

	Move forward 3 m at a specific speed:
		cmd = Command(
			type=CommandType.MOVE_FORWARD,
			payload={"distance_m": 3.0, "speed_ms": 1.5},
			source="gesture",
		)

	Emergency stop (priority auto-elevated):
		cmd = Command(type=CommandType.EMERGENCY_STOP, source="keyboard")
		assert cmd.priority == PRIORITY_CRITICAL  # always True
	"""

	type: CommandType
	payload: dict[str, Any] = field(default_factory=dict)
	priority: int = PRIORITY_NORMAL
	source: str = 'unknown'

	def __post_init__(self):
		# elevate EMERGENCY_STOP to highest priority
		if self.type is CommandType.EMERGENCY_STOP:
			object.__setattr__(self, 'priority', PRIORITY_CRITICAL)

	def __repr__(self) -> str:
		"""
		A compact representation that omits default fields, easier to read
		"""
		parts = [f'type={self.type.name}']

		if self.payload:
			parts.append(f'payload={self.payload}')
		if self.priority != PRIORITY_NORMAL:
			parts.append(f'priority={self.priority}')
		if self.source != 'unknown':
			parts.append(f'source={self.source!r}')
		return f'Command({", ".join(parts)})'  # funny python string
