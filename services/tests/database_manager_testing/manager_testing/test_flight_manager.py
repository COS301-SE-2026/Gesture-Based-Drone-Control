from unittest.mock import AsyncMock, MagicMock

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
