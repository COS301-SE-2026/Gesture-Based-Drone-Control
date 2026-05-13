# /services/cv-pipeline/drone-control/adapters/airsim.py


from .drone_adapter import DroneAdapter, TelemetryData


# STUB
class AirSimAdapter(DroneAdapter):
	"""Adapter for AirSim simulator."""

	def connect(self) -> bool:
		return True

	def disconnect(self) -> None:
		pass

	def send_command(self, command) -> bool:
		return True

	def get_telemetry(self) -> TelemetryData:
		return TelemetryData()
