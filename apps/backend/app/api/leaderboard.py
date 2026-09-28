"""
Includes endpoints needed for leaderboard functionality
Separated from the rest of the game endpoints so we can keep
DB operations in their own corner.

The general database usage is mostly yoinked from auth.py and drone.py

REST:

WebSockets:

"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.auth_manager import auth_manager
from services.auth.auth_settings import get_auth_settings
from services.database_manager.database import get_db
from services.database_manager.managers.leaderboard_manager import leaderboard_manager

settings = get_auth_settings()
router = APIRouter(prefix='/leaderboard', tags=['leaderboard'])


async def get_current_user_id(
	db: Annotated[AsyncSession, Depends(get_db)],
	access_token: Annotated[str | None, Cookie(alias=settings.access_cookie_name)] = None,
) -> uuid.UUID:
	# tell the fake user to get lost
	if access_token is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not logged in')

	try:
		user = await auth_manager.get_user_from_access_token(db=db, access_token=access_token)
	except Exception as ex:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ex))
	return user.id


class SubmitScoreRequest(BaseModel):
	game_id: str
	score: int


class LeaderboardEntryResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: uuid.UUID
	game_id: str
	score: int
	display_name: str | None
	created_at: datetime


class SetNameRequest(BaseModel):
	display_name: str


@router.post(
	'/scores', response_model=LeaderboardEntryResponse, status_code=status.HTTP_201_CREATED
)
async def submit_score(
	body: SubmitScoreRequest,
	db: Annotated[AsyncSession, Depends(get_db)],
	user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
	"""
	Called once immediately on a game-over
	Score is always saved
	Name is optional and gets added at a later stage
	"""
	return await leaderboard_manager.submit_score(
		db, user_id=user_id, game_id=body.game_id, score=body.score
	)


@router.patch('/scores/{entry_id}/name', response_model=LeaderboardEntryResponse)
async def set_display_name(
	entry_id: uuid.UUID,
	body: SetNameRequest,
	db: Annotated[AsyncSession, Depends(get_db)],
	user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
	"""
	Attaches a display name to a score that the user just submitted
	"""
	entry = await leaderboard_manager.set_display_name(
		db, entry_id=entry_id, user_id=user_id, display_name=body.display_name
	)
	if entry is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Score not found')
	return entry


@router.get('/scores/{game_id}', response_model=list[LeaderboardEntryResponse])
async def get_top_scores(
	game_id: str,
	db: Annotated[AsyncSession, Depends(get_db)],
	user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
	limit: int = 20,
):
	return await leaderboard_manager.top_scores(db, game_id=game_id, limit=limit, user_id=user_id)
