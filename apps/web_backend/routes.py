# /apps/web_backend/routes.py

"""
Routes for the hosted web demo.

These mirror the request/response shapes of the desktop routes the browser
games use (apps/backend/app/api/game.py and input.py) so the existing frontend
hooks work unchanged, but every route is scoped to the caller's Session.

Only what the web demo needs is exposed:
	GET  /api/health
	POST /api/game/connect | /api/game/disconnect,  GET /api/game/status
	WS   /api/game/ws/commands
	POST /api/input/connect | /api/input/disconnect, GET /api/input/status
	WS   /api/input/ws/keyboard | /api/input/ws/gamepad

No camera, gestures, drone, AirSim, auth, analytics or leaderboard routes
exist here, so none of that can be triggered on the server.

The adapters themselves (GameAdapter, KeyboardAdapter, GamepadAdapter) are the
exact same classes the desktop app uses - only this thin routing layer differs.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from apps.web_backend.sessions import Session, http_session, ws_session
from services.drone_control.adapters.game_adapter import GameAdapter
from services.input.sources.gamepad_adapter import GamepadAdapter
from services.input.sources.input_adapter import InputAdapter
from services.input.sources.keyboard_adapter import KeyboardAdapter

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api')
game = APIRouter(prefix='/game', tags=['game'])
inp = APIRouter(prefix='/input', tags=['input'])

HttpSession = Annotated[Session, Depends(http_session)]
WsSession = Annotated[Session, Depends(ws_session)]

# only browser-driven inputs are allowed on the hosted demo
_INPUT_FACTORIES = {
	'keyboard': KeyboardAdapter,
	'gamepad': GamepadAdapter,
}


@router.get('/health')
async def health():
	return {'status': 'ok', 'mode': 'web'}


# Game


class GameConnectResponse(BaseModel):
	active: bool
	message: str


@game.post('/connect', response_model=GameConnectResponse)
async def game_connect(session: HttpSession):
	if session.adapter is not None:
		await session.adapter.disconnect()
		session.adapter = None

	adapter = GameAdapter()
	if not await adapter.connect():
		return GameConnectResponse(active=False, message='GameAdapter failed to connect')

	adapter.set_command_callback(session.broadcast)
	session.adapter = adapter
	return GameConnectResponse(active=True, message='Game adapter connected')


@game.post('/disconnect', response_model=GameConnectResponse)
async def game_disconnect(session: HttpSession):
	if session.adapter is None:
		return GameConnectResponse(active=False, message='No game adapter is connected')
	await session.adapter.disconnect()
	session.adapter = None
	return GameConnectResponse(active=False, message='Game adapter disconnected')


@game.get('/status')
async def game_status(session: HttpSession):
	active = session.adapter is not None
	return {'active': active, 'connected_clients': len(session.game_clients) if active else 0}


@game.websocket('/ws/commands')
async def game_commands(websocket: WebSocket, session: WsSession):
	await websocket.accept()
	session.game_clients.add(websocket)
	session.open_sockets += 1
	if session.adapter is not None:
		session.adapter.set_command_callback(session.broadcast)

	try:
		# the client never sends anything, this just notices the disconnect
		while True:
			await websocket.receive()
	except (WebSocketDisconnect, RuntimeError):
		pass
	finally:
		session.game_clients.discard(websocket)
		session.open_sockets -= 1
		session.touch()


# Input


class ConnectInputRequest(BaseModel):
	adapter: str = 'keyboard'
	session: Optional[str] = None


class ConnectInputResponse(BaseModel):
	connected: bool
	message: str
	adapter: str
	recognizer: Optional[str] = None
	session: Optional[str] = None


class DisconnectInputResponse(BaseModel):
	success: bool
	message: str


def _make_handler(session: Session):
	def handler(command):
		if session.adapter is None:
			return
		asyncio.create_task(session.adapter.execute(command))  # NOSONAR

	return handler


async def _stop(adapter: InputAdapter | None) -> None:
	if adapter is not None and hasattr(adapter, 'stop'):
		await adapter.stop()


@inp.post('/connect', response_model=ConnectInputResponse)
async def connect_input(body: ConnectInputRequest, session: HttpSession):
	factory = _INPUT_FACTORIES.get(body.adapter)
	if factory is None:
		return ConnectInputResponse(
			connected=False,
			adapter=body.adapter,
			message=f'{body.adapter!r} input is only available in the desktop app',
		)

	previous = session.input
	session.input_reset()
	await _stop(previous)

	adapter = factory()
	adapter.set_handler(_make_handler(session))
	await adapter.start()

	session.input = adapter
	session.input_name = body.adapter
	session.input_session = body.session or uuid.uuid4().hex
	return ConnectInputResponse(
		connected=True,
		adapter=body.adapter,
		message=f'{body.adapter} input adapter connected',
		session=session.input_session,
	)


@inp.post('/disconnect', response_model=DisconnectInputResponse)
async def disconnect_input(
	session: HttpSession,
	conn: Annotated[Optional[str], Query(alias='session')] = None,
):
	if session.input is None:
		return DisconnectInputResponse(success=False, message='No input adapter is connected')
	if conn is not None and conn != session.input_session:
		return DisconnectInputResponse(
			success=False, message='That input connection has already been superseded'
		)

	name, adapter = session.input_name, session.input
	session.input_reset()
	await _stop(adapter)
	return DisconnectInputResponse(success=True, message=f'{name} input adapter disconnected')


@inp.get('/status')
async def input_status(session: HttpSession):
	if session.input is None:
		return {'connected': False, 'adapter': 'None connected'}
	return {'connected': True, 'adapter': session.input_name}


async def _pump(websocket: WebSocket, session: Session, kind: str, echo: bool) -> None:
	"""Forward browser input messages to this session's adapter."""
	await websocket.accept()
	session.open_sockets += 1
	try:
		while True:
			data = await websocket.receive_json()
			session.touch()
			if session.input is None or session.input_name != kind or not isinstance(data, dict):
				continue
			await session.input.handle_message(data)
			if echo:
				await websocket.send_json(
					{'ok': True, 'key': data.get('key'), 'event': data.get('event')}
				)
	except WebSocketDisconnect:
		pass
	except Exception as ex:
		logger.warning('input/ws/%s: closing socket: %s', kind, ex)
	finally:
		session.open_sockets -= 1
		session.touch()


@inp.websocket('/ws/keyboard')
async def keyboard(websocket: WebSocket, session: WsSession):
	await _pump(websocket, session, 'keyboard', echo=True)


@inp.websocket('/ws/gamepad')
async def gamepad(websocket: WebSocket, session: WsSession):
	await _pump(websocket, session, 'gamepad', echo=False)


router.include_router(game)
router.include_router(inp)
