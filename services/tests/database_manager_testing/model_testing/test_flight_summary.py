import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.exc import IntegrityError

from services.database_manager.models.drones import Drone
from services.database_manager.models.flight_summary import FlightSummary


@pytest_asyncio.fixture
async def drone(session):
	d = Drone(display_name='test drone', is_simulated=True)
	session.add(d)
	await session.commit()
	return d


async def test_create_flight_summary_minimal_fields(session, drone):
	summary = FlightSummary(drone_id=drone.id, started_at=datetime.now(timezone.utc))
	session.add(summary)
	await session.commit()

	assert isinstance(summary.id, uuid.UUID)
	assert summary.user_id is None
	assert summary.ended_at is None
	assert summary.max_altitude is None
	assert summary.avg_battery_drain is None
	assert summary.avg_speed is None
	assert summary.control_count is None


async def test_drone_id_required(session):
	summary = FlightSummary(started_at=datetime.now(timezone.utc))
	session.add(summary)
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_started_at_required(session, drone):
	summary = FlightSummary(drone_id=drone.id)
	session.add(summary)
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_user_if_nullable(session, drone):
	summary = FlightSummary(drone_id=drone.id, started_at=datetime.now(timezone.utc), user_id=None)
	session.add(summary)
	await session.commit()

	assert summary.user_id is None


async def test_optional_numeric_fields_can_be_set(session, drone):
	summary = FlightSummary(
		drone_id=drone.id,
		started_at=datetime.now(timezone.utc),
		ended_at=datetime.now(timezone.utc),
		max_altitude=120.5,
		avg_battery_drain=0.42,
		avg_speed=8.3,
		control_count=57,
	)
	session.add(summary)
	await session.commit()

	assert summary.max_altitude == 120.5
	assert summary.avg_battery_drain == 0.42
	assert summary.avg_speed == 8.3
	assert summary.control_count == 57
