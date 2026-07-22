from datetime import datetime, timedelta, timezone
from unittest.mock import ANY, AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.auth import auth_manager, router
from services.auth.auth_manager import (
	InvalidCredentialsError,
	SessionTokens,
	EmailAlreadyRegisteredError,
	InvalidRefreshTokenError,
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

class TestSignupEndpoint:
	@patch("apps.backend.app.api.auth.set_auth_cookies")
	@patch.object(auth_manager, "register", new_callable=AsyncMock)
	def test_signup_success(self, mock_register, mock_set_auth_cookies):
		mock_register.return_value = sample_tokens()
		response = client.post(
			"/auth/signup",
			json ={
				"email" : "USER@GMAIL.COM",
				"password": "Password123!", #NOSONAR
				"first_name": "Jane",
				"last_name": "Doe"
			}
		)
		assert response.status_code == 201
		assert response.json() == {
			"message": "Signup Successful"
		}
		mock_register.assert_awaited_once_with(
			db=ANY,
			email = "user@gmail.com",
			password="Password123!", #NOSONAR
			first_name = "Jane",
			last_name= "Doe"
		)
		mock_set_auth_cookies.assert_called_once()

	@patch("apps.backend.app.api.auth.set_auth_cookies")
	@patch.object(auth_manager, "register", new_callable=AsyncMock)
	def test_signup_existing_email(self, mock_register, mock_set_auth_cookies):
		mock_register.side_effect = EmailAlreadyRegisteredError()

		response = client.post(
			"/auth/signup",
			json ={
				"email" : "USER@GMAIL.COM",
				"password": "Password123!", #NOSONAR
				"first_name": "Jane",
				"last_name": "Doe"
			}
		)
		assert response.status_code == 409
		assert response.json() == {
			"detail" : "A user with this email already exists"
		}
		mock_set_auth_cookies.assert_not_called()

class TestRefreshEndpoint:
	@patch("apps.backend.app.api.auth.set_auth_cookies")
	@patch.object(auth_manager, "refresh", new_callable=AsyncMock)
	def test_refresh_success(self, mock_refresh, mock_set_auth_cookies):
		mock_refresh.return_value = sample_tokens()

		response = client.post(
			"/auth/refresh",
			json = {
				"refresh_token": "refresh-token"
			}
		)
		assert response.status_code == 201
		assert response.json() == {
			"message": "Token Refresh Successful"
		}
		mock_refresh.assert_awaited_once_with(
			db=ANY,
			refresh_token = "refresh-token"
		)

	@patch("apps.backend.app.api.auth.set_auth_cookies")
	@patch.object(auth_manager, "refresh", new_callable=AsyncMock)
	def test_refresh_invalid_token(self, mock_refresh, mock_set_auth_cookies):
		mock_refresh.side_effect = InvalidRefreshTokenError("Invalid token")

		response = client.post(
			"/auth/refresh",
			json = {
				"refresh_token": "invalid-token"
			}
		)
		assert response.status_code == 401
		assert response.json() == {
			"detail": "Invalid token"
		}
		mock_set_auth_cookies.assert_not_called()