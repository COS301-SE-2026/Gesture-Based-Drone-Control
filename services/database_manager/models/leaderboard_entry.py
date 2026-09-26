from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Index, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.database_manager.models.users import User

from services.database_manager.database import Base

class LeaderboardEntry(Base):
    __tablename__ = 'leaderboard_entries'
    __table_args__ = (Index('ix_leaderboard_game_score', 'game_id', 'score'),)
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'), nullable=False)
    game_id: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    
    user: Mapped['User'] = relationship()