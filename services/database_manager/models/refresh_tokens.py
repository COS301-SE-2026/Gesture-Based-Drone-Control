import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.database_manager.database import Base

class RefreshToken (Base):
    __tablename__ = "refresj_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default = uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index = True)

    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)