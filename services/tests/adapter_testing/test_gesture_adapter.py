import asyncio
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.commands.command import CommandType
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


def make_adapter():
	adapter = GestureAdapter(min_stable_frames=2)
	adapter.set_handler(MagicMock())
	return adapter


def emitted(adapter):
	return adapter._handler.call_args[0][0]


def test_resolve_single_hand():
	"""tests if the one handed map kicks in after other two find no match"""
	adapter = make_adapter()

	cmd = adapter._resolve({'RIGHT': 'OPEN_PALM'})

	assert cmd is CommandType.HOVER


def test_resolve_asymmetrical():
	"""asymmetrical resolves first"""
	adapter = make_adapter()

	cmd = adapter._resolve(
		{
			'RIGHT': 'ONE_FINGER',
			'LEFT': 'OPEN_PALM',
		}
	)
	assert cmd is CommandType.ROTATE_CW


def test_resolve_symmetrical():
	"""same as the last one honestly"""
	adapter = make_adapter()

	cmd = adapter._resolve(
		{
			'RIGHT': 'FIST',
			'LEFT': 'FIST',
		}
	)
	assert cmd is CommandType.LAND


def test_requires_stable_frames():
	"""reject if we dont get two stable frames in a row for safety"""
	adapter = make_adapter()

	payload = frame(hand('RIGHT', 'OPEN_PALM'))

	adapter._process_payload(payload)
	adapter._handler.assert_not_called()

	adapter._process_payload(payload)
	adapter._handler.assert_called_once()

	assert emitted(adapter).type is CommandType.HOVER


def test_low_confidence_ignored():
	"""gatekeep, gaslight, girlboss"""
	adapter = make_adapter()

	adapter._process_payload(frame(hand('RIGHT', 'OPEN_PALM', confidence=0.67)))

	adapter._handler.assert_not_called()
	assert adapter._stable_count == 0


def test_unknown_gesture_resets_stability():
	"""resets to 0 values since we need multiple in a row"""
	adapter = make_adapter()

	adapter._stable_key = 'HOVER'
	adapter._stable_count = 5

	adapter._process_payload(frame(hand('RIGHT', 'JONASI')))

	assert adapter._stable_key is None
	assert adapter._stable_count == 0


def test_idle_hover():
	"""hovers after some time passes"""
	adapter = make_adapter()

	adapter._last_gesture_ts = time.monotonic() - 10

	adapter._check_idle()

	adapter._handler.assert_called_once()

	cmd = emitted(adapter)

	assert cmd.type is CommandType.HOVER
	assert cmd.source == 'gesture-idling'


def test_idle_hover_only_once():
	"""hover should now only happen once. was spamming before"""
	adapter = make_adapter()

	adapter.last_resolution = 'idle-hover'
	adapter._last_gesture_ts = time.monotonic() - 10

	adapter._check_idle()

	adapter._handler.assert_not_called()


def test_last_confidence_updated():
	"""val updates when updated man idk i just need coverage"""
	adapter = make_adapter()

	adapter._process_payload(frame(hand('RIGHT', 'OPEN_PALM', 0.97)))

	assert adapter.last_confidence == 0.97


def test_reset_stability():
	adapter = make_adapter()

	adapter._stable_key = 'Sherk'
	adapter._stable_count = 7

	adapter._reset_stability()

	assert adapter._stable_key is None
	assert adapter._stable_count == 0


@pytest.mark.asyncio
async def test_start_subscribes():
	adapter = GestureAdapter()

	queue = asyncio.Queue()
	stream = MagicMock()
	stream.subscribe = AsyncMock(return_value=queue)

	with patch.object(adapter, '_get_stream', return_value=stream):
		with patch('asyncio.create_task') as create_task:
			fake_task = MagicMock()
			create_task.return_value = fake_task

			await adapter.start()

	stream.subscribe.assert_awaited_once()
	assert adapter._queue is queue
	assert adapter._task is fake_task


@pytest.mark.asyncio
async def test_stop_unsubscribes():
	"""this adapter needs to cleanup so this actually needs to be tested"""
	adapter = GestureAdapter()

	queue = asyncio.Queue()
	adapter._queue = queue

	async def forever():
		await asyncio.Event().wait()

	adapter._task = asyncio.create_task(forever())

	stream = MagicMock()
	stream.unsubscribe = AsyncMock()

	with patch.object(adapter, '_get_stream', return_value=stream):
		await adapter.stop()

	stream.unsubscribe.assert_awaited_once_with(queue)
	assert adapter._task is None


@pytest.mark.asyncio
async def test_handle_message_drops():
	"""should accept anything but do nothing"""
	adapter = GestureAdapter()

	await adapter.handle_message({'Some bullshit': True})
