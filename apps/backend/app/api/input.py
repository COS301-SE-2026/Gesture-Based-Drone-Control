# apps/backend/app/api/input.py

"""
All input routes, REST and WebSockets

"""

from __future__ import annotations

import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter()
