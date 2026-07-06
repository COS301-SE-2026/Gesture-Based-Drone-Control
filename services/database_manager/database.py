from collections.abc import AsyncGenerator

from pydantic_settings import BaseSettings
from sqlalchemy import URL
from sqlalchemy.ext.asyncio import (
	AsyncSession,
	async_sessionmaker,
	create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Settings(BaseSettings):
	postgres_user: str
	postgres_password: str
	postgres_host: str = 'localhost'
	postgres_port: int = 5432
	postgres_db: str

	class Config:
		env_file = '.env'

	@property
	def database_url(self) -> URL:
		return URL.create(
			drivername='postgresql+asyncpg',
			username=self.postgres_user,
			password=self.postgres_password,
			host=self.postgres_host,
			port=self.postgres_port,
			database=self.postgres_db,
		)


settings = Settings()


class Base(DeclarativeBase):
	pass


engine = create_async_engine(
	settings.database_url,
	echo=False,
	pool_size=5,
	max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
	engine,
	class_=AsyncSession,
	expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession:None]:
	async with AsyncSessionLocal as session:
		try:
			yield session
		except Exception:
			await session.rollback
			raise
