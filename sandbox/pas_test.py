import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
#hacky method to not have to deal with import weirdness

import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s  %(levelname)-8s  %(name)s: %(message)s'
)

import time

from services.commands.command import CommandType, Command
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData
from services.drone_control.adapters.project_airsim_adapter import ProjectAirSimAdapter

import asyncio


async def main():
    pas = ProjectAirSimAdapter()
    takeoff = Command(type=CommandType.TAKEOFF,source='testing')
    hover   = Command(type=CommandType.HOVER,source='testing')
    land    = Command(type=CommandType.LAND,source='testing')
    move    = Command(type=CommandType.MOVE_FORWARD,source='testing')
    await pas.connect()
    print('************ connected ************')
    time.sleep(3)
    await pas.execute(takeoff)
    print('************ takeoff done ************')
    time.sleep(3)
    await pas.execute(hover)
    print('************ hover done ************')
    time.sleep(3)
    for i in range(0,3):
        await pas.execute(move)
        print(f'************ move {i} ************')
        time.sleep(0.6)
    await pas.execute(land)
    print('************ land done ************')
    time.sleep(5)
    await pas.disconnect()
    print('************ disconnected ************')
    
if __name__ == "__main__":
    asyncio.run(main())