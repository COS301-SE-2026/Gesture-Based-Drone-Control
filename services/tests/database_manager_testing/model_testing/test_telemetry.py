import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.exc import IntegrityError

from services.database_manager.models.drones import Drone
from services.database_manager.models.flight_summary import FlightSummary
from services.database_manager.models.telemetry import Telemetry


@pytest_asyncio.fixture
async def flight_summary(session):
	drone = Drone(display_name='test drone', is_simulated=True)
	session.add(drone)
	await session.commit()

	summary = FlightSummary(drone_id=drone.id, started_at=datetime.now(timezone.utc))
	session.add(summary)
	await session.commit()
	return summary


async def test_create_telemetry_minimal_fields(session, flight_summary):
	reading = Telemetry(flight_id=flight_summary.id)
	session.add(reading)
	await session.commit()

	assert isinstance(reading.id, int)
	assert reading.flight_id == flight_summary.id
	assert reading.recorded_at is not None
	assert reading.displacement_x is None
	assert reading.displacement_y is None
	assert reading.altitude is None
	assert reading.battery_level is None
	assert reading.speed is None
	assert reading.command_count is None


async def test_flight_id_required(session):
	reading = Telemetry()
	session.add(reading)
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_invalid_flight_id_rejected(session):
	reading = Telemetry(flight_id=uuid.uuid4())
	session.add(reading)
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_id_autoincrements(session, flight_summary):
	a = Telemetry(flight_id=flight_summary.id)
	b = Telemetry(flight_id=flight_summary.id)
	session.add_all([a, b])
	await session.commit()

	assert a.id != b.id
	assert a.id < b.id


async def test_all_optional_numeric_fields_can_be_set(session, flight_summary):
	reading = Telemetry(
		flight_id=flight_summary.id,
		displacement_x=1.5,
		displacement_y=-2.25,
		altitude=100.0,
		battery_level=87.3,
		speed=4.2,
		command_count=12,
	)

	session.add(reading)
	await session.commit()

	assert reading.displacement_x == pytest.approx(1.5)
	assert reading.displacement_y == pytest.approx(-2.25)
	assert reading.altitude == pytest.approx(100.0)
	assert reading.battery_level == pytest.approx(87.3)
	assert reading.speed == pytest.approx(4.2)
	assert reading.command_count == 12
