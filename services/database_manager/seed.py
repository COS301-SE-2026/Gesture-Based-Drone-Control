from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession 

from services.database_manager.models.drones import Drone

DEFAULT_DRONES = [
     {'display_name': 'Airsim', 'is_simulated': True},
     {'display_name': 'Project Airsim', 'is_simulated': True},
     {'display_name': 'XFly 1.0', 'is_simulated': False},
]

async def seed_defaults(session: AsyncSession) -> None:
    existing = await session.scalar(select(Drone.id).limit(1))
    if existing is not None:
        return

    session.add_all(Drone(**d) for d in DEFAULT_DRONES)
    await session.commit()