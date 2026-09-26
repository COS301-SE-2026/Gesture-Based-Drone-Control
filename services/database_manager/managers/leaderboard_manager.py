from __future__ import annotations

import uuid 

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.models.leaderboard_entry import LeaderboardEntry

class LeaderboardManager:
    async def submit_score(
        self, db: AsyncSession, *, user_id: uuid.UUID, game_id: str, score: int
    ) -> LeaderboardEntry:
        entry = LeaderboardEntry(user_id=user_id, game_id=game_id, score=score)
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry
    
    # users need to set their own display name, it has nothing to do with the logged in user
    async def set_display_name(
        self,
        db: AsyncSession,
        *,
        entry_id: uuid.UUID,
        user_id: uuid.UUID,
        display_name: str,
    ) -> LeaderboardEntry | None:
        result = await db.execute(
            select(LeaderboardEntry).where(
                LeaderboardEntry.id == entry_id,
                LeaderboardEntry.user_id == user_id,
            )
        )
        entry = result.scalar_one_or_none()
        if entry is None:
            return None
        entry.display_name = display_name.strip()[:24] or None
        await db.commit()
        await db.refresh(entry)
        return entry
    
    # returns the top 20 scores
    async def top_scores(
        self, db: AsyncSession, *, user_id: uuid.UUID, game_id: str, limit: int = 20
    ) -> list[LeaderboardEntry]:
        result = await db.execute(
            select(LeaderboardEntry)
            .where(
                LeaderboardEntry.user_id == user_id,
                LeaderboardEntry.game_id == game_id,
            )
            .order_by(LeaderboardEntry.score.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
leaderboard_manager = LeaderboardManager()