import logging

import pytest
from services.input.sources.keyboard_adapter import KEY_MAP, KeyboardAdapter


@pytest.mark.asyncio
async def test_keyboard_adapter_start_noop(caplog):
	adapter = KeyboardAdapter()

	caplog.set_level(logging.INFO)

	await adapter.start()

	assert 'ready' in caplog.text.lower()


def test_keyboard_keydown_mapping_all_keys():
	adapter = KeyboardAdapter()
	received = []

	adapter.set_handler(received.append)

	for key, expected in KEY_MAP.items():
		adapter.handle_message({'key': key, 'event': 'keydown'})

	assert len(received) == len(KEY_MAP)
	assert {c.type for c in received} == set(KEY_MAP.values())


def test_keyboard_ignores_keyup_events():
	adapter = KeyboardAdapter()
	received = []

	adapter.set_handler(received.append)

	adapter.handle_message({'key': 't', 'event': 'keyup'})
	adapter.handle_message({'key': 'ArrowUp', 'event': 'keyup'})

	assert len(received) == 0


def test_keyboard_ignores_unknown_key(caplog):
	adapter = KeyboardAdapter()
	adapter.set_handler(lambda x: None)
	caplog.set_level(logging.DEBUG)
	adapter.handle_message({'key': 'InvalidKey', 'event': 'keydown'})

	assert 'unmapped key' in caplog.text.lower()


def test_keyboard_handles_missing_key_field():
	adapter = KeyboardAdapter()
	received = []

	adapter.set_handler(received.append)

	adapter.handle_message({'event': 'keydown'})  # missing key

	assert len(received) == 0


def test_keyboard_handles_missing_event_field():
	adapter = KeyboardAdapter()
	received = []

	adapter.set_handler(received.append)

	adapter.handle_message({'key': 't'})  # missing event defaults to ''

	assert len(received) == 0


def test_keyboard_handles_non_dict_input(caplog):
	adapter = KeyboardAdapter()
	adapter.set_handler(lambda x: None)

	adapter.handle_message(None)

	assert 'non-dict' in caplog.text.lower()


def test_keyboard_get_bindings_structure():
	adapter = KeyboardAdapter()

	bindings = adapter.get_bindings()

	assert isinstance(bindings, dict)
	assert bindings['ArrowUp'] == 'MOVE_FORWARD'
	assert bindings['t'] == 'TAKEOFF'
	assert bindings[' '] == 'HOVER'
