from math import isclose

import pytest

from services.commands.command import AnalogInput, CommandType
from services.input.sources.gamepad_adapter import DEADZONE, GamepadAdapter


# create the adapter
@pytest.fixture
def adapter():
	a = GamepadAdapter()
	received = []
	a.set_handler(received.append)
	return a, received


@pytest.mark.asyncio
async def test_start():
	adapter = GamepadAdapter()
	await adapter.start()


@pytest.mark.asyncio
async def test_takeoff_button(adapter):
	gamepad, received = adapter

	await gamepad.handle_message({'a': True})

	assert received[0].type is CommandType.TAKEOFF


@pytest.mark.asyncio
async def test_hover_button(adapter):
	gamepad, received = adapter

	await gamepad.handle_message({'x': True})

	assert received[0].type is CommandType.HOVER


@pytest.mark.asyncio
async def test_multiple_inputs(adapter):
	"""full controller snapshot with multiple inputs should be handled separately"""
	gamepad, received = adapter

	await gamepad.handle_message(
		{
			'a': True,
			'b': True,
			'y': True,
		}
	)

	assert len(received) == 3

	assert CommandType.TAKEOFF in [c.type for c in received]
	assert CommandType.LAND in [c.type for c in received]
	assert CommandType.EMERGENCY_STOP in [c.type for c in received]


@pytest.mark.asyncio
async def test_ignore_unknown_button(adapter):
	gamepad, received = adapter

	await gamepad.handle_message({'jonasi': True})

	assert received == []


@pytest.mark.asyncio
async def test_deadzone(adapter):
	"""small negligible inputs should be dropped"""
	gamepad, received = adapter

	await gamepad.handle_message(
		{
			'left_x': DEADZONE / 2,
			'left_y': 0.0,
			'right_x': 0.0,
			'right_y': DEADZONE - 0.001,
			'ltrigger': DEADZONE / 1.01,
			'rtrigger': 0.0,
		}
	)

	assert received == []


@pytest.mark.asyncio
async def test_analog_command_emitted(adapter):
	"""big inputs go through"""
	gamepad, received = adapter

	await gamepad.handle_message(
		{
			'left_x': 0.5,
			'left_y': -1.0,
			'right_x': 0.25,
			'right_y': 0.75,
			'ltrigger': 0.1,
			'rtrigger': 0.0,
		}
	)

	assert len(received) == 1

	cmd = received[0]

	assert cmd.type is CommandType.ANALOG

	analog = cmd.payload['input']

	assert isinstance(analog, AnalogInput)
	assert isclose(analog.left_x, 0.5)
	assert isclose(analog.left_y, -1.0)
	assert isclose(analog.right_x, 0.25)
	assert isclose(analog.right_y, 0.75)
	assert isclose(analog.ltrigger, 0.0)  # deadzoned
	assert isclose(analog.rtrigger, 0.0)


@pytest.mark.asyncio
async def test_deadzone_zeroes_small(adapter):
	gamepad, received = adapter

	await gamepad.handle_message(
		{
			'left_x': 0.5,
			'left_y': DEADZONE / 2,
			'right_x': 0.0,
			'right_y': 0.0,
			'ltrigger': DEADZONE / 3,
			'rtrigger': 0.0,
		}
	)

	analog = received[0].payload['input']

	assert isclose(analog.left_x, 0.5)
	assert isclose(analog.left_y, 0.0)
	assert isclose(analog.ltrigger, 0.0)


@pytest.mark.asyncio
async def test_non_dict_msg_ignore(adapter):
	gamepad, received = adapter

	await gamepad.handle_message(
		"\
    SHREK\
    Written by William Steig & Ted Elliott SHREK\
    Once upon a time there was a lovely \
    princess. But she had an enchantment \
    upon her of a fearful sort which could \
    only be broken by love's first kiss. \
    She was locked away in a castle guarded \
    by a terrible fire-breathing dragon. \
    Many brave knights had attempted to \
    free her from this dreadful prison \
    "
	)

	assert received == []


def test_get_bindings():
	"""this is literally just for coverage"""
	adapter = GamepadAdapter()

	bindings = adapter.get_bindings()

	assert bindings['a'] == 'TAKEOFF'
	assert bindings['b'] == 'LAND'
	assert bindings['x'] == 'HOVER'
	assert bindings['y'] == 'EMERGENCY_STOP'
