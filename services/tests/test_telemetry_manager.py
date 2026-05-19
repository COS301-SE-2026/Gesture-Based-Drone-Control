import pytest
from unittest.mock import AsyncMock, patch

import sys
import os
from pathlib import Path

project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telemetry import get_drone_telemetry, get_sim_telemetry

@pytest.mark.asyncio
async def test_get_drone_telemetry():

    result = await get_drone_telemetry()
    assert result["battery"] == 100
    assert result["altitude"] == 20

@pytest.mark.asyncio
async def test_get_sim_telemetry():

    result = await get_sim_telemetry()
    assert result["battery"] == 100
    assert result["altitude"] == 20
