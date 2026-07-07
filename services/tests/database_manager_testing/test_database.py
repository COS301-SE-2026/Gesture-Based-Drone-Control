import importlib
import sys
from unittest.mock import AsyncMock

import pytest_lazyfixture
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSesion
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

