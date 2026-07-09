import importlib
import sys
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.pool import StaticPool

MODULE_PATH = 'services.database_manager.database'


@pytest.fixture
def db_module(monkeypatch):
	monkeypatch.setenv('SQLITE_DB_PATH', ':memory:')
	sys.modules.pop(MODULE_PATH, None)
	module = importlib.import_module(MODULE_PATH)
	yield module
	import asyncio

	asyncio.run(module.engine.dispose())


# Settings Tests


class TestSettings:
	def test_default_db_path_is_memory(self, db_module):
		assert db_module.settings.sqlite_db_path == ':memory:'

	def test_db_url_shape(self, db_module):
		url = db_module.settings.database_url
		assert url.drivername == 'sqlite+aiosqlite'
		assert url.database == ':memory:'

	def test_env_var_overrides_default(self, monkeypatch):
		monkeypatch.setenv('SQLITE_DB_PATH', 'custom.db')
		sys.modules.pop(MODULE_PATH, None)
		module = importlib.import_module(MODULE_PATH)
		assert module.settings.sqlite_db_path == 'custom.db'

	def test_extra_env_vars_are_ignored(self, monkeypatch):
		monkeypatch.setenv('UNRELATED_VALUE', 'SuiSui')
		sys.modules.pop(MODULE_PATH, None)
		module = importlib.import_module(MODULE_PATH)
		settings = module.Settings()
		assert settings.sqlite_db_path


class TestEnginePoolConfig:
	def test_static_pool_config(self, db_module):
		assert db_module.engine.pool.__class__ is StaticPool

	async def test_default_pool_used_for_file_db(self, monkeypatch, tmp_path):
		monkeypatch.setenv('SQLITE_DB_PATH', str(tmp_path / 'test.db'))
		sys.modules.pop(MODULE_PATH, None)
		module = importlib.import_module(MODULE_PATH)
		try:
			assert not isinstance(module.engine.pool, StaticPool)
		finally:
			await module.engine.dispose()


class TestPragma:
	async def test_foreign_keys_is_enabled_on_connect(self, db_module):
		async with db_module.engine.connect() as conn:
			result = await conn.execute(text('PRAGMA foreign_keys'))
			assert result.scalar() == 1

@pytest_asyncio.fixture
async def initialized_db_gen(db_module):
	gen = db_module.get_db()
	session = await gen.__anext__()

	yield gen, session

	await gen.aclose()

class TestGetDb:
	async def test_yields_async_session(self, db_module):
		gen = db_module.get_db()
		session = await gen.__anext__()
		try:
			assert isinstance(session, AsyncSession)
		finally:
			await gen.aclose()
	
	async def test_session_can_run_queries(self, db_module):
		async for session in db_module.get_db():
			result = await session.execute(text('SELECT 1'))
			assert result.scalar() == 1
			break

	async def test_rollback_called_on_exception(self, initialized_db_gen, monkeypatch):
		gen, session = initialized_db_gen

		session.rollback = AsyncMock(wraps=session.rollback)

		with pytest.raises(ValueError):
			await gen.athrow(ValueError('boom'))

		session.rollback.assert_awaited_once()

	async def test_no_rollback_on_clean_exit(self, db_module, monkeypatch):
		gen = db_module.get_db()
		session = await gen.__anext__()

		session.rollback = AsyncMock(wraps=session.rollback)

		async for session in db_module.get_db():
			session.rollback = AsyncMock(wraps=session.rollback)

		session.rollback.assert_not_awaited()
