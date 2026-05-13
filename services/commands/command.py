# /services/cv-pipeline/drone-control/command/command.py

# maps an input_adapter object into a normalized command


from dataclasses import dataclass
from enum import Enum, auto


# STUB
class CommandType(Enum):
	"""Types of commands that can be sent to a drone."""

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


@dataclass
class Command:
	"""Represents a command to be sent to a drone."""

	type: CommandType
	priority: int = 0

	def __post_init__(self):
		if self.type is CommandType.EMERGENCY_STOP:
			self.priority = 999
