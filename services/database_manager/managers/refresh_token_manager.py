import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.models.refresh_tokens import RefreshToken

class RefreshTokenManager:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
            self,
            *,
            user_id: uuid.UUID,
            token_hash: str,
            expires_at: datetime,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self._session.add(token)
        await self._session.flush()
        return token