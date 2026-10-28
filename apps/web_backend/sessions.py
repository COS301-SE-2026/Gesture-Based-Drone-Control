# /apps/web_backend/sessions.py

"""
Per-visitor session state for the hosted web demo.

The desktop backend (apps/backend) keeps ONE global AppState because it only
ever serves the person sitting at that machine. The web demo is shared by
several laptops at once, so every browser tab gets its own Session instead.

Each tab generates a random session id (see apps/frontend/src/web/session.js)
and sends it with every request:
	REST       -> X-Session-Id header
	WebSocket  -> ?sid= query parameter (browsers cannot set WS headers)

A session holds exactly what the game + keyboard/gamepad flow needs:
	- the GameAdapter (the "drone" for the browser games)
	- the input adapter (keyboard or gamepad)
	- the game command sockets that belong to THIS tab only

Sessions are cheap (a few small Python objects) and are pruned once they
have no open sockets and have been idle for a while, so abandoned tabs do not
leak memory on the small EC2 instance.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from dataclasses import dataclass, field

from fastapi import HTTPException, Request, WebSocket, WebSocketException, status

from services.drone_control.adapters.game_adapter import GameAdapter
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

# tunables, overridable from the systemd unit / environment
MAX_SESSIONS = int(os.environ.get('GBDC_WEB_MAX_SESSIONS', '40'))
IDLE_TIMEOUT_S = float(os.environ.get('GBDC_WEB_IDLE_TIMEOUT_S', '600'))
PRUNE_INTERVAL_S = float(os.environ.get('GBDC_WEB_PRUNE_INTERVAL_S', '60'))

# uuid4 from crypto.randomUUID(), but accept any sane token
_SID_RE = re.compile(r'^[A-Za-z0-9-]{8,64}$')


@dataclass
class Session:
	id: str

	# the GameAdapter acting as this tab's "drone"
	adapter: GameAdapter | None = None

	# keyboard / gamepad adapter for this tab
	input: InputAdapter | None = None
	input_name: str | None = None
	input_session: str | None = None

	# game command sockets owned by this tab only
	game_clients: set[WebSocket] = field(default_factory=set)

	# number of currently open sockets of any kind (keeps the session alive)
	open_sockets: int = 0

	last_seen: float = field(default_factory=time.monotonic)

	def touch(self) -> None:
		self.last_seen = time.monotonic()

	def input_reset(self) -> None:
		self.input = None
		self.input_name = None
		self.input_session = None

	async def broadcast(self, payload: dict) -> None:
		"""Send a game command to this session's game sockets only."""
		dead: set[WebSocket] = set()
		for client in self.game_clients:
			try:
				await client.send_json(payload)
			except Exception:
				dead.add(client)
		self.game_clients.difference_update(dead)

	async def close(self) -> None:
		"""Tear everything down for this session."""
		if self.input is not None and hasattr(self.input, 'stop'):
			try:
				await self.input.stop()
			except Exception:
				logger.exception('session %s: error stopping input', self.id)
		self.input_reset()

		if self.adapter is not None:
			try:
				await self.adapter.disconnect()
			except Exception:
				logger.exception('session %s: error disconnecting game adapter', self.id)
		self.adapter = None
		self.game_clients.clear()


class SessionStore:
	def __init__(self, max_sessions: int = MAX_SESSIONS, idle_timeout_s: float = IDLE_TIMEOUT_S):
		self._sessions: dict[str, Session] = {}
		self.max_sessions = max_sessions
		self.idle_timeout_s = idle_timeout_s
		self._prune_task: asyncio.Task | None = None

	def __len__(self) -> int:
		return len(self._sessions)

	def get(self, sid: str) -> Session | None:
		return self._sessions.get(sid)

	def get_or_create(self, sid: str) -> Session | None:
		"""Return the session, creating it if there is room. None means full."""
		session = self._sessions.get(sid)
		if session is None:
			if len(self._sessions) >= self.max_sessions:
				return None
			session = Session(id=sid)
			self._sessions[sid] = session
			logger.info('session %s created (%d active)', sid[:8], len(self._sessions))
		session.touch()
		return session

	async def prune(self) -> int:
		"""Drop sessions with no open sockets that have been idle too long."""
		now = time.monotonic()
		stale = [
			s
			for s in self._sessions.values()
			if s.open_sockets <= 0 and now - s.last_seen > self.idle_timeout_s
		]
		for s in stale:
			self._sessions.pop(s.id, None)
			await s.close()
		if stale:
			logger.info('pruned %d idle sessions (%d active)', len(stale), len(self._sessions))
		return len(stale)

	async def _prune_loop(self) -> None:
		while True:
			await asyncio.sleep(PRUNE_INTERVAL_S)
			try:
				await self.prune()
			except Exception:
				logger.exception('session prune failed')

	def start(self) -> None:
		if self._prune_task is None:
			self._prune_task = asyncio.create_task(self._prune_loop())

	async def shutdown(self) -> None:
		if self._prune_task is not None:
			self._prune_task.cancel()
			self._prune_task = None
		for s in list(self._sessions.values()):
			await s.close()
		self._sessions.clear()


def _valid_sid(sid: str | None) -> bool:
	return bool(sid) and bool(_SID_RE.match(sid))


# FastAPI dependencies


def http_session(request: Request) -> Session:
	sid = request.headers.get('x-session-id') or request.query_params.get('sid')
	if not _valid_sid(sid):
		raise HTTPException(status_code=400, detail='Missing or invalid session id')
	store: SessionStore = request.app.state.sessions
	session = store.get_or_create(sid)
	if session is None:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail='The demo is full right now, please try again in a moment',
		)
	return session


def ws_session(websocket: WebSocket) -> Session:
	sid = websocket.query_params.get('sid')
	if not _valid_sid(sid):
		raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason='invalid session')
	store: SessionStore = websocket.app.state.sessions
	session = store.get_or_create(sid)
	if session is None:
		raise WebSocketException(code=status.WS_1013_TRY_AGAIN_LATER, reason='demo full')
	return session
