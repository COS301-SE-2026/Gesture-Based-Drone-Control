import pytest
import bcrypt

from services.auth.password_service import (
    hash_password,
    validate_password_strength,
    verify_password
)

class TestValidatePasswordStrength:
    def test_valid_password_returns_password(self):
        password = "Password123!" # NOSONAR
        assert validate_password_strength(password) == password
        
    def test_rejects_password_shorter_than_8_characters(self):
        with pytest.raises(
          ValueError,
          match="Password must be atleast 8 characters long"  
		):
            validate_password_strength("Aa1!") #NOSONAR
            
    def test_rejects_password_without_uppercase(self):
        with pytest.raises(
            ValueError,
            match="Password must contain atleast one uppercase letter"
		):
            validate_password_strength("password123!") #NOSONAR
            
    def test_rejects_password_without_lowercase(self):
        with pytest.raises(
            ValueError,
            match="Password must contain atleast one uppercase letter"
		):
            validate_password_strength("PASSWORD123!") #NOSONAR
            
    def test_rejects_password_without_number(self):
        with pytest.raises(
            ValueError,
            match="Password must contain atleast one uppercase letter"
		):
            validate_password_strength("Password!") #NOSONAR
            
    def test_rejects_password_without_special_character(self):
        with pytest.raises(
            ValueError,
            match="Password must contain atleast one uppercase letter"
		):
            validate_password_strength("Password123") #NOSONAR
            
	
            
	