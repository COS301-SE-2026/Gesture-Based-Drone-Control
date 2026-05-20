# services/drone_control/adapters/__init__.py

from .drone_adapter import DroneAdapter, TelemetryData
from .airsim_adapter import AirSimAdapter
from .dummy_adapter import DummyAdapter
from .project_airsim_adapter import ProjectAirSimAdapter

# from .gazebo_adapter import GazeboAdapter
# from .xfly_adapter import XFlyAdapter

__all__ = ['DroneAdapter', 'TelemetryData', 'AirSimAdapter', 'DummyAdapter', 'ProjectAirSimAdapter']
