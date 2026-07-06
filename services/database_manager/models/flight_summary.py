import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import REAL, DateTime, Double, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.database_manager.database import Base

if TYPE_CHECKING:
	from services.database_manager.models.drones import Drone
	from services.database_manager.models.telemetry import Telemetry
	from services.database_manager.models.users import User


class FlightSummary(Base):
	__tablename__ = 'flight_summary'

	id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
	user_id: Mapped[uuid.UUID | None] = mapped_column(
		ForeignKey('users.id', ondelete='SET NULL'), nullable=True
	)
	drone_id: Mapped[int] = mapped_column(ForeignKey('drones.id'), nullable=False)
	started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	max_altitude: Mapped[float | None] = mapped_column(Double, nullable=True)
	avg_battery_drain: Mapped[float | None] = mapped_column(REAL, nullable=True)
	avg_speed: Mapped[float | None] = mapped_column(REAL, nullable=True)
	control_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

	user: Mapped['User'] = relationship(back_populates='flight_summaries')
	drone: Mapped['Drone'] = relationship(back_populates='flight_summaries')
	telemetry_readings: Mapped[list['Telemetry']] = relationship(back_populates='flight_summary')
