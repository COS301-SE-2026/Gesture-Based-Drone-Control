from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime, timezone

import pytest

from services.auth.auth_manager import (
	AuthManager,
	SessionTokens,
	EmailAlreadyRegisteredError,
	AccountCreationError
)


@pytest.fixture
def auth_manager():
	return AuthManager()


@pytest.fixture()
def db():
	return AsyncMock()


@pytest.fixture
def user():
	user = Mock()
	user.id = 1
	user.email = 'test@example.com'
	user.hashed_password = 'hashed-password'  # NOSONAR
	return user

class TestRegister:
	@patch.object(AuthManager, "_create_session", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.hash_password")
	@patch("services.auth.auth_manager.user_manager.create", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.user_manager.get_by_email", new_callable=AsyncMock)
	async def test_register_success(
		self,
		mock_get_by_email,
		mock_create,
		mock_hash_password,
		mock_create_session,
		auth_manager,
		db,
		user,
    ):
		mock_get_by_email.return_value = None
		mock_hash_password.return_value = "hashed-password"
		mock_create.return_value = user
		tokens = SessionTokens(
			access_token="access",
			refresh_token="refresh",
			refresh_expires_at=datetime.now(timezone.utc)
        )
		
		mock_create_session.return_value = tokens
		result = await auth_manager.register(
			db=db,
			email="test@example.com",
			password="Password123!", #NOSONAR
			first_name="Jane",
			last_name="Doe"
        )
		
		assert result == tokens
		mock_hash_password.assert_called_once_with("Password123!")
		mock_create.assert_awaited_once()
		mock_create_session.assert_awaited_once_with(user,db)
		
	@patch("services.auth.auth_manager.user_manager.get_by_email")
	async def test_register_existing_email(
		self, 
		mock_get_by_email,
		auth_manager,
		db,
		user
    ):
		mock_get_by_email.return_value= user
		
		with pytest.raises(EmailAlreadyRegisteredError):
			await auth_manager.register(
				db=db,
				email="test@example.com",
				password="Password123!",
				first_name="Jane",
				last_name="Doe"
            )
	@patch("services.auth.auth_manager.hash_password")
	@patch("services.auth.auth_manager.user_manager.create", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.user_manager.get_by_email", new_callable=AsyncMock)
	async def test_register_creation_failed(
		self,
		mock_get_by_email,
		mock_create,
		mock_hash_password,
		auth_manager,
		db
    ):
		mock_get_by_email.return_value = None
		mock_hash_password.return_value = "hashed_password"
		mock_create.return_value = None
		with pytest.raises(AccountCreationError):
			await auth_manager.register(
				db=db,
				email="test@example.com",
				password="Password123!",
				first_name="Jane",
				last_name= "Doe"
            )