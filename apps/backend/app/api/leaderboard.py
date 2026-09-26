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

from services.auth.auth_settings import get_auth_settings
from services.auth.cookies import clear_auth_cookies, set_auth_cookies
from services.auth.schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse
from services.database_manager.database import get_db

settings = get_auth_settings()
router = APIRouter(prefix='/leaderboard', tags=['leaderboard'])
