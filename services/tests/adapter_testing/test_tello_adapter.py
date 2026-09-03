import math
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

with patch.dict(
	'sys.modules',
	{
		'djitellopy': MagicMock(),
	},
):
	from services.commands.command import AnalogInput, CommandType
	from services.drone_control.adapters.drone_adapter import CameraFrame, TelemetryData
	from services.drone_control.adapters.tello_adapter import TelloAdapter

@pytest.fixture
def fake_frame():
	return np.zeros((720, 960, 3), dtype=np.uint8)

@pytest.fixture
def fake_frame_read(fake_frame):
	reader = MagicMock()
	reader.frame = fake_frame
	reader.stop= MagicMock()
	return reader

@pytest.fixture
def mock_tello(fake_frame_read):
	"""Create a mock Tello instance."""
	tello = MagicMock()
	tello.connect = MagicMock()
	tello.streamon = MagicMock()
	tello.get_frame_read = MagicMock(return_value=fake_frame_read)
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
		adapter._schedule_wifi_query_sometimes = MagicMock()
		return adapter

@pytest.fixture
def streaming_adapter(adaoter, fake_frame_read):
	adapter._connected = True
	adapter._video_on = True
	adapter._frame_read = fake_frame_read
	return adapter


@pytest.mark.asyncio
async def test_connect_success(adapter, mock_tello):
	result = await adapter.connect()
	assert result is True
	mock_tello.connect.assert_called_once()
	mock_tello.streamon.assert_not_called()
	mock_tello.get_frame_read.assert_not_called()
	assert adapter._connected is True
	assert adapter._video_on is False	
	assert adapter._frame_read is None


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
	mock_tello.streamoff.assert_not_called()
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
	analog_input = MagicMock()

	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.analog(analog_input)


@pytest.mark.asyncio
async def test_analog_not_flying(adapter):
	adapter._connected = True
	adapter._is_flying = False
	analog_input = MagicMock()

	with pytest.raises(RuntimeError, match='Tello Drone is not flying.'):
		await adapter.analog(analog_input)


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


@pytest.mark.asyncio
async def test_get_telemetry_success_first_call(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	adapter._x_displacement = 0.0
	adapter._y_displacement = 0.0
	adapter._last_telemetry_time = None
	adapter._wifi_signal = 70

	with patch('services.drone_control.adapters.tello_adapter.time.monotonic', return_value=1000.0):
		result = await adapter.get_telemetry()

	assert isinstance(result, TelemetryData)
	assert result.source == 'tello'
	assert result.altitude_m == 1.0

	expected_speed = round(math.sqrt(20**2 + 30**2 + 40**2) / 100, 3)
	assert result.speed_ms == expected_speed

	body_heading = math.degrees(math.atan2(30, 20))
	expected_heading = (body_heading + 45) % 360
	assert result.heading_deg == expected_heading

	assert result.battery_pct == 85
	assert result.is_flying is True
	assert result.x_displacement == 0.0
	assert result.y_displacement == 0.0
	assert result.extra == {'signal': 70}

	assert adapter._last_telemetry_time == 1000.0
	adapter._schedule_wifi_query_sometimes.assert_called_once_with(1000.0)


@pytest.mark.asyncio
async def test_get_telemetry_integrates_displacement_across_calls(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	adapter._x_displacement = 0.0
	adapter._y_displacement = 0.0
	adapter._last_telemetry_time = None

	with patch('services.drone_control.adapters.tello_adapter.time.monotonic', return_value=1000.0):
		first = await adapter.get_telemetry()

	assert first.x_displacement == 0.0
	assert first.y_displacement == 0.0

	with patch('services.drone_control.adapters.tello_adapter.time.monotonic', return_value=1000.5):
		second = await adapter.get_telemetry()

	yaw_rad = math.radians(45)
	vx_ms, vy_ms = 20 / 100, 30 / 100
	world_vx = vx_ms * math.cos(yaw_rad) - vy_ms * math.sin(yaw_rad)
	world_vy = vx_ms * math.sin(yaw_rad) + vy_ms * math.cos(yaw_rad)
	expected_x = round(world_vx * 0.5, 3)
	expected_y = round(world_vy * 0.5, 3)

	assert second.x_displacement == expected_x
	assert second.y_displacement == expected_y
	assert adapter._last_telemetry_time == 1000.5


@pytest.mark.asyncio
async def test_get_telemetry_dt_clamped_to_max(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = True
	adapter._x_displacement = 0.0
	adapter._y_displacement = 0.0
	adapter._last_telemetry_time = 0.0
	adapter.MAX_DT_S = 0.5

	with patch('services.drone_control.adapters.tello_adapter.time.monotonic', return_value=1000.0):
		result = await adapter.get_telemetry()

	yaw_rad = math.radians(45)
	vx_ms, vy_ms = 20 / 100, 30 / 100
	world_vx = vx_ms * math.cos(yaw_rad) - vy_ms * math.sin(yaw_rad)
	world_vy = vx_ms * math.sin(yaw_rad) + vy_ms * math.cos(yaw_rad)
	expected_x = round(world_vx * 0.5, 3)
	expected_y = round(world_vy * 0.5, 3)

	assert result.x_displacement == expected_x
	assert result.y_displacement == expected_y


async def test_get_telemetry_not_flying_does_not_move(adapter, mock_tello):
	adapter._connected = True
	adapter._is_flying = False
	adapter._x_displacement = 0.0
	adapter._y_displacement = 0.0
	adapter._last_telemetry_time = 1000.0

	with patch('services.drone_control.adapters.tello_adapter.time.monotonic', return_value=1001.0):
		result = await adapter.get_telemetry()

	assert not result.is_flying
	assert result.x_displacement == 0.0
	assert result.y_displacement == 0.0


@pytest.mark.asyncio
async def test_get_telemetry_exception(adapter, mock_tello):
	adapter._connected = True
	mock_tello.get_current_state.side_effect = Exception('State error')

	result = await adapter.get_telemetry()

	assert isinstance(result, TelemetryData)
	assert result.source == 'tello-error'
	mock_tello.get_position.assert_not_called()


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

def test_has_camera_is_true(adapter):
	assert adapter.has_camera is True

async def test_start_video_success(adapter, mock_tello, fake_frame_read):
	adapter._connected = True

	result = await adapter.start_video()

	assert result is True
	mock_tello.streamon.assert_called_once()
	mock_tello.get_frame_read.assert_called_once()
	assert adapter._video_on is True
	assert adapter._frame_read is fake_frame_read

async def test_start_video_is_idempotent(adapter, mock_tello):
	adapter._connected = True

	assert await adapter.start_video() is True
	assert await adapter.start_video() is True

	mock_tello.streamon.assert_called_once()
	mock_tello.get_frame_read.assert_called_once()

async def test_start_video_not_connected(adapter, mock_tello):
	adapter._connected = False

	with pytest.raises(RuntimeError, match='Tello Drone is not connected.'):
		await adapter.start_video()	
	mock_tello.streamon.assert_not_called()

async def test_start_video_streamon_fails(adapter, mock_tello):
	adapter._connected = True
	mock_tello.streamon.side_effect = Exception('streamon failed')

	result = await adapter.start_video()

	assert result is False
	mock_tello.get_frame_read.assert_not_called()
	assert adapter._video_on is False
	assert adapter._frame_read is None

async def test_start_video_get_frame_read_fails(adapter, mock_tello):
	adapter._connected = True
	mock_tello.get_frame_read.side_effect = Exception ('no reader')

	result = await adapter.start_video()

	assert result is False
	mock_tello.streamon.assert_called_once()
	assert adapter._video_on is False
	assert adapter._frame_read is None

async def test_start_video_can_retry_after_failure(adapter, mock_tello, fake_frame_read):
	adapter._connected = True
	mock_tello.streamon.side_effect = Exception('streamon failed')
	assert await adapter.start_video() is False

	mock_tello.streamon.side_effect = None
	assert await adapter.start_video() is True
	assert adapter._frame_read is fake_frame_read

	