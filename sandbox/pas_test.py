import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s  %(name)s: %(message)s'
)

import asyncio
from services.commands.command import CommandType, Command
from services.drone_control.adapters.project_airsim_adapter import ProjectAirSimAdapter


MOVE_DURATION  = 0.5   # seconds per velocity command
MOVE_SLEEP     = 0.45   # sleep after each move
ROTATE_SLEEP   = 0.1   # sleep after each rotate

def cmd(t: CommandType) -> Command:
    return Command(type=t, source='pas_test')

async def step(pas, command_type: CommandType, label: str, sleep: float = MOVE_SLEEP) -> None:
    """Execute a single command, print a banner, and wait."""
    await pas.execute(cmd(command_type))
    t = await pas.get_telemetry()
    print(f'  [{label}]  alt={t.altitude_m:.2f}m  hdg={t.heading_deg:.1f}deg  spd={t.speed_ms:.2f}m/s')
    await asyncio.sleep(sleep)

async def main() -> None:
    pas = ProjectAirSimAdapter()

    await pas.connect()
    print('\n***** connected *****\n')
    await asyncio.sleep(2)


    print('********** TAKEOFF **********')
    await step(pas, CommandType.TAKEOFF, 'takeoff', sleep=3)


    print('********** HOVER **********')
    await step(pas, CommandType.HOVER, 'hover', sleep=2)


    print('********** MOVE_UP (x3) **********')
    for _ in range(3):
        await step(pas, CommandType.MOVE_UP, 'up')

    print('********** MOVE_DOWN (x3) **********')
    for _ in range(3):
        await step(pas, CommandType.MOVE_DOWN, 'down')


    print('********** CIRCLE **********')
    for i in range(8):
        # forward leg
        for _ in range(4):
            await step(pas, CommandType.MOVE_FORWARD, f'fwd leg {i+1}')

        # 45° clockwise turn , 3 × 15
        for _ in range(3):
            await step(pas, CommandType.ROTATE_CW, f'rotate_cw leg {i+1}', sleep=ROTATE_SLEEP)
            
    print('********** MOVE_FORWARD (x6) **********')
    for _ in range(6):
        await step(pas, CommandType.MOVE_FORWARD, 'forward')

    print('********** MOVE_LEFT (x3) **********')
    for _ in range(3):
        await step(pas, CommandType.MOVE_LEFT, 'left')

    print('********** MOVE_RIGHT (x3) **********')
    for _ in range(3):
        await step(pas, CommandType.MOVE_RIGHT, 'right')

    print('********** MOVE_BACKWARD (x3) **********')
    for _ in range(3):
        await step(pas, CommandType.MOVE_BACKWARD, 'backward')

    print('********** ROTATE_CCW (x6) **********')
    for _ in range(6):
        await step(pas, CommandType.ROTATE_CCW, 'rotate_ccw', sleep=ROTATE_SLEEP)

    print('********** HOVER **********')
    await step(pas, CommandType.HOVER, 'hover', sleep=2)

    print('********** EMERGENCY_STOP **********')
    await step(pas, CommandType.EMERGENCY_STOP, 'e-stop', sleep=2)
    
    print('********** TAKEOFF **********')
    await step(pas, CommandType.TAKEOFF, 'takeoff', sleep=3)

    print('********** HOVER  **********')
    await step(pas, CommandType.HOVER, 'hover', sleep=2)

    print('********** LAND **********')
    await step(pas, CommandType.LAND, 'land', sleep=5)

    await pas.disconnect()
    print('\n***** disconnected *****\n')


if __name__ == '__main__':
    asyncio.run(main())