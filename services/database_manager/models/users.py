import uuid

from sqlalchemy import Boolean, String, text
from sqlalchemy.orm import Mapped, mapped_column

from services.database_manager.database import Base


class User(Base):
	__tablename__ = 'users'

	id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text('gen_random_uuid'))
	email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
	hashed_password: Mapped[str] = mapped_column(String, nullable=False)
	first_name: Mapped[str] = mapped_column(String, nullable=True)
	last_name: Mapped[str] = mapped_column(String, nullable=True)
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
