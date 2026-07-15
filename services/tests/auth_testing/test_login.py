from unittest.mock import patch

import pytest
from pydantic import ValidationError

from services.auth.login import LoginRequest


@pytest.mark.parametrize(
	'password', ['tiny', 'lowerrrcasee', 'AINTnoSpecialChars', 'aintnodidgits']
)
def test_weak_passwords(password):
	with patch(
		'services.auth.login.validate_password_strength', side_effect=ValueError('weak password')
	) as mock_validate:
		with pytest.raises(ValidationError):
			LoginRequest(email='cool@example.com', password=password)
		mock_validate.assert_called_once_with(password)


def test_valid_password():
	with patch(
		'services.auth.login.validate_password_strength', return_value='GoodPassword@123'
	) as mock_validate:
		req = LoginRequest(email='cool@example.com', password='GoodPassword@123')
		mock_validate.assert_called_once_with('GoodPassword@123')
		assert req.password == 'GoodPassword@123'


def test_invalid_email():
	with pytest.raises(ValidationError):
		LoginRequest(email='not-an-email', passord='VeryGoodPassword@123hehe')
