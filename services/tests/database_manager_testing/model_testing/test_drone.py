import pytest
from sqlalchemy.exc import IntegrityError

from services.database_manager.models.drones import Drone


async def test_create_drone_minimal_fields(session):
	drone = Drone(display_name='Test Drone', is_simulated=True)
	session.add(drone)
	await session.commit()

	assert isinstance(drone.id, int)
	assert drone.display_name == 'Test Drone'
	assert drone.is_simulated is True


async def test_id_autoincrements(session):
	drone_a = Drone(display_name='a', is_simulated=True)
	drone_b = Drone(display_name='a', is_simulated=True)
	session.add_all([drone_a, drone_b])
	await session.commit()

	assert drone_a.id != drone_b.id
	assert drone_a.id < drone_b.id


async def test_display_name_required(session):
	session.add(Drone(is_simulated=True))
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_is_simulated_required(session):
	session.add(Drone(display_name='Sim Drone'))
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_is_simulated_true(session):
	drone = Drone(display_name='Sim Drone', is_simulated=True)
	session.add(drone)
	await session.commit()
	assert drone.is_simulated is True


async def test_is_simulated_false(session):
	drone = Drone(display_name='Real Drone', is_simulated=False)
	session.add(drone)
	await session.commit()
	assert drone.is_simulated is False


async def test_flight_summaries_relationship_is_empty_by_default(session):
	drone = Drone(display_name='Sim Drone', is_simulated=True)
	session.add(drone)
	await session.commit()
	await session.refresh(drone, attribute_names=['flight_summaries'])
	assert drone.flight_summaries == []
