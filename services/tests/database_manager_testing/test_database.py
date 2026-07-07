import importlib
import sys
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.pool import StaticPool

MODULE_PATH = "services.database_manager.database"

@pytest.fixture
def db_module(monkeypatch):
    monkeypatch.setenv("SQLITE_DB_PATH", ":memory:")
    sys.modules.pop(MODULE_PATH, None)
    module = importlib.import_module(MODULE_PATH)
    yield module
    import asyncio

    asyncio.run(module.engine.dispose())

# Settings Tests

class TestSettings:
    def test_default_db_path_is_memory(self, db_module):
        assert db_module.settings.sqlite_db_path == ":memory:"

    def test_db_url_shape(self, db_module):
        url = db_module.settings.database_url
        assert url.drivername == "sqlite+aiosqlite"
        assert url.database == ":memory:"

    def test_env_var_overrides_default(self, monkeypatch):
        monkeypatch.setenv("SQLITE_DB_PATH", "custom.db")
        sys.modules.pop(MODULE_PATH, None)
        module = importlib.import_module(MODULE_PATH)
        assert module.settings.sqlite_db_path == "custom.db"

    def test_extra_env_vars_are_ignored(self, monkeypatch):
        monkeypatch.setenv("UNRELATED_VALUE", "SuiSui")
        sys.modules.pop(MODULE_PATH, None)
        module = importlib.import_module(MODULE_PATH)
        settings = module.Settings()
        assert settings.sqlite_db_path