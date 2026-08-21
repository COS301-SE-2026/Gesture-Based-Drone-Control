# /apps/backend/app/api/game.py

"""
Game endpoints, similar to the drone and input endpoints
Some are kinda redundant, but thats mostly because of database shenanigans
that I dont understand and dont need for this one

REST:
    POST game/connect
    POST game/disconnect

WebSockets:

The game adapter is also implicitly reachable via POST /drone/connect
which enforces mutual exclusivity. this file also provides POST /game/connect
which does the same thing.

Client management is also done here similar to the other endpoints.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.dependencies import get_state
from app.state import AppState
from services.drone_control.adapters.game_adapter import GameAdapter

logger = logging.getLogger(__name__)
router = APIRouter()

# Clients functionality
"""
This component is the 'drone' part of our droneAdapter
its entirely unique to the game part of our system, since we
need some place for the GameAdapter to connect to.
This also fulfils the callback in GameAdapter.
"""
_clients: set[WebSocket] = set()

# REST endpoints

class GameConnectResponse(BaseModel):
	active: bool
	message: str


@router.post('/connect', response_model=GameConnectResponse)
async def game_connect(state: Annotated[AppState, Depends(get_state)]):
	"""
	Activate this as the current drone adapter

	Basically just a wrapper for POST /drone/connect
	Disconnect currently active drone adapter and replaces its
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


@router.post('/disconnect', response_model=GameConnectResponse)
async def game_disconnect(state: Annotated[AppState, Depends(get_state)]):
	"""
	Deactivate the game adapter and close all connected clients
	Do nothing if no game is active
	"""
	if state.adapter_name != 'game' or state.adapter is None:
		return GameConnectResponse(active=False, message='No game adapter is connected')

	await state.adapter.disconnect()
	state.reset()

	logger.info('game/disconnect: GameAdapter disconnected')
	return GameConnectResponse(active=False, message='Game adapter disconnected')

@router.get('/status')
async def game_status(state: Annotated[AppState, Depends(get_state)]):
    """Client count and current adapter state"""
    active = state.adapter_name == 'game'
    clients = len(_clients) if active else 0
    return {'active': active, 'connected_clients': clients}
# WebSockets endpoints
