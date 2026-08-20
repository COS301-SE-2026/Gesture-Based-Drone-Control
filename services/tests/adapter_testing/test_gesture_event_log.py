"""
Tests for the change-only gesture history.

The point of all of this: holding a gesture keeps commanding the drone every
frame, but only writes ONE row to the history.
"""

import time
from types import SimpleNamespace
from unittest.mock import MagicMock

from services.commands.command import CommandType
from services.input.gesture_events import GestureEventLog
from services.input.sources.gesture_adapter import GestureAdapter

# helper functions


def hand(side: str, gesture: str, confidence: float = 0.95):
	return SimpleNamespace(
		handedness=side,
		gesture=gesture,
		confidence=confidence,
	)


def frame(*hands):
	return SimpleNamespace(hands=list(hands))


def make_adapter(log: GestureEventLog, **kwargs):
	adapter = GestureAdapter(min_stable_frames=2, event_log=log, **kwargs)
	adapter.set_handler(MagicMock())
	return adapter


def hold(adapter, frames: int, *hands):
	for _ in range(frames):
		adapter._process_payload(frame(*hands))


def commands(log: GestureEventLog):
	return [event['command'] for event in log.history()]


# tests


def test_held_gesture_logs_once_but_keeps_commanding():
	"""5 seconds of ONE_FINGER at 25fps: 125 commands, 1 history row"""
	log = GestureEventLog()
	adapter = make_adapter(log)

	hold(adapter, 125, hand('RIGHT', 'ONE_FINGER'))

	assert adapter._handler.call_count == 124  # first frame is the stability gate
	assert commands(log) == ['MOVE_UP']


def test_change_of_gesture_adds_one_row():
	"""gesture 1 for 5s then gesture 2 for 3s gives exactly two rows"""
	log = GestureEventLog()
	adapter = make_adapter(log)

	hold(adapter, 125, hand('RIGHT', 'ONE_FINGER'))
	hold(adapter, 75, hand('RIGHT', 'TWO_FINGERS'))

	assert commands(log) == ['MOVE_UP', 'MOVE_DOWN']


def test_dropped_frame_mid_hold_does_not_duplicate():
	"""a brief detection dropout is not a new gesture"""
	log = GestureEventLog()
	adapter = make_adapter(log, release_frames=5)

	hold(adapter, 30, hand('RIGHT', 'ONE_FINGER'))
	hold(adapter, 2)  # no hands for two frames, under the release threshold
	hold(adapter, 30, hand('RIGHT', 'ONE_FINGER'))

	assert commands(log) == ['MOVE_UP']


def test_released_then_repeated_gesture_logs_again():
	"""same gesture after a proper release is a genuinely new event"""
	log = GestureEventLog()
	adapter = make_adapter(log, release_frames=5)

	hold(adapter, 30, hand('RIGHT', 'ONE_FINGER'))
	hold(adapter, 10)  # hands out of shot long enough to count as released
	hold(adapter, 30, hand('RIGHT', 'ONE_FINGER'))

	assert commands(log) == ['MOVE_UP', 'MOVE_UP']


def test_event_payload_shape():
	"""the frontend depends on these keys"""
	log = GestureEventLog()
	adapter = make_adapter(log)

	hold(adapter, 10, hand('RIGHT', 'TWO_FINGERS'), hand('LEFT', 'OPEN_PALM'))

	event = log.history()[0]
	assert event['type'] == 'gesture_event'
	assert event['command'] == CommandType.MOVE_RIGHT.name
	assert event['hands'] == {'RIGHT': 'TWO_FINGERS', 'LEFT': 'OPEN_PALM'}
	assert event['source'] == 'gesture'
	assert event['confidence'] == 0.95
	assert event['id'] == 1
	assert isinstance(event['timestamp'], float)


def test_low_confidence_hands_never_reach_the_log():
	log = GestureEventLog()
	adapter = make_adapter(log)

	hold(adapter, 20, hand('RIGHT', 'ONE_FINGER', confidence=0.2))

	assert log.history() == []


def test_idle_hover_is_logged_once():
	log = GestureEventLog()
	adapter = make_adapter(log, idle_timeout_s=0.0)

	adapter._last_gesture_ts = time.monotonic() - 10
	adapter._check_idle()
	adapter._check_idle()
	adapter._check_idle()

	assert commands(log) == ['HOVER']
	assert log.history()[0]['source'] == 'gesture-idling'


def test_history_is_bounded():
	log = GestureEventLog(history_size=3)

	for index in range(10):
		log.record(command=f'CMD_{index}', hands={'RIGHT': 'FIST'})

	assert commands(log) == ['CMD_7', 'CMD_8', 'CMD_9']


def test_ids_increase_monotonically():
	log = GestureEventLog()

	first = log.record(command='MOVE_UP')
	second = log.record(command='MOVE_DOWN')

	assert second['id'] == first['id'] + 1
