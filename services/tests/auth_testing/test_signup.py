from unittest.mock import patch

import pytest
from pydantic import ValidationError

from services.auth.signup import SignupRequest


@pytest.mark.parametrize(
	'password', ['short', 'alllowercase', 'NOSPECIALCHARS123', 'NoDIgitsHere!']
)
def test_weak_password_raises_validation_error(password):
	with patch(
		'services.auth.signup.validate_password_strength', side_effect=ValueError('weak password')
	) as mock_validate:
		with pytest.raises(ValidationError):
			SignupRequest(
				email='user@example.com', password=password, first_name='Jane', last_name='Doe'
			)
		mock_validate.assert_called_once_with(password)


def test_valid_password_calls_validator_and_passes():
	with patch(
		'services.auth.signup.validate_password_strength', return_value='StrongPass123!'
	) as mock_validate:
		req = SignupRequest(
			# NOSONAR
			email='user@example.com',
			password='StrongPass123!',
			first_name='Jane',
			last_name='Doe',
		)
		mock_validate.assert_called_once_with('StrongPass123!')
		assert req.password == 'StrongPass123!'
