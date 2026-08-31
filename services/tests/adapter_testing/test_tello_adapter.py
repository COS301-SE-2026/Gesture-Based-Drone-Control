from unittest.mock import MagicMock, patch

import pytest

with patch.dict(
	'sys.modules',
	{
		'djitellopy': MagicMock(),
	},
):
	from services.commands.command import AnalogInput, CommandType
	from services.drone_control.adapters.drone_adapter import TelemetryData
	from services.drone_control.adapters.tello_adapter import TelloAdapter


@pytest.fixture
def mock_tello():
	"""Create a mock Tello instance."""
	tello = MagicMock()
	tello.connect = MagicMock()
	tello.streamon = MagicMock()
	tello.get_frame_read = MagicMock(return_value=MagicMock())
	tello.land = MagicMock()
	tello.streamoff = MagicMock()
	tello.end = MagicMock()
	tello.takeoff = MagicMock()
	tello.send_rc_control = MagicMock()
	tello.emergency = MagicMock()
	tello.get_current_state = MagicMock(
		return_value={
			'tof': 100,  # 1 meter
			'vgx': 20,
			'vgy': 30,
			'vgz': 40,
			'yaw': 45,
			'bat': 85,
		}
	)
	tello.get_position = MagicMock(return_value=(1.2, 3.4))
	tello.send_command_with_return = MagicMock(return_value='70')
	return tello


@pytest.fixture
def adapter(mock_tello):
	"""Create a TelloAdapter instance with a mocked Tello."""
	with patch('services.drone_control.adapters.tello_adapter.Tello', return_value=mock_tello):
		adapter = TelloAdapter()
		# Manually inject the mock for easier testing
		adapter._tello = mock_tello
		return adapter


@pytest.mark.asyncio
async def test_connect_success(adapter, mock_tello):
	result = await adapter.connect()
	assert result is True
	mock_tello.connect.assert_called_once()
	# mock_tello.streamon.assert_called_once()
	# mock_tello.get_frame_read.assert_called_once()
	assert adapter._connected is True


@pytest.mark.asyncio
async def test_connect_failure(adapter, mock_tello):
	mock_tello.connect.side_effect = Exception('Connection failed')
	result = await adapter.connect()
	assert result is False
	mock_tello.streamon.assert_not_called()
	assert adapter._connected is False


@pytest.mark.asyncio
async def test_disconnect(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	await adapter.disconnect()
	mock_tello.land.assert_called_once()
	# mock_tello.streamoff.assert_called_once()
	mock_tello.end.assert_called_once()
	assert adapter._connected is False


@pytest.mark.asyncio
async def test_disconnect_not_connected(adapter, mock_tello):
	adapter._connected = False
	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.disconnect()
	mock_tello.land.assert_not_called()


@pytest.mark.asyncio
async def test_takeoff_not_connected(adapter, mock_tello):
	adapter._connected = False
	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.takeoff()
	mock_tello.takeoff.assert_not_called()


@pytest.mark.asyncio
async def test_takeoff(adapter, mock_tello):
	adapter._connected = True
	await adapter.takeoff()
	mock_tello.takeoff.assert_called_once()
	assert adapter._is_flying is True


@pytest.mark.asyncio
async def test_land(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	await adapter.land()
	mock_tello.land.assert_called_once()
	assert adapter._is_flying is False


@pytest.mark.asyncio
async def test_land_not_flying(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = False
	with pytest.raises(RuntimeError, match='Tello Drone is not flying.'):
		await adapter.land()
	mock_tello.land.assert_not_called()


async def test_move_valid_direction(adapter, mock_tello, caplog):
	adapter._connected = True
	adapter._is_flying = True
	valid_directions = [
		CommandType.MOVE_FORWARD,
		CommandType.MOVE_BACKWARD,
		CommandType.MOVE_LEFT,
		CommandType.MOVE_RIGHT,
		CommandType.MOVE_UP,
		CommandType.MOVE_DOWN,
		CommandType.ROTATE_CW,
		CommandType.ROTATE_CCW,
	]
	with caplog.at_level('INFO'):
		for direction in valid_directions:
			await adapter.move(direction)
			assert f'Tello: move {direction.name}' in caplog.text
			mock_tello.send_rc_control.assert_called()
			caplog.clear()


@pytest.mark.asyncio
async def test_move_invalid_direction(adapter, mock_tello, caplog):
	adapter._connected = True
	adapter._is_flying = True
	dummy = MagicMock(name='unknown')
	dummy.name = 'UNKNOWN'
	with caplog.at_level('WARNING'):
		await adapter.move(dummy)
		assert 'no vector for UNKNOWN - skipping' in caplog.text
	mock_tello.send_rc_control.assert_not_called()


@pytest.mark.asyncio
async def test_move_not_connected(adapter):
	adapter._connected = False
	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.move(CommandType.MOVE_FORWARD)


@pytest.mark.asyncio
async def test_move_not_flying(adapter):
	adapter._connected = True
	adapter._is_flying = False
	with pytest.raises(RuntimeError, match='Tello Drone is not flying.'):
		await adapter.move(CommandType.MOVE_FORWARD)


@pytest.mark.asyncio
async def test_analog(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	analog_input = MagicMock(spec=AnalogInput)
	analog_input.left_y = -0.5
	analog_input.left_x = 0.3
	analog_input.right_x = 0.3
	analog_input.right_y = 0.2
	analog_input.ltrigger = 0.0
	analog_input.rtrigger = 0.0
	analog_input.right_x = -0.1

	adapter.MOVEMENTSPEED = 50
	await adapter.analog(analog_input)

	mock_tello.send_rc_control.assert_called_once_with(15, 25, 10, -5)


@pytest.mark.asyncio
async def test_analog_with_triggers(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	analog_input = MagicMock(spec=AnalogInput)
	analog_input.left_y = 0.0
	analog_input.left_x = 0.0
	analog_input.right_y = 0.1
	analog_input.ltrigger = 0.8
	analog_input.rtrigger = 0.2
	analog_input.right_x = 0.0

	adapter.MOVEMENTSPEED = 50
	await adapter.analog(analog_input)
	mock_tello.send_rc_control.assert_called_once_with(0, 0, 30, 0)


@pytest.mark.asyncio
async def test_analog_not_connected(adapter):
	adapter._connected = False
	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.analog(MagicMock())


@pytest.mark.asyncio
async def test_analog_not_flying(adapter):
	adapter._connected = True
	adapter._is_flying = False
	with pytest.raises(RuntimeError, match='Tello Drone is not flying.'):
		await adapter.analog(MagicMock())


@pytest.mark.asyncio
async def test_hover(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	await adapter.hover()
	mock_tello.send_rc_control.assert_called_once_with(0, 0, 0, 0)


@pytest.mark.asyncio
async def test_hover_not_connected(adapter):
	adapter._connected = False
	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.hover()


@pytest.mark.asyncio
async def test_hover_not_flying(adapter):
	adapter._connected = True
	adapter._is_flying = False
	with pytest.raises(RuntimeError, match='Tello Drone is not flying.'):
		await adapter.hover()


@pytest.mark.asyncio
async def test_emergency_stop(adapter, mock_tello):
	await adapter.emergency_stop()
	mock_tello.emergency.assert_called_once()


@pytest.mark.asyncio
async def test_get_telemetry_not_connected(adapter, mock_tello):
	adapter._connected = False
	result = await adapter.get_telemetry()
	assert isinstance(result, TelemetryData)
	assert result.source == 'tello-disconnected'
	mock_tello.get_current_state.assert_not_called()


def test_assert_connected(adapter):
	adapter._connected = True
	adapter._assert_connected()
	adapter._connected = False
	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		adapter._assert_connected()


def test_assert_flying(adapter):
	adapter._is_flying = True
	adapter._assert_flying()
	adapter._is_flying = False
	with pytest.raises(RuntimeError, match='Tello Drone is not flying.'):
		adapter._assert_flying()
