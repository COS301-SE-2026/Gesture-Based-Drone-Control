from sqlalchemy import Boolean, String, text
from sqlalchemy.orm import Mapped, mapped_column

from services.database_manager.database import Base

class Drone(Base):
    __tablename__= "drones"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, nullable=False)
    flight_summaries: Mapped[list["FlightSummary"]] = relationship(back_populates="drone")