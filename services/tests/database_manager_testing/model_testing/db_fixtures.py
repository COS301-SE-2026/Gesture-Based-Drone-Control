import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from services.database_manager.database import Base


@pytest_asyncio.fixture
async def engine():
	engine = create_async_engine('sqlite+aiosqlite:///:memory:')

	@event.listens_for(engine.sync_engine, 'connect')
	def set_sqlite_pragma(dbapi_connection, connection_record):
		cursor = dbapi_connection.cursor()
		cursor.execute('PRAGMA foreign_keys=ON')
		cursor.close()

	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)
	yield engine
	await engine.dispose()


@pytest_asyncio.fixture
async def session(engine):
	session_maker = async_sessionmaker(engine, expire_on_commit=False)
	async with session_maker() as s:
		yield s
