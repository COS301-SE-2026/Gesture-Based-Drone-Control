from collections.abc import AsyncGenerator

from pydantic_settings import BaseSettings
from sqlalchemy import URL, event
from sqlalchemy.ext.asyncio import (
	AsyncSession,
	async_sessionmaker,
	create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool


class Settings(BaseSettings):
	sqlite_db_path: str = 'app.db'

	class Config:
		env_file = '.env'
		extra = 'ignore'

	@property
	def database_url(self) -> URL:
		return URL.create(drivername='sqlite+aiosqlite', database=self.sqlite_db_path)


settings = Settings()


class Base(DeclarativeBase):
	pass


engine = create_async_engine(
	settings.database_url,
	echo=False,
	poolclass=StaticPool if settings.sqlite_db_path == ':memory:' else None,
)


@event.listens_for(engine.sync_engine, 'connect')
def set_sqlite_pragma(dbapi_connection, connection_record):
	cursor = dbapi_connection.cursor()
	cursor.execute('PRAGMA foreign_keys=ON')
	cursor.close()


AsyncSessionLocal = async_sessionmaker(
	engine,
	class_=AsyncSession,
	expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
	async with AsyncSessionLocal() as session:
		try:
			yield session
		except Exception:
			await session.rollback()
			raise
