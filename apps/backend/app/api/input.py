# apps/backend/app/api/input.py

"""
All input routes, REST and WebSockets

REST:
	POST input/connect
	POST input/disconnect
	GET input/status - return a snapshot of adapter state

WebSockets:
	inputt/ws/keyboard - keyboard input listener

"""

from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/input', tags=['input'])


class ConnectInputRequest(BaseModel):
	adapter: str = 'dummy'  # dummy, keyboard...


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

	elif body.adapter == 'gamepad':
		from services.input.sources.gamepad_adapter import GamepadAdapter

		return GamepadAdapter()

	elif body.adapter == 'gesture':
		pass

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
			logger.warning(
				f'input handler: command {command.type.name} dropped, no drone connected'
			)
			return
		asyncio.create_task(  # NOSONAR
			state.adapter.execute(command)  # NOSONAR
		)  # NOSONAR

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

	logger.info('input/connect: connected to the adapter successfully')
	return ConnectInputResponse(
		connected=True, adapter=body.adapter, message=f'{state.input_name} input adapter connected'
	)


class DisconnectInputResponse(BaseModel):
	success: bool
	message: str


@router.post('/disconnect', response_model=DisconnectInputResponse)
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


@router.get('/status')
async def input_status(state: Annotated[AppState, Depends(get_state)]):
	"""
	Basic info on the current input adapter if its connected
	"""
	if state.input is None:
		return {'connected': False, 'adapter': 'None connected'}

	return {'connected': True, 'adapter': state.input_name}


# Websockets endpoints
# maintain a ws endpoint for each input method


@router.websocket('/ws/keyboard')
async def keyboard(websocket: WebSocket, state: Annotated[AppState, Depends(get_state)]):
	"""
	Receive browser events, forward them to the KeyboardAdapter

	{ "key": "ArrowUp", "event": "keydown" }
	{ "key": "ArrowUp", "event": "keyup" }

	Details are found in the KeyboardAdapter class itself at
	/services/input/sources/keyboard_adapter.py"

	If no keyboard, we keep the socket open but drop messages
	"""
	await websocket.accept()
	logger.info('input/ws/keyboard: client connected')

	try:
		while True:
			data = await websocket.receive_json()

			if state.input is None or state.input_name != 'keyboard':
				logger.debug('input/ws/keyboard: no keyboard adapter connected, ignoring message')
				continue
			# assume valid input... add better handling later
			await state.input.handle_message(data)
			await websocket.send_json(
				{'ok': True, 'key': data.get('key'), 'event': data.get('event')}
			)
	except WebSocketDisconnect:
		logger.info('input/ws/keyboard: client disconnected')
	except Exception as ex:
		logger.exception(f'input/ws/keyboard: error caught: {ex}')


@router.websocket('/ws/gamepad')
async def gamepad(websocket: WebSocket, state: Annotated[AppState, Depends(get_state)]):
	"""
	Receive snapshots of the controller state and forward them to the GamepadAdapter
	Should happen about once per frame, so 60fps or so.

	Format:
		{
			"left_x": 0.73, "left_y": -0.41,
			"right_x": 0.0, "right_y": 0.0,
			"ltrigger": 0.0, "rtrigger": 0.0,
			"a": false, "b": false, "x": false, "y": false,
			"lb": false, "rb": false,
			"up": false, "down": false, "left": false, "right": false,
			"start": false, "back": false, "lclick": false, "rclick": false
		}
	The browser should apply some cleaning to the data before sending.
	Messages are silently dropped if the adapter type is not 'gamepad'
	so we can keep the connection open even when an adapter is switched.
	"""
	await websocket.accept()
	logger.info('input/ws/gamepad: client connected')
	try:
		while True:
			data = await websocket.receive_json()

			if state.input is None or state.input_name != 'gamepad':
				logger.debug('input/ws/gamepad: no gamepad adapter connected, ignoring message')
				continue
			# assume valid input... add better handling later
			await state.input.handle_message(data)
	except WebSocketDisconnect:
		logger.info('input/ws/gamepad: client disconnected')
	except Exception as ex:
		logger.exception(f'input/ws/gamepad: error caught: {ex}')
