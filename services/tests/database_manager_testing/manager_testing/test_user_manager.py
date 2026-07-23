from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.database_manager.managers.user_manager import UserManager


@pytest.fixture
def db():
	mock = AsyncMock()
	mock.add = MagicMock()
	return mock


@pytest.fixture
def manager():
	return UserManager()


async def test_get_by_email_returns_user_when_found(manager, db):
	mock_user = MagicMock()
	result_mock = MagicMock()
	result_mock.scalar_one_or_none.return_value = mock_user
	db.execute.return_value = result_mock

	result = await manager.get_by_email(db, 'test@example.com')

	assert result is mock_user
	db.execute.assert_awaited_once()


async def test_get_by_email_returns_none_when_not_found(manager, db):
	result_mock = MagicMock()
	result_mock.scalar_one_or_none.return_value = None
	db.execute.return_value = result_mock

	result = await manager.get_by_email(db, 'missing@example.com')

	assert result is None


@patch('services.database_manager.managers.user_manager.User')
async def test_create_builds_user(mock_user_cls, manager, db):
	mock_instance = MagicMock()
	mock_user_cls.return_value = mock_instance

	result = await manager.create(
		db,
		email='new@example.com',
		hashed_password='hashed_pw',  # NOSONAR
		first_name='Jane',
		last_name='Doe',
	)

	mock_user_cls.assert_called_once_with(
		email='new@example.com',
		hashed_password='hashed_pw',  # NOSONAR
		first_name='Jane',
		last_name='Doe',
	)
	assert result is mock_instance


@patch('services.database_manager.managers.user_manager.User')
async def test_create_adds_commits_and_refreshes(mock_user_cls, manager, db):
	mock_instance = MagicMock()
	mock_user_cls.return_value = mock_instance

	await manager.create(db, 'a@example.com', 'pw', 'A', 'B')  # NOSONAR

	db.add.assert_called_once_with(mock_instance)
	db.commit.assert_awaited_once()
	db.refresh.assert_awaited_once_with(mock_instance)


@patch('services.database_manager.managers.user_manager.User')
async def test_create_uses_supplied_hash(mock_user_cls, manager, db):

	await manager.create(db, 'a@example.com', 'hashed_pw', 'A', 'B')  # NOSONAR

	call_kwargs = mock_user_cls.call_args.kwargs
	assert call_kwargs['hashed_password'] == 'hashed_pw'
