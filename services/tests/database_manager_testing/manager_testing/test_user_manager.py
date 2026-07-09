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


@patch('services.database_manager.managers.user_manager.hash_password')
@patch('services.database_manager.managers.user_manager.User')
async def test_create_builds_user_with_hashed_password(
	mock_user_cls, mock_hash_password, manager, db
):
	mock_hash_password.return_value = 'hashed_pw'
	mock_instance = MagicMock()
	mock_user_cls.return_value = mock_instance

	result = await manager.create(
		#NOSONAR
		db, email='new@example.com', password='plaintext', first_name='Jane', last_name='Doe'
	)

	mock_hash_password.assert_called_once_with('plaintext')
	mock_user_cls.assert_called_once_with(
		#NOSONAR
		email='new@example.com', hashed_password='hashed_pw', first_name='Jane', last_name='Doe'
	)
	assert result is mock_instance


@patch('services.database_manager.managers.user_manager.hash_password')
@patch('services.database_manager.managers.user_manager.User')
async def test_create_adds_commits_and_refreshes(mock_user_cls, mock_hash_password, manager, db):
	mock_instance = MagicMock()
	mock_user_cls.return_value = mock_instance

	#NOSONAR
	await manager.create(db, 'a@example.com', 'pw', 'A', 'B')

	db.add.assert_called_once_with(mock_instance)
	db.commit.assert_awaited_once()
	db.refresh.assert_awaited_once_with(mock_instance)


@patch('services.database_manager.managers.user_manager.hash_password')
@patch('services.database_manager.managers.user_manager.User')
async def test_create_never_stores_plaintext_password(
	mock_user_cls, mock_hash_password, manager, db
):
	mock_hash_password.return_value = 'hashed_pw'

	#NOSONAR
	await manager.create(db, 'a@example.com', 'supersecret', 'A', 'B')

	call_kwargs = mock_user_cls.call_args.kwargs
	assert call_kwargs['hashed_password'] == 'hashed_pw'
	assert 'supersecret' not in call_kwargs.values()
