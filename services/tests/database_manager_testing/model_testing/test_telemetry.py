

from services.database_manager.models.telemetry import Telemetry


async def test_create_telemetry_minimal_fields(session):
	reading = Telemetry()
	session.add(reading)
