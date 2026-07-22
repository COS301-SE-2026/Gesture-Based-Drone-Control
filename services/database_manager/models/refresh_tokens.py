import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from services.database_manager.database import Base


class RefreshToken(Base):
	__tablename__ = 'refresh_tokens'

	id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
	user_id: Mapped[uuid.UUID] = mapped_column(
		ForeignKey('users.id', ondelete='CASCADE'), index=True
	)

	token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
	expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

	revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
