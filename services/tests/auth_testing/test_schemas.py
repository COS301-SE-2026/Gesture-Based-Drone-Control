from unittest.mock import patch

import pytest
from pydantic import ValidationError

from services.auth.schemas import AuthResponse, SignupRequest


def test_auth_response():
	response = AuthResponse('Success')
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


@pytest.mark.paramatrize(
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
