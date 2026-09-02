from unittest.mock import AsyncMock, patch

import pytest

from services.commands.command import AnalogInput, CommandType
from services.drone_control.adapters.game_adapter import GameAdapter, TelemetryData


@pytest.mark.asyncio
async def test_game_adapter_initial():
	"""default values"""
	adapter = GameAdapter()
	assert adapter._callback is None


@pytest.mark.asyncio
async def test_set_command_callback():
	"""kinda obvious isnt it"""
	adapter = GameAdapter()
	callback = AsyncMock()
	adapter.set_command_callback(callback)
	assert adapter._callback is callback


@pytest.mark.asyncio
async def test_clear_command_callback():
	adapter = GameAdapter()
	adapter._callback = AsyncMock()
	adapter.clear_command_callback()
	assert adapter._callback is None


# most of these are stubbed or limited for inheritence reasons
@pytest.mark.asyncio
async def test_connect():
	adapter = GameAdapter()
	result = await adapter.connect()
	assert result is True


@pytest.mark.asyncio
async def test_disconnect():
	adapter = GameAdapter()
	adapter._callback = AsyncMock()
	await adapter.disconnect()
	assert adapter._callback is None


@pytest.mark.asyncio
async def test_forward_with_callback():
	adapter = GameAdapter()
	callback = AsyncMock()
	adapter.set_command_callback(callback)

	payload = {'command': 'TEST'}
	await adapter._forward(payload)

	callback.assert_awaited_once_with(payload)


@pytest.mark.asyncio
async def test_forward_without_callback(caplog):
	adapter = GameAdapter()
	assert adapter._callback is None

	with caplog.at_level('INFO'):
		await adapter._forward({'command': 'TEST'})

	assert 'no callback registered' in caplog.text


@pytest.mark.asyncio
async def test_takeoff():
	adapter = GameAdapter()
	with patch.object(adapter, '_forward', AsyncMock()) as mock_forward:
		await adapter.takeoff()
		mock_forward.assert_awaited_once_with({'command': 'TAKEOFF'})


@pytest.mark.asyncio
async def test_land():
	adapter = GameAdapter()
	with patch.object(adapter, '_forward', AsyncMock()) as mock_forward:
		await adapter.land()
		mock_forward.assert_awaited_once_with({'command': 'LAND'})


@pytest.mark.asyncio
async def test_hover():
	adapter = GameAdapter()
	with patch.object(adapter, '_forward', AsyncMock()) as mock_forward:
		await adapter.hover()
		mock_forward.assert_awaited_once_with({'command': 'HOVER'})


@pytest.mark.asyncio
async def test_emergency_stop():
	adapter = GameAdapter()
	with patch.object(adapter, '_forward', AsyncMock()) as mock_forward:
		await adapter.emergency_stop()
		mock_forward.assert_awaited_once_with({'command': 'EMERGENCY_STOP'})


@pytest.mark.asyncio
async def test_move():
	adapter = GameAdapter()
	with patch.object(adapter, '_forward', AsyncMock()) as mock_forward:
		await adapter.move(CommandType.MOVE_FORWARD)
		mock_forward.assert_awaited_once_with({'command': 'MOVE_FORWARD'})


@pytest.mark.asyncio
async def test_analog():
	adapter = GameAdapter()
	analog_input = AnalogInput(
		left_x=0.5,
		left_y=0.0,
		right_x=1.0,
		right_y=-0.5,
		ltrigger=0.0,
		rtrigger=1.0,
	)
	with patch.object(adapter, '_forward', AsyncMock()) as mock_forward:
		await adapter.analog(analog_input)
		mock_forward.assert_awaited_once_with(
			{
				'command': 'ANALOG',
				'left_x': 0.5,
				'left_y': 0.0,
				'right_x': 1.0,
				'right_y': -0.5,
				'ltrigger': 0.0,
				'rtrigger': 1.0,
			}
		)


@pytest.mark.asyncio
async def test_get_telemetry():
	adapter = GameAdapter()
	telemetry = await adapter.get_telemetry()
	assert isinstance(telemetry, TelemetryData)
	assert telemetry.source == 'game'
