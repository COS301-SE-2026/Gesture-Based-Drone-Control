from __future__ import annotations
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from apps.backend.app.main import app
from services.auth.schemas import verify_password
from services.database_manager.database import get_db
from services.database_manager.managers.user_manager import user_manager

pytestmark = pytest.mark.asyncio

@pytest_asyncio.fixure
async def client(session)
    async def override_get_db():
        yield session
    
    app.dependency_overrides[get_db] = overrride_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

VALID_SIGNUP = {
    'email':'newuser@example.com',
    'password':'GoodPassword@123',
    'first_name':"Chinmayi",
    'last_name':"Santhosh",
}



