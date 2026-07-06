import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.database_manager.database import Base


class User(Base):
	__tablename__ = 'users'

	id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
	email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
	hashed_password: Mapped[str] = mapped_column(String, nullable=False)
	first_name: Mapped[str] = mapped_column(String, nullable=True)
	last_name: Mapped[str] = mapped_column(String, nullable=True)
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	
	flight_summaries: Mapped[list["FlightSummary"]] = relationship(back_populates="user")
