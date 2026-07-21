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