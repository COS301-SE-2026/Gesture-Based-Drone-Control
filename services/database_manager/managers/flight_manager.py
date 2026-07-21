from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.models.drones import Drone
from services.database_manager.models.flight_summary import FlightSummary
from services.database_manager.models.telemetry import Telemetry


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

	async def end_flight(self, db: AsyncSession, flight_id: uuid.UUID) -> FlightSummary | None:
		result = await db.execute(select(FlightSummary).where(FlightSummary.id == flight_id))
		flight = result.scalar_one_or_none()
		if flight is None:
			return None

		aggr = await db.execute(
			select(
				func.max(Telemetry.altitude),
				func.avg(Telemetry.speed),
				func.count(Telemetry.id),
			).where(Telemetry.flight_id == flight_id)
		)
		max_alt, avg_speed, reading_count = aggr.one()

		flight.ended_at = datetime.now(timezone.utc)
		flight.max_altitude = max_alt
		flight.avg_speed = avg_speed
		flight.control_count = reading_count

		await db.commit()
		await db.refreah(flight)
		return flight

	async def record_telemetry(
		self,
		db: AsyncSession,
		flight_id: uuid.UUID,
		displacement_x: float | None,
		displacement_y: float | None,
		altitude: float | None,
		battery_level: float | None,
		speed: float | None,
	) -> None:
		db.add(
			Telemetry(
				flight_id=flight_id,
				displacement_x=displacement_x,
				displacement_y=displacement_y,
				altitude=altitude,
				battery_level=battery_level,
				speed=speed,
			)
		)
		await db.commit()

	async def get_recent_flights(self, db: AsyncSession, limit: int = 10) -> list[FlightSummary]:
		result = await db.execute(
			select(FlightSummary).order_by(FlightSummary.started_at.desc()).limit(limit)
		)
		return list(result.scalars().all())

	async def get_summ_stats(self, db: AsyncSession) -> dict:
		result = await db.execute(
			select(
				func.count(FlightSummary.id),
				func.avg(FlightSummary.avg_speed),
				func.max(FlightSummary.max_altitude),
			).where(FlightSummary.ended_at.is_not(None))
		)
		total_flights, avg_speed, max_altitude = result.one()

		durations = await db.execute(
			select(FlightSummary.started_at, FlightSummary.ended_at).where(
				FlightSummary.ended_at.is_not(None)
			)
		)
		rows = durations.all()
		avg_duration_mins = (
			sum((ended - started).total_seconds() for started, ended in rows) / len(rows) / 60
			if rows
			else 0.0
		)

		return {
			'total_flights': total_flights or 0,
			'avg_speed': avg_speed,
			'max_altitude': max_altitude,
			'avg_flight_duration_min': round(avg_duration_mins, 1),
		}


flight_manager = FlightManager()
