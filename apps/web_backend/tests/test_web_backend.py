# /apps/web_backend/tests/test_web_backend.py

"""
Tests for the hosted web demo backend.

The important property: two browser tabs (two session ids) never affect
each other. Run from the repo root:
    pytest apps/web_backend/tests
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from apps.web_backend.main import app

SID_A = 'aaaaaaaa-0000-4000-8000-000000000001'
SID_B = 'bbbbbbbb-0000-4000-8000-000000000002'


@pytest.fixture
def client():
	with TestClient(app) as c:
		yield c


def _h(sid: str) -> dict[str, str]:
	return {'X-Session-Id': sid}


def _start(client: TestClient, sid: str, adapter: str = 'keyboard') -> None:
	assert client.post('/api/game/connect', headers=_h(sid)).json()['active'] is True
	res = client.post('/api/input/connect', headers=_h(sid), json={'adapter': adapter}).json()
	assert res['connected'] is True


def test_health(client):
	assert client.get('/api/health').json()['status'] == 'ok'


def test_rejects_missing_or_bad_session(client):
	assert client.post('/api/game/connect').status_code == 400
	assert client.post('/api/game/connect', headers=_h('bad id!')).status_code == 400


def test_desktop_only_routes_do_not_exist(client):
	for path in ('/api/auth/login', '/api/drone/status', '/api/gestures/recognizer'):
		assert client.get(path, headers=_h(SID_A)).status_code in (404, 405)


def test_gesture_input_is_refused(client):
	res = client.post('/api/input/connect', headers=_h(SID_A), json={'adapter': 'gesture'})
	assert res.json()['connected'] is False


def test_commands_only_reach_their_own_session(client):
	_start(client, SID_A)
	_start(client, SID_B)

	with (
		client.websocket_connect(f'/api/game/ws/commands?sid={SID_A}') as game_a,
		client.websocket_connect(f'/api/game/ws/commands?sid={SID_B}') as game_b,
		client.websocket_connect(f'/api/input/ws/keyboard?sid={SID_A}') as kb_a,
		client.websocket_connect(f'/api/input/ws/keyboard?sid={SID_B}') as kb_b,
	):
		kb_a.send_json({'key': 'ArrowUp', 'event': 'keydown'})
		kb_a.receive_json()  # echo
		cmd_a = game_a.receive_json()

		kb_b.send_json({'key': 't', 'event': 'keydown'})
		kb_b.receive_json()
		cmd_b = game_b.receive_json()

	# each game only ever saw its own player's command
	assert cmd_a != cmd_b
	assert 'FORWARD' in str(cmd_a).upper()
	assert 'TAKEOFF' in str(cmd_b).upper()


def test_one_session_connecting_does_not_disconnect_another(client):
	_start(client, SID_A)
	_start(client, SID_B, adapter='gamepad')

	# B (re)connecting must leave A untouched
	assert client.post('/api/game/connect', headers=_h(SID_B)).json()['active'] is True
	assert client.get('/api/game/status', headers=_h(SID_A)).json()['active'] is True
	assert client.get('/api/input/status', headers=_h(SID_A)).json()['adapter'] == 'keyboard'

	client.post('/api/input/disconnect', headers=_h(SID_B))
	assert client.get('/api/input/status', headers=_h(SID_A)).json()['connected'] is True
	assert client.get('/api/input/status', headers=_h(SID_B)).json()['connected'] is False


def test_session_cap(client):
	store = app.state.sessions
	original = store.max_sessions
	store.max_sessions = len(store)
	try:
		res = client.post('/api/game/connect', headers=_h('cccccccc-0000-4000-8000-00000000000c'))
		assert res.status_code == 503
	finally:
		store.max_sessions = original


async def test_idle_sessions_are_pruned():
	from apps.web_backend.sessions import SessionStore

	store = SessionStore(max_sessions=5, idle_timeout_s=0)
	store.get_or_create(SID_A)
	assert await store.prune() == 1
	assert len(store) == 0
