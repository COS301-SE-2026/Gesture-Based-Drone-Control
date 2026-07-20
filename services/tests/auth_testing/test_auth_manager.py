from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock, patch

import pytest

from services.auth.auth_manager import (
	AccountCreationError,
	AuthManager,
	EmailAlreadyRegisteredError,
	InvalidCredentialsError,
	InvalidRefreshTokenError,
	SessionTokens,
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
	@patch.object(AuthManager, '_create_session', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.hash_password')
	@patch('services.auth.auth_manager.user_manager.create', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.user_manager.get_by_email', new_callable=AsyncMock)
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
		mock_hash_password.return_value = 'hashed-password'
		mock_create.return_value = user
		tokens = SessionTokens(
			access_token='access',
			refresh_token='refresh',
			refresh_expires_at=datetime.now(timezone.utc),
		)

		mock_create_session.return_value = tokens
		result = await auth_manager.register(
			db=db,
			email='test@example.com',
			password='Password123!',  # NOSONAR
			first_name='Jane',
			last_name='Doe',
		)

		assert result == tokens
		mock_hash_password.assert_called_once_with('Password123!')
		mock_create.assert_awaited_once()
		mock_create_session.assert_awaited_once_with(user, db)

	@patch('services.auth.auth_manager.user_manager.get_by_email')
	async def test_register_existing_email(self, mock_get_by_email, auth_manager, db, user):
		mock_get_by_email.return_value = user

		with pytest.raises(EmailAlreadyRegisteredError):
			await auth_manager.register(
				db=db,
				email='test@example.com',
				password='Password123!',
				first_name='Jane',
				last_name='Doe',
			)

	@patch('services.auth.auth_manager.hash_password')
	@patch('services.auth.auth_manager.user_manager.create', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.user_manager.get_by_email', new_callable=AsyncMock)
	async def test_register_creation_failed(
		self, mock_get_by_email, mock_create, mock_hash_password, auth_manager, db
	):
		mock_get_by_email.return_value = None
		mock_hash_password.return_value = 'hashed_password'
		mock_create.return_value = None
		with pytest.raises(AccountCreationError):
			await auth_manager.register(
				db=db,
				email='test@example.com',
				password='Password123!',
				first_name='Jane',
				last_name='Doe',
			)


class TestAuthenticate:
	@patch.object(AuthManager, '_create_session', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.verify_password')
	@patch('services.auth.auth_manager.user_manager.get_by_email', new_callable=AsyncMock)
	async def test_authenticate_success(
		self,
		mock_get_by_email,
		mock_verify_password,
		mock_create_session,
		auth_manager,
		db,
		user,
	):
		mock_get_by_email.return_value = user
		mock_verify_password.return_value = True

		tokens = SessionTokens(
			access_token='access_token',
			refresh_token='refresh_token',
			refresh_expires_at=datetime.now(timezone.utc),
		)

		mock_create_session.return_value = tokens
		result = await auth_manager.authenticate(
			db=db,
			email='test@example.com',
			password='Password123!',  # NOSONAR
		)

		assert result == tokens
		mock_verify_password.assert_called_once_with(
			password='Password123!', stored_hash=user.hashed_password
		)

	@patch('services.auth.auth_manager.user_manager.get_by_email', new_callable=AsyncMock)
	async def test_authenticate_user_not_found(
		self,
		mock_get_by_email,
		auth_manager,
		db,
	):
		mock_get_by_email.return_value = None

		with pytest.raises(InvalidCredentialsError):
			await auth_manager.authenticate(
				db=db, email='test@example.com', password='Password123!'
			)

	@patch('services.auth.auth_manager.verify_password')
	@patch('services.auth.auth_manager.user_manager.get_by_email', new_callable=AsyncMock)
	async def test_authenticate_invalid_password(
		self,
		mock_get_by_email,
		mock_verify_password,
		auth_manager,
		db,
		user,
	):
		mock_get_by_email.return_value = user
		mock_verify_password.return_value = False

		with pytest.raises(InvalidCredentialsError):
			await auth_manager.authenticate(
				db=db, email='test@example.com', password='WrongPassword123!'
			)


class TestRefresh:
	@patch.object(AuthManager, '_create_session', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.user_manager.get_by_id', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.refresh_token_manager.revoke', new_callable=AsyncMock)
	@patch(
		'services.auth.auth_manager.refresh_token_manager.get_valid_by_hash', new_callable=AsyncMock
	)
	@patch('services.auth.auth_manager.token_service.hash_refresh_token')
	async def test_refresh_success(
		self,
		mock_hash_refresh,
		mock_get_token,
		mock_revoke,
		mock_get_user,
		mock_create_session,
		auth_manager,
		db,
		user,
	):
		stored_token = Mock()
		stored_token.id = user.id
		stored_token.revoked = False
		stored_token.expires_at = datetime(2100, 1, 1, tzinfo=timezone.utc)
		mock_hash_refresh.return_value = 'hash'
		mock_get_token.return_value = stored_token
		mock_get_user.return_value = user

		tokens = SessionTokens(
			access_token='access',
			refresh_token='refresh',
			refresh_expires_at=datetime.now(timezone.utc),
		)
		mock_create_session.return_value = tokens
		result = await auth_manager.refresh(db=db, refresh_token='refresh_token')
		assert result == tokens
		mock_revoke.assert_awaited_once_with(db=db, token=stored_token)


class TestLogout:
	@patch('services.auth.auth_manager.refresh_token_manager.revoke', new_callable=AsyncMock)
	@patch('services.auth.auth_manager.user_manager.get_by_id', new_callable=AsyncMock)
	@patch(
		'services.auth.auth_manager.refresh_token_manager.get_valid_by_hash', new_callable=AsyncMock
	)
	@patch('services.auth.auth_manager.token_service.hash_refresh_token')
	async def test_logout_success(
		self,
		mock_hash_refresh,
		mock_get_token,
		mock_get_user,
		mock_revoke,
		auth_manager,
		db,
		user,
	):
		token = Mock()
		token.id = user.id
		mock_hash_refresh.return_value = 'hash'
		mock_get_token.return_value = token
		mock_get_user.return_value = user

		await auth_manager.logout(db=db, refresh_token='refresh-token')

		mock_revoke.assert_awaited_once_with(db=db, token=token)

		@patch(
			'services.auth.auth_manager.refresh_token_manager.get_valid_by_hash',
			new_callable=AsyncMock,
		)
		@patch('services.auth.auth_manager.token_service.hash_refresh_token')
		async def test_logout_invalid_token(
			self, mock_hash_refresh, mock_get_token, auth_manager, db
		):
			mock_hash_refresh.return_value = 'hash'
			mock_get_token.return_value = None

			with pytest.raises(InvalidRefreshTokenError):
				await auth_manager.logout(db=db, refresh_token='refresh-token')

		@patch('services.auth.auth_manager.user_manager.get_by_id', new_callable=AsyncMock)
		@patch(
			'services.auth.auth_manager.refresh_token_manager.get_valid_by_hash',
			new_callable=AsyncMock,
		)
		@patch('services.auth.auth_manager.token_service.hash_refresh_token')
		async def test_logout_user_not_found(
			self,
			mock_hash_refresh_token,
			mock_get_token,
			mock_get_user,
			auth_manager,
			db,
		):
			token = Mock()
			token.id = 1
			mock_hash_refresh_token.return_value = 'hash'
			mock_get_token.return_value = token
			mock_get_user.return_value = None
			with pytest.raises(InvalidRefreshTokenError):
				await auth_manager.logout(
					db=db,
					refresh_token="refresh-token"
				)

class TestRefresh:
	@patch.object(AuthManager, "_create_session", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.user_manager.get_by_id", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.refresh_token_manager.revoke", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.refresh_token_manager.get_valid_by_hash", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.token_service.hash_refresh_token")
	async def test_refresh_success(
		self, 
		mock_hash_refresh,
		mock_get_token,
		mock_revoke,
		mock_get_user,
		mock_create_session,
		auth_manager,
		db,
		user
	):
		stored_token = Mock()
		stored_token.id = user.id	
		stored_token.revoked = False
		stored_token.expires_at = datetime(2100, 1,1, tzinfo=timezone.utc)
		mock_hash_refresh.return_value = 'hash'
		mock_get_token.return_value = stored_token
		mock_get_user.return_value = user
		tokens = SessionTokens(
			access_token='access',
			refresh_token='refresh',
			refresh_expires_at=datetime.now(timezone.utc),
		)
		mock_create_session.return_value=tokens
		result = await auth_manager.refresh(
			db=db, 
			refresh_token="refresh-token"
		)
		assert result == tokens
		mock_revoke.assert_awaited_once_with(
			db=db,
			token=stored_token
		)

	@patch("services.auth.auth_manager.refresh_token_manager.get_valid_by_hash", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.token_service.hash_refresh_token")
	async def test_refresh_invalid_token(
		self,
		mock_hash_refresh,
		mock_get_token,
		auth_manager,
		db,
	):
		mock_hash_refresh.return_value = "hash"
		mock_get_token.return_value= None

		with pytest.raises(InvalidRefreshTokenError):
			await auth_manager.refresh(
				db=db,
				refresh_token= "refresh-token"
			)

	@patch("services.auth.auth_manager.refresh_token_manager.get_valid_by_hash", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.token_service.hash_refresh_token")
	async def test_refresh_revoked_token(
		self,
		mock_hash_refresh,
		mock_get_token,
		auth_manager,
		db,
	):
		token = Mock()
		token.revoked = True
		token.expires_at = datetime (2100,1 ,1 , tzinfo=timezone.utc)

		mock_hash_refresh.return_value = "hash"
		mock_get_token.return_value = token

		with pytest.raises(InvalidRefreshTokenError):
			await auth_manager.refresh(
				db=db,
				refresh_token = "refresh-token"
			)

	@patch("services.auth.auth_manager.refresh_token_manager.get_valid_by_hash", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.token_service.hash_refresh_token")
	async def test_refresh_expired_token(
		self,
		mock_hash_refresh,
		mock_get_token,
		auth_manager,
		db,
	):
		token = Mock()
		token.revoked = False
		token.expires_at = datetime (2000,1 ,1 , tzinfo=timezone.utc)

		mock_hash_refresh.return_value = "hash"
		mock_get_token.return_value = token

		with pytest.raises(InvalidRefreshTokenError):
			await auth_manager.refresh(
				db=db,
				refresh_token = "refresh-token"
			)

	@patch("services.auth.auth_manager.user_manager.get_by_id", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.refresh_token_manager.get_valid_by_hash", new_callable=AsyncMock)
	@patch("services.auth.auth_manager.token_service.hash_refresh_token")
	async def test_refresh_user_not_found(
		self,
		mock_hash_refresh,
		mock_get_token,
		mock_get_user,
		auth_manager,
		db,
	):
		token = Mock()
		token.id = 1
		token.revoked = False
		token.expires_at = datetime (2100,1 ,1 , tzinfo=timezone.utc)


		mock_hash_refresh.return_value = "hash"
		mock_get_token.return_value = token
		mock_get_user.return_value = None

		with pytest.raises(InvalidRefreshTokenError):
			await auth_manager.refresh(
				db=db,
				refresh_token = "refresh-token"
			)
	