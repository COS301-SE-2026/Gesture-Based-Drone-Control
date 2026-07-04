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

class ConnectInputResponse(BaseModel):
    connected: bool
    message: str
    adapter: str
    
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

def _make_handler(state: AppState):
    """
    Works with the InputAdapter interface to register a command handler
    with the connected input adapter.
    
    If no drone is connected we drop with a warning.
    
    I built this a bit shit didnt I :(
    """
    def handler(command):
        if state.adapter is None:
            logger.warning(f'input handler: command {command.type.name} dropped, no drone connected')
            return
        asyncio.create_task(state.adapter.execute(command))
    
    return handler
        
# REST endpoints

@router.post('/connect', response_model=ConnectInputResponse)
async def connect_input(body: ConnectInputRequest, state: Annotated[AppState, Depends(get_state)]):
    """
    Connect an input adapter and wire it to the active drone.
    
    Replaces an input if already registered
    Drone does not need to be connnected first, but commands to it are dropped
    """
    if state.input is not None:
        logger.info(f'input/connect: replacing existing input adapter {state.input_name}')
        state.input_reset()
    
    try:
        adapter = _build_input_adapter(body)
    except ValueError as ex:
        return ConnectInputResponse(connected=False, adapter=body.adapter, message=str(ex))
    
    adapter.set_handler(_make_handler(state))
    await adapter.start()
    
    state.input = adapter
    state.input_name = body.adapter
    
    logger.info(f'input/connect: connected to {body.adapter!r} successfully')
    return ConnectInputResponse(
        connected = True,
        adapter = body.adapter,
        message = f'{body.adapter!r} input adapter connected'
    )

class DisconnectInputResponse(BaseModel):
    success: bool
    message: str
    
@router.post('/disconnect, response_model=DisconnectInputResponse')
async def disconnect_input(state: Annotated[AppState, Depends(get_state)]):
    """
    disconnect active input adapter. does nothing if nothing connected
    """
    if state.input is None:
        return DisconnectInputResponse(success=False, message='No input adapter is connected')
    
    name = state.input_name
    state.input_reset()
    
    logger.info(f'input/disconnect: disconnected {name}')
    return DisconnectInputResponse(success=True, message=f'{name} input adapter disconnected')