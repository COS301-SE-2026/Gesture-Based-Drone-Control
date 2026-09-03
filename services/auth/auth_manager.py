from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.password_service import hash_password, verify_password
from services.auth.token_service import TokenError, token_service
from services.database_manager.managers.refresh_token_manager import refresh_token_manager
from services.database_manager.managers.user_manager import user_manager
from services.database_manager.models.users import User


class EmailAlreadyRegisteredError(Exception):
	pass


class AccountCreationError(Exception):
	pass


class InvalidCredentialsError(Exception):
	pass


class InvalidRefreshTokenError(Exception):
	pass


class InvalidAccessTokenError(Exception):
	pass


@dataclass
class SessionTokens:
	access_token: str
	refresh_token: str
	refresh_expires_at: datetime


class AuthManager:
	async def register(
		self,
		*,
		db: AsyncSession,
		email: str,
		password: str,
		first_name: str,
		last_name: str,
	) -> SessionTokens:
		existing = await user_manager.get_by_email(email=email, db=db)

		if existing is not None:
			raise EmailAlreadyRegisteredError()

		password_hash = hash_password(password)

		user = await user_manager.create(
			email=email,
			hashed_password=password_hash,
			first_name=first_name,
			last_name=last_name,
			db=db,
		)

		if user is None:
			raise AccountCreationError()

		return await self._create_session(user, db)

	async def authenticate(self, *, db: AsyncSession, email: str, password: str) -> SessionTokens:
		user = await user_manager.get_by_email(email=email, db=db)

		if user is None or not verify_password(password=password, stored_hash=user.hashed_password):
			raise InvalidCredentialsError()

		return await self._create_session(user, db)

	async def refresh(self, *, db: AsyncSession, refresh_token: str) -> SessionTokens:

		token_hash = token_service.hash_refresh_token(refresh_token)

		stored_token = await refresh_token_manager.get_valid_by_hash(db=db, token_hash=token_hash)

		if stored_token is None:
			raise InvalidRefreshTokenError('Refresh token is invalid')

		if stored_token.revoked:
			raise InvalidRefreshTokenError('Refresh token is revoked')

		if stored_token.expires_at < datetime.now(timezone.utc):
			raise InvalidRefreshTokenError('Refresh token is expired')

		user = await user_manager.get_by_id(db=db, id=stored_token.user_id)

		if user is None:
			raise InvalidRefreshTokenError('User no longer exists')

		await refresh_token_manager.revoke(db=db, token=stored_token)

		return await self._create_session(
			db=db,
			user=user,
		)

	async def logout(self, *, db: AsyncSession, refresh_token: str) -> None:
		token_hash = token_service.hash_refresh_token(refresh_token)
		stored_token = await refresh_token_manager.get_valid_by_hash(db=db, token_hash=token_hash)
		print(token_hash)
		print(stored_token)

		if stored_token is None:
			raise InvalidRefreshTokenError('Refresh token is invalid')

		user = await user_manager.get_by_id(db=db, id=stored_token.user_id)

		if user is None:
			raise InvalidRefreshTokenError('User no longer exists')

		await refresh_token_manager.revoke(db=db, token=stored_token)

	async def _create_session(self, user: User, db: AsyncSession) -> SessionTokens:

		access_token = token_service.create_access_token(user.id)
		refresh, hash_token = token_service.create_refresh_token()
		expires = datetime.now(timezone.utc) + timedelta(hours=24)

		await refresh_token_manager.create(
			db=db, user_id=user.id, expires_at=expires, token_hash=hash_token
		)
		return SessionTokens(
			access_token=access_token, refresh_token=refresh, refresh_expires_at=expires
		)

	async def get_user_from_access_token(self, *, db: AsyncSession, access_token: str) -> User:
		try:
			payload = token_service.validate_access_token(access_token)
		except TokenError:
			raise InvalidAccessTokenError('Access token is not valid')

		user = await user_manager.get_by_id(db=db, id=payload.user_id)

		if user is None:
			raise InvalidAccessTokenError('User no longer exists')

		if not user.is_active:
			raise InvalidAccessTokenError('User account is inactive')

		return user


auth_manager = AuthManager()
