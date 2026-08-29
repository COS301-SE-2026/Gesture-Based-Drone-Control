from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.input import (
	ConnectInputRequest,
	_build_input_adapter,
	_make_handler,
	router,
)
from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.commands.command import Command, CommandType
from services.input.gesture_events import gesture_events


@pytest.fixture
def client():
	app = FastAPI()
	app.include_router(router)
	app.dependency_overrides[get_state] = lambda: AppState()
	gesture_events.clear()
	yield TestClient(app)
	gesture_events.clear()


@pytest.mark.parametrize(
	'name, expected',
	[
		('dummy', 'DummyInputAdapter'),
		('keyboard', 'KeyboardAdapter'),
		('gamepad', 'GamepadAdapter'),
		('gesture', 'GestureAdapter'),
	],
)
def test_build_input_adapter_returns_each_type(name, expected):
	adapter = _build_input_adapter(ConnectInputRequest(adapter=name))
	assert type(adapter).__name__ == expected


def test_build_input_adapter_rejects_unknown():
	with pytest.raises(ValueError, match='invalid input adapter'):
		_build_input_adapter(ConnectInputRequest(adapter='telepathy'))


# _make_handler: both branches


def test_handler_drops_command_when_no_drone():
	state = AppState()
	state.adapter = None
	# must not raise; the command is simply dropped with a warning
	_make_handler(state)(Command(type=CommandType.MOVE_UP, source='gesture'))


async def test_handler_executes_command_when_drone_connected():
	state = AppState()
	state.adapter = MagicMock(execute=AsyncMock())

	_make_handler(state)(Command(type=CommandType.LAND, source='gesture'))

	# handler schedules execute() as a task, so let the loop run it
	import asyncio

	await asyncio.sleep(0)
	state.adapter.execute.assert_awaited_once()


# GET /input/gesture/events


def test_gesture_event_history_empty(client):
	assert client.get('/input/gesture/events').json() == {'events': []}


def test_gesture_event_history_returns_recorded_events(client):
	gesture_events.record(command='MOVE_UP', hands={'RIGHT': 'ONE_FINGER'})

	events = client.get('/input/gesture/events').json()['events']

	assert len(events) == 1
	assert events[0]['command'] == 'MOVE_UP'


# WS /input/ws/gesture/events


def test_gesture_event_stream_sends_backlog_then_live_events(client):
	gesture_events.record(command='TAKEOFF', hands={'RIGHT': 'THREE_FINGERS'})

	with client.websocket_connect('/input/ws/gesture/events') as ws:
		backlog = ws.receive_json()
		assert backlog['type'] == 'gesture_event_history'
		assert [e['command'] for e in backlog['events']] == ['TAKEOFF']

		gesture_events.record(command='MOVE_DOWN', hands={'RIGHT': 'TWO_FINGERS'})

		live = ws.receive_json()
		assert live['type'] == 'gesture_event'
		assert live['command'] == 'MOVE_DOWN'
		assert live['hands'] == {'RIGHT': 'TWO_FINGERS'}


def test_gesture_event_stream_unsubscribes_on_disconnect(client):
	with client.websocket_connect('/input/ws/gesture/events') as ws:
		ws.receive_json()
		assert gesture_events.subscriber_count == 1

	assert gesture_events.subscriber_count == 0


def test_gesture_event_stream_survives_send_failure(client):
	"""A socket that dies mid-send is logged and cleaned up, not propagated."""
	with patch.object(gesture_events, 'history', side_effect=RuntimeError('socket gone')):
		with client.websocket_connect('/input/ws/gesture/events'):
			pass

	assert gesture_events.subscriber_count == 0
