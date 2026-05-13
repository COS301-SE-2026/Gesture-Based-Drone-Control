"""
Smoke testing - just verify that the package structure and imports
are handled correctly.

No logic is tested here, and classes are stubbed. Just check if modules
and classes are accessible from the expected import paths.
"""


def test_command_imports():
    from services.commands import Command, CommandType
    assert Command is not None
    assert CommandType is not None


def test_command_types_exist():
    from services.commands import CommandType
    #verify the commands we're relying on for basic flight actually exist (subject to change)
    assert hasattr(CommandType, "TAKEOFF")
    assert hasattr(CommandType, "LAND")
    assert hasattr(CommandType, "MOVE_UP")
    assert hasattr(CommandType, "MOVE_DOWN")
    assert hasattr(CommandType, "EMERGENCY_STOP")


def test_drone_adapter_imports():
    from services.drone_control.adapters import DroneAdapter, TelemetryData
    assert DroneAdapter is not None
    assert TelemetryData is not None


def test_drone_adapter_is_abstract():
    import inspect
    from services.drone_control.adapters import DroneAdapter
    assert inspect.isabstract(DroneAdapter), \
        "DroneAdapter should be abstract, remember ABC"


def test_airsim_adapter_imports():
    from services.drone_control.adapters import AirSimAdapter
    assert AirSimAdapter is not None


def test_input_adapter_imports():
    from services.input.sources import InputAdapter, KeyboardAdapter
    assert InputAdapter is not None
    assert KeyboardAdapter is not None


def test_input_adapter_is_abstract():
    import inspect
    from services.input.sources import InputAdapter
    assert inspect.isabstract(InputAdapter), \
        "InputAdapter should be abstract, remember ABC"


def test_keyboard_adapter_has_handle_message():
    from services.input.sources import KeyboardAdapter
    assert hasattr(KeyboardAdapter, "handle_message"), \
        "KeyboardAdapter is missing handle_message()"


def test_telemetry_data_fields():
    from services.drone_control.adapters import TelemetryData
    data = TelemetryData()
    assert hasattr(data, "altitude_m")
    assert hasattr(data, "battery_pct")
    assert hasattr(data, "is_flying")
    assert hasattr(data, "source")