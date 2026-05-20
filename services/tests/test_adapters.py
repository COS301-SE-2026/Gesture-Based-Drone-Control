import pytest

from commands.command import PRIORITY_CRITICAL, Command, CommandType
from drone_control.adapters.airsim_adapter import AirSimAdapter
from drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData
from input.sources.input_adapter import InputAdapter
from input.sources.keyboard_adapter import KeyboardAdapter

# Integration and unit testing for the adapter to adapter pipeline


# command unit testing
def test_command_default_fields():
	cmd = Command(type=CommandType.TAKEOFF)
	assert cmd.payload == {}
	assert cmd.priority == 1
	assert cmd.source == 'unknown'


def test_command_emergency_stop_priority_override():
	cmd = Command(type=CommandType.EMERGENCY_STOP)
	assert cmd.priority == PRIORITY_CRITICAL


def test_command_repr_minimal():
	cmd = Command(type=CommandType.LAND, source='keyboard')
	rep = repr(cmd)
	assert 'LAND' in rep
	assert 'keyboard' in rep


# InputAdapter testing


class DummyAdapter(InputAdapter):
	def start(self):
		pass


def test_input_adapter_set_handler_and_emit():
	adapter = DummyAdapter()
	received = []

	adapter.set_handler(received.append)
	adapter._emit(Command(type=CommandType.TAKEOFF))

	assert len(received) == 1
	assert received[0].type == CommandType.TAKEOFF


def test_input_adapter_emit_without_handler_logs_warning(caplog):
	adapter = DummyAdapter()
	adapter._emit(Command(type=CommandType.TAKEOFF))

	assert 'no handler is registered' in caplog.text.lower()


# KeyboardAdapter - a concrete InputAdapter


def test_keyboard_adapter_keydown_mapping():
	adapter = KeyboardAdapter()
	received = []
	adapter.set_handler(received.append)

	adapter.handle_message({'key': 't', 'event': 'keydown'})

	assert len(received) == 1
	assert received[0].type == CommandType.TAKEOFF
	assert received[0].source == 'keyboard'


def test_keyboard_adapter_ignores_keyup():
	adapter = KeyboardAdapter()
	received = []
	adapter.set_handler(received.append)

	adapter.handle_message({'key': 't', 'event': 'keyup'})
	assert len(received) == 0


def test_keyboard_adapter_unknown_key(caplog):
	adapter = KeyboardAdapter()
	adapter.set_handler(lambda x: None)

	adapter.handle_message({'key': 'UnknownKey', 'event': 'keydown'})
	assert '' in caplog.text.lower()


def test_keyboard_adapter_non_dict_input(caplog):
	adapter = KeyboardAdapter()
	adapter.set_handler(lambda x: None)

	adapter.handle_message(None)
	assert 'non-dict' in caplog.text.lower()


def test_keyboard_bindings():
	adapter = KeyboardAdapter()
	bindings = adapter.get_bindings()

	assert bindings['t'] == 'TAKEOFF'
	assert bindings['ArrowUp'] == 'MOVE_FORWARD'
	assert isinstance(bindings, dict)


# DroneAdapter routing testing


class DummyDrone(DroneAdapter):
	async def connect(self):
		return True

	async def disconnect(self):
		pass

	async def takeoff(self):
		self.last = 'takeoff'

	async def land(self):
		self.last = 'land'

	async def move(self, direction, **kwargs):
		self.last = ('move', direction)

	async def hover(self):
		self.last = 'hover'

	async def emergency_stop(self):
		self.last = 'emergency'

	async def get_telemetry(self):
		return TelemetryData()


# these classes have async functions, need to mark with this decorator otherwise demons
@pytest.mark.asyncio
async def test_drone_adapter_execute_routing():
	d = DummyDrone()

	await d.execute(Command(type=CommandType.TAKEOFF))
	assert d.last == 'takeoff'

	await d.execute(Command(type=CommandType.LAND))
	assert d.last == 'land'

	await d.execute(Command(type=CommandType.MOVE_FORWARD))
	assert d.last[0] == 'move'

	await d.execute(Command(type=CommandType.EMERGENCY_STOP))
	assert d.last == 'emergency'


# MOCKED AirsimAdapter


@pytest.mark.asyncio
async def test_airsim_adapter_assert_not_connected():
	adapter = AirSimAdapter()

	with pytest.raises(RuntimeError):
		adapter._assert_connected()


@pytest.mark.asyncio
async def test_airsim_telemetry_disconnected():
	adapter = AirSimAdapter()
	t = await adapter.get_telemetry()

	assert isinstance(t, TelemetryData)
	assert t.source == 'airsim-disconnected'


@pytest.mark.asyncio
async def test_airsim_move_requires_connection():
	adapter = AirSimAdapter()
	adapter._connected = False
	adapter._client = None

	with pytest.raises(RuntimeError):
		await adapter.move(CommandType.MOVE_FORWARD)
