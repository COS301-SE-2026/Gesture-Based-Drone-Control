# /apps/backend/app/api/game.py

"""
Game endpoints, similar to the drone and input endpoints
Some are kinda redundant, but thats mostly because of database shenanigans 
that I dont understand and dont need for this one

REST:

WebSockets:

The game adapter is also implicitly reachable via POST /drone/connect
which enforces mutual exclusivity. this file also provides POST /game/connect
which does the same thing.

Client management is also done here similar to the other endpoints.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Annotated

from services.drone_control.adapters.game_adapter import GameAdapter

from app.dependencies import get_adapter, get_state
from app.state import AppState

logger = logging.getLogger(__name__)
router = APIRouter()

# REST endpoints

class GameConnectResponse(BaseModel):
    active: bool
    message: str
    
@router.post("/connect", response_model=GameConnectResponse)
async def game_connect(state: Annotated[AppState, Depends(get_state)]):
    """
    Activate this as the current drone adapter
    
    Basically just a wrapper for POST /drone/connect
    Disconnect currently active drone adapter and replaces it
    """
    if state.adapter and state.is_connected:
        logger.info('game/connect: replacing existing adapter')
        await state.adapter.disconnect()
        state.reset()

    adapter = GameAdapter()
    ok = await adapter.connect()
    if not ok:
        return GameConnectResponse(active=False, message='GameAdapter failed to connect')
    
    state.adapter = adapter
    state.adapter_name = 'game'
    
    logger.info('game/connect: GameAdapter active')
    return GameConnectResponse(active=True, message='Game adapter connected')
    

# WebSockets endpoints
