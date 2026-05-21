from unittest.mock import MagicMock, patch  # it really just lets anything do anything

import pytest
from services.commands.command import CommandType
from services.drone_control.adapters.airsim_adapter import AirSimAdapter, TelemetryData

# mock helpers


class FakeState:
	class Kinematics:
		def __init__(self):
			self.position = MagicMock(z_val=-5.0)
			self.linear_velocity = MagicMock(x_val=1.0, y_val=2.0, z_val=2.0)
			self.orientation = MagicMock()

	class LandedState:
		value = 0

	def __init__(self):
		self.kinematics_estimated = self.Kinematics()
		self.landed_state = self.LandedState()


class FakeClient:
	def __init__(self):
		self.confirmConnection = MagicMock()
		self.enableApiControl = MagicMock()
		self.armDisarm = MagicMock()
		self.takeoffAsync = MagicMock(return_value=self)
		self.landAsync = MagicMock(return_value=self)
		self.hoverAsync = MagicMock(return_value=self)
		self.moveByVelocityAsync = MagicMock(return_value=self)
		self.rotateByYawRateAsync = MagicMock(return_value=self)
		self.cancelLastTask = MagicMock()
		self.getMultirotorState = MagicMock(return_value=FakeState())

	def join(self):
		return None


# test connections


@pytest.mark.asyncio
async def test_connect_failure():
	adapter = AirSimAdapter()

	# this is necessary because airsim doesnt exist globally in the adapter
	# rather its imported in a function, therefore we have to mock it
	# even when not used airsim is a pain in the ass
	fake_airsim = MagicMock()
	fake_airsim.MultirotorClient.side_effect = Exception('fail')

	with patch.dict('sys.modules', {'airsim': fake_airsim}):
		result = await adapter.connect()

	assert result is False
	assert adapter._connected is False


@pytest.mark.asyncio
async def test_connect_success():
	adapter = AirSimAdapter()

	with patch.dict('sys.modules', {'airsim': MagicMock()}):
		result = await adapter.connect()

		assert result is True
		assert adapter._connected is True
		assert adapter._client is not None


# test telemetry


@pytest.mark.asyncio
async def test_get_telemetry_disconnected():
	adapter = AirSimAdapter()

	t = await adapter.get_telemetry()

	assert isinstance(t, TelemetryData)
	assert t.source == 'airsim-disconnected'


@pytest.mark.asyncio
async def test_get_telemetry_connected():
	adapter = AirSimAdapter()

	adapter._connected = True
	adapter._client = FakeClient()

	with patch('services.drone_control.adapters.airsim_adapter.math.sqrt', return_value=3.0):
		t = await adapter.get_telemetry()

	assert isinstance(t, TelemetryData)
	assert t.source == 'airsim'
	assert t.speed_ms == 3.0
	assert t.altitude_m == 5.0


# test movement (may be a bit wack since we cant have real airsim)


@pytest.mark.asyncio
async def test_move_forward_executes():
	adapter = AirSimAdapter()
	adapter._connected = True
	adapter._client = FakeClient()

	await adapter.move(CommandType.MOVE_FORWARD)

	assert adapter._client.moveByVelocityAsync.called
	assert adapter._client.hoverAsync.called


@pytest.mark.asyncio
async def test_move_rotation():
	adapter = AirSimAdapter()
	adapter._connected = True
	adapter._client = FakeClient()

	await adapter.move(CommandType.ROTATE_CW, degrees=30)

	assert adapter._client.rotateByYawRateAsync.called


@pytest.mark.asyncio
async def test_move_unknown_direction_logs_and_skips(caplog):
	adapter = AirSimAdapter()
	adapter._connected = True
	adapter._client = FakeClient()

	with caplog.at_level('WARNING'):
		await adapter.move(CommandType.TAKEOFF)  # not a movement vector

	assert 'skipping' in caplog.text.lower()


# stop


@pytest.mark.asyncio
async def test_emergency_stop():
	adapter = AirSimAdapter()
	adapter._client = FakeClient()

	await adapter.emergency_stop()

	assert adapter._client.cancelLastTask.called
	assert adapter._client.hoverAsync.called


@pytest.mark.asyncio
async def test_disconnect():
	adapter = AirSimAdapter()
	adapter._connected = True
	adapter._client = FakeClient()

	await adapter.disconnect()

	assert adapter._connected is False
