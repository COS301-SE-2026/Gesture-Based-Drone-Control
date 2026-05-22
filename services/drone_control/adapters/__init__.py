# services/drone_control/adapters/__init__.py

from .airsim_adapter import AirSimAdapter
from .drone_adapter import DroneAdapter, TelemetryData
from .dummy_drone_adapter import DummyDroneAdapter
from .project_airsim_adapter import ProjectAirSimAdapter

# from .gazebo_adapter import GazeboAdapter
# from .xfly_adapter import XFlyAdapter

__all__ = [
	'DroneAdapter',
	'TelemetryData',
	'AirSimAdapter',
	'DummyDroneAdapter',
	'ProjectAirSimAdapter',
]
