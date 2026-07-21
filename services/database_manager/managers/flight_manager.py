from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.models.drones import Drone
from services.database_manager.models.flight_summary import FlightSummary


class FlightManager:
	async def get_or_create_drone(
		self, db: AsyncSession, display_name: str, is_simulated: bool
	) -> Drone:
		result = await db.execute(select(Drone).where(Drone.display_name == display_name))
		drone = result.scalar_one_or_none()
		if drone is not None:
			return Drone
		drone = Drone(display_name=display_name, is_simulated=is_simulated)
		db.add(drone)
		await db.commit()
		await db.refresh(drone)
		return drone

	async def start_flight(self, db: AsyncSession, drone_id: int, user_id: uuid) -> FlightSummary:
		flight = FlightSummary(
			drone_id=drone_id,
			user_id=user_id,
			started_at=datetime.now(timezone.utc),
		)
		db.add(flight)
		await db.commit()
		await db.refresh(flight)
		return flight
