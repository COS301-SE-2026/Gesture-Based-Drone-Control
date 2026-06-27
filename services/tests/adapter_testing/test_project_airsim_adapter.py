# tests/adapter_testing/test_project_airsim_adapter.py

# i didnt even know the mocks could be async these know ball
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.commands.command import CommandType
from services.drone_control.adapters.drone_adapter import TelemetryData
from services.drone_control.adapters.project_airsim_adapter import (
	DEFAULT_ROTATE_DEG,
	DEFAULT_SPEED_MS,
	ProjectAirSimAdapter,
	_find_sim_config,
)

# Helpers


def make_connected_adapter():
	"""
	Create a connected adapter with mocked drone/client.
	"""
	adapter = ProjectAirSimAdapter()

	mock_drone = MagicMock()
	mock_drone.takeoff_async = AsyncMock()
	mock_drone.land_async = AsyncMock()
	mock_drone.move_by_velocity_body_frame_async = AsyncMock()
	mock_drone.hover_async = AsyncMock()
	mock_drone.rotate_by_yaw_rate_async = AsyncMock()

	mock_client = MagicMock()

	adapter._drone = mock_drone
	adapter._client = mock_client
	adapter._connected = True

	return adapter, mock_drone, mock_client


# Constructor and defaults


def test_constructor_defaults():
	adapter = ProjectAirSimAdapter()

	assert adapter._host == '127.0.0.1'  # NOSONAR
	assert adapter._topics_port == 8989
	assert adapter._services_port == 8990
	assert adapter._vehicle_name == 'Drone1'
	assert adapter._connected is False
	assert adapter._drone is None
	assert adapter._client is None


def test_constructor_custom_values():
	adapter = ProjectAirSimAdapter(
		host='192.168.1.5',  # NOSONAR
		topics_port=1111,
		services_port=2222,
		vehicle_name='TestDrone',
		scene_config='custom.jsonc',
		sim_config_path='/tmp/config/',  # NOSONAR
	)

	assert adapter._host == '192.168.1.5'  # NOSONAR
	assert adapter._topics_port == 1111
	assert adapter._services_port == 2222
	assert adapter._vehicle_name == 'TestDrone'
	assert adapter._scene_config == 'custom.jsonc'
	assert adapter._sim_config_path == '/tmp/config/'  # NOSONAR


# _assert_connected


def test_assert_connected_raises():
	adapter = ProjectAirSimAdapter()

	with pytest.raises(RuntimeError):
		adapter._assert_connected()


def test_assert_connected_passes():
	adapter, _, _ = make_connected_adapter()

	adapter._assert_connected()


# connect


@pytest.mark.asyncio
async def test_connect_success():
	adapter = ProjectAirSimAdapter()

	mock_client = MagicMock()
	mock_drone = MagicMock()
	mock_world = MagicMock()

	with (
		patch.dict(
			'sys.modules',
			{
				'projectairsim': MagicMock(
					ProjectAirSimClient=MagicMock(return_value=mock_client),
					Drone=MagicMock(return_value=mock_drone),
					World=MagicMock(return_value=mock_world),
				)
			},
		),
		patch(
			'services.drone_control.adapters.project_airsim_adapter._find_sim_config',
			return_value='/fake/config/',
		),
	):
		result = await adapter.connect()

	assert result is True
	assert adapter._connected is True
	assert adapter._client is mock_client
	assert adapter._drone is mock_drone

	mock_client.connect.assert_called_once()
	mock_drone.enable_api_control.assert_called_once()


@pytest.mark.asyncio
async def test_connect_failure():
	adapter = ProjectAirSimAdapter()

	with (
		patch.dict(
			'sys.modules',
			{
				'projectairsim': MagicMock(
					ProjectAirSimClient=MagicMock(side_effect=Exception('boom'))
				)
			},
		),
		patch(
			'services.drone_control.adapters.project_airsim_adapter._find_sim_config',
			return_value='/fake/config/',
		),
	):
		result = await adapter.connect()

	assert result is False
	assert adapter._connected is False


# disconnect


@pytest.mark.asyncio
async def test_disconnect():
	adapter, mock_drone, mock_client = make_connected_adapter()

	adapter.land = AsyncMock()

	await adapter.disconnect()

	adapter.land.assert_awaited_once()
	mock_drone.disarm.assert_called_once()
	mock_drone.disable_api_control.assert_called_once()
	mock_client.disconnect.assert_called_once()

	assert adapter._connected is False


# takeoff / land / hover


@pytest.mark.asyncio
async def test_takeoff():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter.takeoff()

	mock_drone.arm.assert_called_once()
	mock_drone.takeoff_async.assert_awaited_once()


@pytest.mark.asyncio
async def test_land():
	adapter, mock_drone, _ = make_connected_adapter()

	adapter.get_telemetry = AsyncMock(return_value=TelemetryData(is_flying=False))

	await adapter.land()

	mock_drone.land_async.assert_awaited_once()
	mock_drone.disarm.assert_called_once()


@pytest.mark.asyncio
async def test_hover():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter.hover()

	mock_drone.hover_async.assert_awaited_once()


# emergency stop


@pytest.mark.asyncio
async def test_emergency_stop():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter.emergency_stop()

	mock_drone.hover_async.assert_awaited_once()
	mock_drone.disarm.assert_called_once()


@pytest.mark.asyncio
async def test_emergency_stop_without_drone(caplog):
	adapter = ProjectAirSimAdapter()

	await adapter.emergency_stop()

	assert 'drone is none' in caplog.text.lower()


# movement


@pytest.mark.asyncio
async def test_move_forward():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter.move(CommandType.MOVE_FORWARD)

	mock_drone.move_by_velocity_body_frame_async.assert_awaited_once()

	args = mock_drone.move_by_velocity_body_frame_async.await_args.args

	assert args[0] == DEFAULT_SPEED_MS
	assert args[1] == 0


@pytest.mark.asyncio
async def test_move_up():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter.move(CommandType.MOVE_UP)

	args = mock_drone.move_by_velocity_body_frame_async.await_args.args

	assert args[2] < 0


@pytest.mark.asyncio
async def test_move_rotate_dispatch():
	adapter, _, _ = make_connected_adapter()

	adapter._rotate = AsyncMock()

	await adapter.move(CommandType.ROTATE_CW)

	adapter._rotate.assert_awaited_once_with(
		CommandType.ROTATE_CW,
		degrees=DEFAULT_ROTATE_DEG,
	)


@pytest.mark.asyncio
async def test_move_invalid_direction(caplog):
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter.move(CommandType.TAKEOFF)

	assert 'no vector' in caplog.text.lower()

	mock_drone.move_by_velocity_body_frame_async.assert_not_called()


# _rotate


@pytest.mark.asyncio
async def test_rotate_clockwise():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter._rotate(CommandType.ROTATE_CW, 90)

	mock_drone.rotate_by_yaw_rate_async.assert_awaited_once()

	args = mock_drone.rotate_by_yaw_rate_async.await_args.args

	assert args[0] > 0


@pytest.mark.asyncio
async def test_rotate_counterclockwise():
	adapter, mock_drone, _ = make_connected_adapter()

	await adapter._rotate(CommandType.ROTATE_CCW, 90)

	args = mock_drone.rotate_by_yaw_rate_async.await_args.args

	assert args[0] < 0


# telemetry


@pytest.mark.asyncio
async def test_get_telemetry_disconnected():
	adapter = ProjectAirSimAdapter()

	t = await adapter.get_telemetry()

	assert isinstance(t, TelemetryData)
	assert t.source == 'projectairsim-disconnected'


@pytest.mark.asyncio
async def test_get_telemetry_success():
	adapter, mock_drone, _ = make_connected_adapter()

	mock_drone.get_ground_truth_kinematics.return_value = {
		'pose': {
			'position': {
				'x': 0.0,
				'y': 0.0,
				'z': -5.0,
			},
			'orientation': {
				'w': 1.0,
				'x': 0.0,
				'y': 0.0,
				'z': 0.0,
			},
		},
		'twist': {
			'linear': {
				'x': 3.0,
				'y': 4.0,
				'z': 0.0,
			}
		},
	}

	t = await adapter.get_telemetry()

	assert isinstance(t, TelemetryData)
	assert t.altitude_m == 5
	assert t.speed_ms == 5
	assert t.is_flying is True
	assert t.source == 'projectairsim'


@pytest.mark.asyncio
async def test_get_telemetry_failure():
	adapter, mock_drone, _ = make_connected_adapter()

	mock_drone.get_ground_truth_kinematics.side_effect = Exception('fail')

	t = await adapter.get_telemetry()

	assert t.source == 'projectairsim-error'


# quaternion helpers fancy big math probably buggy


# only scalar do nothing
def test_yaw_from_quaternion_dict_identity():
	heading = ProjectAirSimAdapter._yaw_from_quaternion_dict(
		{
			'w': 1.0,
			'x': 0.0,
			'y': 0.0,
			'z': 0.0,
		}
	)

	assert heading == 0


# same but different font
def test_yaw_from_quaternion_alt_keys():
	heading = ProjectAirSimAdapter._yaw_from_quaternion_dict(
		{
			'w_val': 1.0,
			'x_val': 0.0,
			'y_val': 0.0,
			'z_val': 0.0,
		}
	)

	assert heading == 0


def test_yaw_from_quaternion_invalid():
	heading = ProjectAirSimAdapter._yaw_from_quaternion_dict(None)  # NOSONAR

	assert heading == 0


# finding the sim config folder
# (this one actually important but should be ayt)


def test_find_sim_config_failure():
	with (
		patch(
			'pathlib.Path.is_dir',
			return_value=False,
		),
		patch.dict('sys.modules', {}, clear=False),
	):
		with pytest.raises(RuntimeError):
			_find_sim_config()
