import os
import sys
from pathlib import Path

import pytest
from telemetry.manager import get_drone_telemetry, get_sim_telemetry

project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


@pytest.mark.asyncio
async def test_get_drone_telemetry():

	result = await get_drone_telemetry()
	assert result['battery'] == 100
	assert result['altitude'] == 20


@pytest.mark.asyncio
async def test_get_sim_telemetry():

	result = await get_sim_telemetry()
	assert result['battery'] == 100
	assert result['altitude'] == 20
