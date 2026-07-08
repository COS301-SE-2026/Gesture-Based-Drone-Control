import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Double, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.database_manager.database import Base

if TYPE_CHECKING:
	from services.database_manager.models.flight_summary import FlightSummary


class Telemetry(Base):
	__tablename__ = 'telemetry'

	id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
	flight_id: Mapped[uuid.UUID | None] = mapped_column(
		ForeignKey('flight_summary.id', ondelete='CASCADE'), nullable=False
	)
	recorded_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	displacement_x: Mapped[float | None] = mapped_column(Double, nullable=True)
	displacement_y: Mapped[float | None] = mapped_column(Double, nullable=True)
	altitude: Mapped[float | None] = mapped_column(Double, nullable=True)
	battery_level: Mapped[float | None] = mapped_column(Double, nullable=True)
	speed: Mapped[float | None] = mapped_column(Double, nullable=True)
	command_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

	flight_summary: Mapped['FlightSummary'] = relationship(back_populates='telemetry_readings')
