import uuid
from datetime import datetime

from sqlalchemy import DateTime, Double, ForeignKey, Integer, Real, text
from sqlalchemy.orm import Mapped, mapped_column

from services.database_manager.database import Base

class FlightSummary(Base):
    __tablename__ = "flight_summary"

    id: Mapped[uuid.UUID] = mapped_column(
    primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    drone_id: Mapped[int] = mapped_column(
        ForeignKey("drones.id"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_altitude: Mapped[float | None] = mapped_column(Double, nullable=True)
    avg_battery_drain: Mapped[float | None] = mapped_column(Real, nullable=True)
    avg_speed: Mapped[float | None] = mapped_column(Real, nullable=True)
    control_count: Mapped[int | None] = mapped_column(Integer, nullable=True)