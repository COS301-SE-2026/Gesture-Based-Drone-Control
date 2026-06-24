# tests/integration_testing/test_keyboard_to_dummy_drone.py

"""
Integration test:
KeyboardAdapter -> Command emission -> DummyDroneAdapter.execute()

This validates that:
- browser-style WS keyboard messages are converted correctly
- commands propagate through the handler pipeline
- DroneAdapter.execute() routes correctly
- DummyDroneAdapter responds as expected
"""

from unittest.mock import AsyncMock

import pytest

from services.commands.command import CommandType
from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter
from services.input.sources.keyboard_adapter import KeyboardAdapter


@pytest.mark.asyncio
async def test_keyboard_takeoff_to_dummy_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	# spy on actual implementation
	drone.takeoff = AsyncMock()

	adapter = KeyboardAdapter()

	# integration point
	adapter.set_handler(lambda cmd: pytest.run(asyncio=True)(drone.execute(cmd)))

	# easier alternative:
	async def handler(cmd):
		await drone.execute(cmd)

	# sync wrapper because _emit() is synchronous
	def emit_handler(cmd):
		import asyncio

		asyncio.create_task(handler(cmd))  # NOSONAR if i assign to var lint fails

	adapter.set_handler(emit_handler)

	adapter.handle_message(
		{
			'key': 't',
			'event': 'keydown',
		}
	)

	# allow scheduled task to execute
	import asyncio

	await asyncio.sleep(0.01)

	drone.takeoff.assert_awaited_once()


@pytest.mark.asyncio
async def test_keyboard_land_to_dummy_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	drone.land = AsyncMock()

	adapter = KeyboardAdapter()

	import asyncio

	async def handler(cmd):
		await drone.execute(cmd)

	adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

	adapter.handle_message(
		{
			'key': 'l',
			'event': 'keydown',
		}
	)

	await asyncio.sleep(0.01)  # was an issue before, tiny wait needed

	drone.land.assert_awaited_once()


@pytest.mark.asyncio
async def test_keyboard_move_forward_to_dummy_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	drone.move = AsyncMock()

	adapter = KeyboardAdapter()

	import asyncio

	async def handler(cmd):
		await drone.execute(cmd)

	adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

	adapter.handle_message(
		{
			'key': 'ArrowUp',
			'event': 'keydown',
		}
	)

	await asyncio.sleep(0.01)

	drone.move.assert_awaited_once()

	args = drone.move.await_args.args

	assert args[0] == CommandType.MOVE_FORWARD


@pytest.mark.asyncio
async def test_keyboard_hover_to_dummy_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	drone.hover = AsyncMock()

	adapter = KeyboardAdapter()

	import asyncio

	async def handler(cmd):
		await drone.execute(cmd)

	adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

	adapter.handle_message(
		{
			'key': ' ',
			'event': 'keydown',
		}
	)

	await asyncio.sleep(0.01)

	drone.hover.assert_awaited_once()


@pytest.mark.asyncio
async def test_keyboard_emergency_stop_to_dummy_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	drone.emergency_stop = AsyncMock()

	adapter = KeyboardAdapter()

	import asyncio

	async def handler(cmd):
		await drone.execute(cmd)

	adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

	adapter.handle_message(
		{
			'key': 'Escape',
			'event': 'keydown',
		}
	)

	await asyncio.sleep(0.01)

	drone.emergency_stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_keyboard_keyup_does_not_reach_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	drone.takeoff = AsyncMock()

	adapter = KeyboardAdapter()

	import asyncio

	async def handler(cmd):
		await drone.execute(cmd)

	adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

	adapter.handle_message(
		{
			'key': 't',
			'event': 'keyup',
		}
	)

	await asyncio.sleep(0.01)

	drone.takeoff.assert_not_awaited()


@pytest.mark.asyncio
async def test_keyboard_invalid_key_does_not_reach_drone():
	drone = DummyDroneAdapter()
	await drone.connect()

	drone.takeoff = AsyncMock()

	adapter = KeyboardAdapter()

	import asyncio

	async def handler(cmd):
		await drone.execute(cmd)

	adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

	adapter.handle_message(
		{
			'key': 'INVALID',
			'event': 'keydown',
		}
	)

	await asyncio.sleep(0.01)

	drone.takeoff.assert_not_awaited()
