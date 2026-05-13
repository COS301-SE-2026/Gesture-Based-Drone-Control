# /services/cv-pipeline/drone-control/adapters/drone_adapter.py
# interface class to implement the adapter pattern

from abc import ABC, abstractmethod
from dataclasses import dataclass

#STUB

@dataclass
class TelemetryData:
    """Telemetry data from a drone"""
    altitude_m: float = 0.0
    battery_pct: float = 100.0
    is_flying: bool = False
    source: str = "unknown"


class DroneAdapter(ABC):
    """Abstract base class for all drone adapters"""
    
    @abstractmethod
    def connect(self) -> bool:
        """Connect to the drone."""
        ...
    
    @abstractmethod
    def disconnect(self) -> None:
        """Disconnect from the drone"""
        ...
    
    @abstractmethod
    def send_command(self, command) -> bool:
        """Send a command to the drone"""
        ...
    
    @abstractmethod
    def get_telemetry(self) -> TelemetryData:
        """Get telemetry data from the drone"""
        ...