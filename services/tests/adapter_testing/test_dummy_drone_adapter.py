import pytest

from services.commands.command import AnalogInput, CommandType
from services.drone_control.adapters.dummy_drone_adapter import (
    DEFAULT_ALT_STEP_M,
    DEFAULT_ROTATE_DEG,
    DummyDroneAdapter,
)

async def make_connected():
    adapter = DummyDroneAdapter()
    await adapter.connect()
    return adapter

@pytest.mark.asyncio
async def test_takeoff_and_land():
    """literally just check if state changes happen properly"""
    adapter = await make_connected()

    await adapter.takeoff()
    t = await adapter.get_telemetry()

    assert t.is_flying is True
    assert t.altitude_m == 1.5

    await adapter.land()
    t = await adapter.get_telemetry()

    assert t.is_flying is False
    assert t.altitude_m == 0.0
    
@pytest.mark.asyncio
async def test_move_changes_position():
    """check if simulated movement reflects properly"""
    adapter = await make_connected()
    
    await adapter.move(CommandType.MOVE_FORWARD)
    
    t = await adapter.get_telemetry()
    
    assert t.x_displacement > 0.0
    assert t.y_displacement == 0.0
    
@pytest.mark.asyncio
async def test_change_altitude():
    adapter = await make_connected()
    
    await adapter.move(CommandType.MOVE_UP)
    
    t = await adapter.get_telemetry()
    assert t.altitude_m == DEFAULT_ALT_STEP_M
    
    await adapter.move(CommandType.MOVE_DOWN)
    
    t = await adapter.get_telemetry()
    assert t.altitude_m == 0.0
    
@pytest.mark.asyncio 
async def test_analog_move_and_rotate():
    """the analog stuff is basically the same for this adapter"""
    adapter = await make_connected()

    await adapter.analog(
        AnalogInput(
            left_x=0.5,
            left_y=-1.0,
            right_x=1.0,
            right_y=0.0,
            ltrigger=0.0,
            rtrigger=0.0,
        )
    )
    
    t = await adapter.get_telemetry()
    
    assert t.x_displacement > 0
    assert t.y_displacement > 0
    assert t.heading_deg == DEFAULT_ROTATE_DEG
    
@pytest.mark.asyncio
async def test_analog_trigger_altitude():
    """alternate control scheme"""
    adapter = await make_connected()

    await adapter.analog(
        AnalogInput(
            left_x=0.0,
            left_y=0.0,
            right_x=0.0,
            right_y=-0.5,
            ltrigger=0.0,
            rtrigger=1.0,
        )
    )
    
    t = await adapter.get_telemetry()
    # should ignore the stick
    assert t.altitude_m > 0    

@pytest.mark.asyncio
async def test_emergency_stop_clears_flying_state():
    adapter = await make_connected()

    await adapter.takeoff()
    await adapter.emergency_stop()

    t = await adapter.get_telemetry()

    assert t.is_flying is False
    
@pytest.mark.asyncio
async def test_disconnect():
    adapter = await make_connected()

    await adapter.disconnect()

    assert adapter._connected is False
    
@pytest.mark.asyncio
async def test_methods_require_connection():
    adapter = DummyDroneAdapter()

    with pytest.raises(RuntimeError):
        await adapter.takeoff()

    with pytest.raises(RuntimeError):
        await adapter.move(CommandType.MOVE_FORWARD)

    with pytest.raises(RuntimeError):
        await adapter.hover()

    with pytest.raises(RuntimeError):
        await adapter.get_telemetry()
        
@pytest.mark.asyncio
async def reject_connect_twice():
    adapter = DummyDroneAdapter()
    assert adapter.connect == True
    assert adapter.connect == False
    
    # can do stuff while connected
    await adapter.hover()
    
    assert adapter.disconnect == True
    assert adapter.disconnect == False
    