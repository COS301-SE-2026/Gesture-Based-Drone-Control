from unittest.mock import patch

import pytest
from pydantic import ValidationError

from services.auth.schemas import AuthResponse, LoginRequest, RefreshRequest, SignupRequest


def test_auth_response():
	response = AuthResponse(message='Success')
	assert response.message == 'Success'


def test_signup_request_valid():
	with patch(
		'services.auth.schemas.validate_password_strength', return_value='StrongPass123!'
	) as mock_validate:
		request = SignupRequest(
			email='user@example.com',
			password='StrongPass123!',
			first_name='Jane',
			last_name='Doe',
		)
		mock_validate.assert_called_once_with('StrongPass123!')
		assert request.email == 'user@example.com'
		assert request.password == 'StrongPass123!'
		assert request.first_name == 'Jane'
		assert request.last_name == 'Doe'


@pytest.mark.parametrize(
	'password', ['short', 'alllowercase', 'NOSPECIALCHARS123', 'NoDigitsHere!']
)  # NOSONAR
def test_signup_request_invalid_password(password):
	with patch(
		'services.auth.schemas.validate_password_strength', side_effect=ValueError('weak password')
	) as mock_validate:
		with pytest.raises(ValidationError):
			SignupRequest(
				email='user@example.com',
				password=password,
				first_name='Jane',
				last_name='Doe',
			)
		mock_validate.assert_called_once_with(password)


def test_signup_request_invalid_email():
	with patch('services.auth.schemas.validate_password_strength', return_value='StrongPass123!'):
		with pytest.raises(ValidationError):
			SignupRequest(
				email='not-an-email',
				password='StrongPass123!',  # NOSONAR
				first_name='Jane',
				last_name='Doe',
			)


def test_signup_request_missing_fields():
	with pytest.raises(ValidationError):
		SignupRequest(
			email='not-an-email',
			password='StrongPass123!',  # NOSONAR
		)


def test_login_request_valid():
	with patch(
		'services.auth.schemas.validate_password_strength', return_value='StrongPass123!'
	) as mock_validate:
		request = LoginRequest(email='user@example.com', password='StrongPass123!')
		mock_validate.assert_called_once_with('StrongPass123!')
		assert request.email == 'user@example.com'
		assert request.password == 'StrongPass123!'


@pytest.mark.parametrize(
	'password', ['short', 'alllowercase', 'NOSPECIALCHARS123', 'NoDigitsHere!']
)  # NOSONAR
def test_login_request_invalid_password(password):
	with patch(
		'services.auth.schemas.validate_password_strength', side_effect=ValueError('weak password')
	) as mock_validate:
		with pytest.raises(ValidationError):
			LoginRequest(email='user@example.com', password=password)
		mock_validate.assert_called_once_with(password)


def test_login_request_invalid_email():
	with patch('services.auth.schemas.validate_password_strength', return_value='StrongPass123!'):
		with pytest.raises(ValidationError):
			LoginRequest(email='invalid-email', password='StrongPass123!')


def test_login_request_missing_required_fields():
	with pytest.raises(ValidationError):
		LoginRequest(email='user@example.com')


def test_refresh_request_valid():
	request = RefreshRequest(refresh_token='refresh-token')
	assert request.refresh_token == 'refresh-token'


def test_refresh_request_missing_refresh_token():
	with pytest.raises(ValidationError):
		RefreshRequest()
