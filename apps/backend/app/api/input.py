# apps/backend/app/api/input.py

"""
All input routes, REST and WebSockets

"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectInputRequest(BaseModel):
    adapter: str = 'dummy' # dummy, keyboard...
    
def _build_input_adapter(body: ConnectInputRequest) -> InputAdapter:
    """factory to create the input adapter based on passed in request"""
    if body.adapter == 'dummy':
        from services.input.sources.dummy_input_adapter import DummyInputAdapter
        return DummyInputAdapter()
    elif body.adapter == 'keyboard':
        from services.input.sources.keyboard_adapter import KeyboardAdapter
        return KeyboardAdapter()
    
    # add more as they get developed here
    
    raise ValueError(f'invalid input adapter: {body.adapter!r}')
    