from services.commands.command import PRIORITY_CRITICAL, PRIORITY_NORMAL, Command, CommandType


# emergency stop should auto set priority to critical
def test_emergency_stop_priority_escalation():
	cmd = Command(type=CommandType.EMERGENCY_STOP)

	assert cmd.priority == PRIORITY_CRITICAL


def test_non_escalation():
	cmd = Command(type=CommandType.HOVER)

	assert cmd.priority == PRIORITY_NORMAL


def test_command_repr_takeoff():
	cmd = Command(type=CommandType.TAKEOFF)
	assert 'TAKEOFF' in repr(cmd)


def test_command_repr_land():
	cmd = Command(type=CommandType.LAND)
	assert 'LAND' in repr(cmd)


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


# payloads have not been implemented yet
