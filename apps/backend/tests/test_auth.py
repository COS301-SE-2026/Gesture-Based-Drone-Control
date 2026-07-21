from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.auth import auth_manager, router
from services.auth.auth_manager import (
	InvalidCredentialsError,
	SessionTokens,
)

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def sample_tokens() -> SessionTokens:
	return SessionTokens(
		access_token='access-token',
		refresh_token='refresh-token',
		refresh_expires_at=datetime.now(timezone.utc) + timedelta(days=1),
	)


class TestHealthEndpoint:
	def test_health(self):
		response = client.get('/auth/health')

		assert response.status_code == 200
		assert response.json() == {'status': 'ok'}


class TestLoginEndpoint:
	@patch('apps.backend.app.api.auth.set_auth_cookies')
	@patch.object(auth_manager, 'authenticate', new_callable=AsyncMock)
	def test_login_success(self, mock_authenticate, mock_set_auth_cookies):
		mock_authenticate.return_value = sample_tokens()

		response = client.post(
			'/auth/login', json={'email': 'TEST@EMAIL.COM', 'password': 'Password123!'}
		)

		assert response.status_code == 200
		assert response.json() == {'message': 'Login is succesful'}

		mock_authenticate.assert_awaited_once_with(
			email='test@email.com',
			password='Password123!',
			db=mock_authenticate.await_args.kwargs['db'],
		)

	@patch('apps.backend.app.api.auth.set_auth_cookies')
	@patch.object(auth_manager, 'authenticate', new_callable=AsyncMock)
	def test_login_invalid_credentials(self, mock_authenticate, mock_set_auth_cookies):
		mock_authenticate.side_effect = InvalidCredentialsError()
		response = client.post(
			'/auth/login',
			json={
				'email': 'test@gmail.com',
				'password': 'WrongPassword123!',  # NOSONAR
			},
		)
		assert response.status_code == 401
		assert response.json() == {'detail': 'Invalid email or password'}
		mock_set_auth_cookies.assert_not_called()
