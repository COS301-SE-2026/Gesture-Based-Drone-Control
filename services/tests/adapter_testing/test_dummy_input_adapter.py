import pytest

from services.commands.command import CommandType
from services.input.sources.dummy_input_adapter import DummyInputAdapter


@pytest.mark.asyncio
async def test_dummy_input_adapter_start_sets_state():
	adapter = DummyInputAdapter()

	await adapter.start()

	assert adapter._started is True


def test_dummy_input_adapter_emits_takeoff():
	adapter = DummyInputAdapter()
	received = []

	adapter.set_handler(received.append)

	adapter.trigger_takeoff()

	assert len(received) == 1
	assert received[0].type == CommandType.TAKEOFF
	assert received[0].source == 'dummy-input'
	assert len(adapter.emitted) == 1


def test_dummy_input_adapter_emits_all_commands():
	adapter = DummyInputAdapter()
	received = []

	adapter.set_handler(received.append)

	adapter.trigger_land()
	adapter.trigger_hover()
	adapter.trigger_emergency_stop()

	assert [c.type for c in received] == [
		CommandType.LAND,
		CommandType.HOVER,
		CommandType.EMERGENCY_STOP,
	]


def test_dummy_input_adapter_emitted_list_tracks_commands():
	adapter = DummyInputAdapter()

	adapter.set_handler(lambda x: None)

	adapter.trigger_takeoff()
	adapter.trigger_land()

	assert len(adapter.emitted) == 2
