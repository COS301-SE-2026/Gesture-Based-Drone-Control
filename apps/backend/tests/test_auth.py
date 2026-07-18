from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from apps.backend.app.main import app
from services.auth.auth_manager import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    SessionTokens,
)

client = TestClient(app)

def sample_tokens() -> SessionTokens:
    return SessionTokens(
        access_token="access-token",
        refresh_token="refresh-token",
        refresh_expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    ) 

class TestHealthEndpoint:
    def test_health(self):
        response = client.get("/api/auth/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}