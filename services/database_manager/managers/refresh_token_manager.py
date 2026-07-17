import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.models.refresh_tokens import RefreshToken


class RefreshTokenManager:
	async def create(
		self,
		*,
		db: AsyncSession,
		user_id: uuid.UUID,
		token_hash: str,
		expires_at: datetime,
	) -> RefreshToken:
		token = RefreshToken(
			user_id=user_id,
			token_hash=token_hash,
			expires_at=expires_at,
		)
		db.add(token)
		await db.flush()
		return token

	async def get_valid_by_hash(self, db: AsyncSession, token_hash: str) -> RefreshToken | None:
		result = await db.execute(
			select(RefreshToken)
			.where(RefreshToken.token_hash == token_hash, not RefreshToken.revoked)
			.order_by(desc(RefreshToken.created_at))
			.limit(1)
		)

		token = result.scalar_one_or_none()
		if token is None:
			return None
		return token

	async def mark_used(self, db: AsyncSession, token: RefreshToken) -> None:
		token.last_used_at = datetime.now(timezone.utc)
		await db.flush()

	async def revoke(self, db: AsyncSession, token: RefreshToken) -> None:
		token.revoked = True
		await db.flush()

	async def delete_by_hash(self, db: AsyncSession, token_hash: str) -> None:
		await db.execute(delete(RefreshToken).where(RefreshToken.token_hash == token_hash))

	async def delete_all_for_user(self, db: AsyncSession, user_id: uuid.UUID) -> None:
		await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))


refresh_token_manager = RefreshTokenManager()
