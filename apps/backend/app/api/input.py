# apps/backend/app/api/input.py

"""
All input routes, REST and WebSockets

REST:
	POST input/connect
	POST input/disconnect
	GET input/status - return a snapshot of adapter state

WebSockets:
	input/ws/keyboard - keyboard input listener
	input/ws/gamepad - gamepad state listener
	input/ws/gesture/status - adapter status snapshots (debug)
	input/ws/gesture/events - one message per gesture CHANGE, for command history

"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.input.gesture_events import gesture_events
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
		from services.input.sources.gesture_adapter import GestureAdapter

		return GestureAdapter()

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
		previous = state.input
		state.input_reset()

		if hasattr(previous, 'stop'):
			await previous.stop()

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
	adapter = state.input
	state.input_reset()

	# GestureAdapter and likely more in the future need to clean up
	if hasattr(adapter, 'stop'):
		await adapter.stop()

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


@router.get('/gesture/events')
async def gesture_event_history():
	"""
	REST fallback for the gesutre history, oldest first
	Same payloads the WebScoket below pushes
	"""
	return {'events': gesture_events.history()}


# gonna need more of this in demo 3 I feel. testing it here
class GestureConfigRequest(BaseModel):
	idle_timeout_s: float = 3.0
	min_confidence: float = 0.85
	min_stable_frames: int = 2


@router.post('/gesture/config')
async def configure_gesture(
	body: GestureConfigRequest,
	state: Annotated[AppState, Depends(get_state)],
):
	"""
	Tune the adapter on the fly. probably won't be integrated, but
	a proof of concept for future modifications.
	"""

	if state.input_name != 'gesture' or state.input is None:
		return {'ok': False, 'message': 'GestureAdapter is not the active input source'}

	adapter = state.input
	adapter._idle_timeout = body.idle_timeout_s
	adapter._min_confidence = body.min_confidence
	adapter._min_stable_frames = body.min_stable_frames

	return {'ok': True, 'applied': body.model_dump()}


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


# mostly just for debug since this part is finicky
@router.websocket('/ws/gesture/status')
async def gesture_status(websocket: WebSocket, state: Annotated[AppState, Depends(get_state)]):
	"""
	push gesture adapter status to the client whenever a change occurs
	"""
	await websocket.accept()
	logger.info('input/ws/gesture/status: client connected')

	last_sent: dict | None = None

	try:
		while True:
			await asyncio.sleep(0.5)  # adjust as needed for polling rate

			if state.input_name != 'gesture' or state.input is None:
				snapshot = {'active': False}
			else:
				adapter = state.input
				snapshot = {
					'active': True,
					'last_gesture': adapter.last_resolution,
					'last_confidence': adapter.last_confidence,
					'idle_timeout_s': adapter._idle_timeout,
					'min_confidence': adapter._min_confidence,
				}

			# only send new snapshots
			if snapshot != last_sent:
				await websocket.send_json(snapshot)
				last_sent = snapshot

	except WebSocketDisconnect:
		logger.info('/input/ws/gesture/status: client disconnected')

	except Exception as ex:
		logger.exception('input/ws/gesture/status: error - %s', ex)


async def _send_gesture_events(websocket: WebSocket, queue: asyncio.Queue) -> None:
	"""Backfill recent history, then push each new transition as it happens"""
	await websocket.send_json({'type': 'gesture_event_history', 'events': gesture_events.history()})
	while True:
		event = await queue.get()
		await websocket.send_json(event)


async def _watch_for_disconnect(websocket: WebSocket) -> None:
	"""
	This is a server push stream, so nothing useful arrives from the client
	We still have to read from the socket to notice a dsiconnect while sender task
	is parked on queue.get()
	"""
	with contextlib.suppress(Exception):
		while True:
			await websocket.receive()


@router.websocket('/ws/gesture/events')
async def gesture_event_stream(websocket: WebSocket) -> None:
	"""
	One JSON message per gesture -> command transition

	Holding gesture doesnt repeat here

	On connect:
		{"type": "gesture_event_history"m "events": [...oldest first...]}

	Then, per change:
		{
			"type": "gesture_event",
			"id": 12,
			"commands": "MOVE_UP",
			"hands": {'RIGHT", "ONE_FINGER"},
			"confidence": 0.94,
			"source": "gesture",
			"timestamp": 1719831600.123
		}

	source is 'gesture' for a recognised, or 'gesture-idling' for the safety hover
	the adapter fires after idle_timeout_s with no input
	"""
	await websocket.accept()
	queue = await gesture_events.subscribe()
	logger.info(
		'input/ws/gesture/events: clients connected (total = %d)', gesture_events.subscriber_count
	)

	try:
		sender = asyncio.create_task(
			_send_gesture_events(websocket, queue), name='gesture-events-send'
		)
		watcher = asyncio.create_task(_watch_for_disconnect(websocket), name='gesture-events-match')
		done, pending = await asyncio.wait({sender, watcher}, return_when=asyncio.FIRST_COMPLETED)

		for task in pending:
			task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await task
		for task in done:
			with contextlib.suppress(Exception):
				task.result()

	except WebSocketDisconnect:
		logger.info('input/ws/gesture/events: client disconnected')
	except Exception as ex:
		logger.exception('input/ws/gesture/events: error -%s', ex)
	finally:
		await gesture_events.unsubscribe(queue)
