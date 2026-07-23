import uuid
from datetime import datetime
from unittest.mock import ANY, AsyncMock, MagicMock, patch

import pytest

from services.database_manager.managers.flight_manager import FlightManager


@pytest.fixture
def db():
	mock = AsyncMock()
	mock.add = MagicMock()
	return mock


@pytest.fixture
def manager():
	return FlightManager()


async def test_get_or_create_drone_returns_existing_drone(manager, db):
	mock_drone = MagicMock()
	result_mock = MagicMock()
	result_mock.scalar_one_or_none.return_value = mock_drone
	db.execute.return_value = result_mock

	result = await manager.get_or_create_drone(db, 'ExistingDrone', True)

	assert result is mock_drone
	db.execute.assert_awaited_once()
	db.add.assert_not_called()
	db.commit.assert_not_awaited()


async def test_get_or_create_drone_creates_new_drone_when_missing(manager, db):
	result_mock = MagicMock()
	result_mock.scalar_one_or_none.return_value = None
	db.execute.return_value = result_mock

	result = await manager.get_or_create_drone(db, 'NewDrone', False)

	db.add.assert_called_once()
	added_drone = db.add.call_args.args[0]
	assert added_drone.display_name == 'NewDrone'
	assert added_drone.is_simulated is False
	db.commit.assert_awaited_once()
	db.refresh.assert_awaited_once_with(added_drone)
	assert result is added_drone


@patch('services.database_manager.managers.flight_manager.FlightSummary')
async def test_start_flight_w_user_id(mock_flight_cls, manager, db):
	mock_instance = MagicMock()
	mock_flight_cls.return_value = mock_instance
	user_id = uuid.uuid4()

	result = await manager.start_flight(db, drone_id=1, user_id=user_id)
	mock_flight_cls.assert_called_once_with(drone_id=1, user_id=user_id, started_at=ANY)
	db.add.assert_called_once_with(mock_instance)
	db.commit.assert_awaited_once()
	db.refresh.assert_awaited_once_with(mock_instance)
	assert result is mock_instance


@patch('services.database_manager.managers.flight_manager.FlightSummary')
async def test_start_flight_wo_user_id(mock_flight_cls, manager, db):
	mock_instance = MagicMock()
	mock_flight_cls.return_value = mock_instance
	await manager.start_flight(db, drone_id=7)
	_, kwargs = mock_flight_cls.call_args
	assert kwargs['drone_id'] == 7
	assert kwargs['user_id'] is None
	assert isinstance(kwargs['started_at'], datetime)


async def test_end_flight_returns_when_flight_not_found(manager, db):
	result_mock = MagicMock()
	result_mock.scalar_one_or_none.return_value = None
	db.execute.return_value = result_mock

	result = await manager.end_flight(db, flight_id=uuid.uuid4())

	assert result is None
	db.execute.assert_awaited_once()
	db.commit.assert_not_awaited()


async def test_end_flight_aggre_telem_plus_updates_flight(manager, db):
	mock_flight = MagicMock()
	flight_result = MagicMock()
	flight_result.scalar_one_or_none.return_value = mock_flight

	aggr_res = MagicMock()
	aggr_res.one.return_value = (30.0, 4.0, 3)

	db.execute.side_effect = [flight_result, aggr_res]

	result = await manager.end_flight(db, flight_id=uuid.uuid4())

	assert mock_flight.max_altitude == 30.0
	assert mock_flight.avg_speed == 4.0
	assert mock_flight.control_count == 3
	assert isinstance(mock_flight.ended_at, datetime)
	db.commit.assert_awaited_once()
	db.refresh.assert_awaited_once_with(mock_flight)
	assert result is mock_flight


async def test_end_flight_w_no_telem_sets(manager, db):
	mock_flight = MagicMock()
	flight_result = MagicMock()
	flight_result.scalar_one_or_none.return_value = mock_flight
	aggr_res = MagicMock()
	aggr_res.one.return_value = (None, None, 0)
	db.execute.side_effect = [flight_result, aggr_res]
	result = await manager.end_flight(db, flight_id=uuid.uuid4())
	assert mock_flight.max_altitude is None
	assert mock_flight.avg_speed is None
	assert mock_flight.control_count == 0
	assert result is mock_flight


@patch('services.database_manager.managers.flight_manager.Telemetry')
async def test_record_telem_builds_and_adds_rows(mock_telemetry_cls, manager, db):
	mock_instance = MagicMock()
	mock_telemetry_cls.return_value = mock_instance
	flight_id = uuid.uuid4()
	await manager.record_telemetry(
		db,
		flight_id=flight_id,
		displacement_x=1.0,
		displacement_y=2.0,
		altitude=10.0,
		battery_level=90.00,
		speed=3.5,
	)
	mock_telemetry_cls.assert_called_once_with(
		flight_id=flight_id,
		displacement_x=1.0,
		displacement_y=2.0,
		altitude=10.0,
		battery_level=90.0,
		speed=3.5,
	)
	db.add.assert_called_once_with(mock_instance)
	db.commit.assert_awaited_once()
	db.refresh.assert_not_awaited()
