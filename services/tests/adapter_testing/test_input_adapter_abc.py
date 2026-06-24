import pytest

from services.commands.command import Command, CommandType
from services.input.sources.input_adapter import InputAdapter


class ConcreteInputAdapter(InputAdapter):
	async def start(self) -> None:
		# issa stub
		pass


def test_set_handler_stores_callable():
	adapter = ConcreteInputAdapter()

	def handler(cmd: Command):
		# issa stub
		pass

	adapter.set_handler(handler)

	assert adapter._handler is handler


def test_emit_without_handler_logs_warning(caplog):
	adapter = ConcreteInputAdapter()

	adapter._emit(Command(type=CommandType.TAKEOFF))

	assert 'no handler' in caplog.text.lower()


def test_emit_with_handler_invokes_callback():
	adapter = ConcreteInputAdapter()
	received = []

	adapter.set_handler(received.append)

	cmd = Command(type=CommandType.LAND)
	adapter._emit(cmd)

	assert received[0] == cmd


def test_emit_preserves_command_object_identity():
	adapter = ConcreteInputAdapter()
	received = []

	adapter.set_handler(received.append)

	cmd = Command(type=CommandType.HOVER)
	adapter._emit(cmd)

	assert received[0] is cmd


def test_start_is_abstract_enforced():
	with pytest.raises(TypeError):
		InputAdapter()  # cannot instantiate ABC
