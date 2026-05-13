# /services/cv-pipeline/drone-control/command/command.py

# maps an input_adapter object into a normalized command


from enum import Enum, auto

#STUB
class CommandType(Enum):
    """Types of commands that can be sent to a drone."""
     
    TAKEOFF = auto()
    LAND = auto()
    MOVE_UP = auto()
    MOVE_DOWN = auto()
    EMERGENCY_STOP = auto()


class Command:
    """Represents a command to be sent to a drone."""
    
    def __init__(self, command_type: CommandType, **kwargs):
        self.command_type = command_type
        self.params = kwargs