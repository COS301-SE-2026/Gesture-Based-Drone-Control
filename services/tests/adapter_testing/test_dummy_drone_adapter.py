import pytest

from services.commands.command import AnalogInput, CommandType
from services.drone_control.adapters.dummy_drone_adapter import (
    DummyDroneAdapter
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
    
