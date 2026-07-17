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
            match="Password must contain atleast one lowercase letter"
		):
            validate_password_strength("PASSWORD123!") #NOSONAR
            
    def test_rejects_password_without_number(self):
        with pytest.raises(
            ValueError,
            match="Password must contain atleast one number"
		):
            validate_password_strength("Password!") #NOSONAR
            
    def test_rejects_password_without_special_character(self):
        with pytest.raises(
            ValueError,
            match="Password must contain atleast one special character"
		):
            validate_password_strength("Password123") #NOSONAR
            
	
class TestHashPassword:
    def test_hash_returns_string(self):
        hashed = hash_password("Password123!") #NOSONAR
        assert isinstance(hashed, str)
        
    def test_hash_is_not_equal_to_plaintext(self):
        password = "Password123!" #NOSONAR
        hashed = hash_password(password)
        
        assert hashed != password
        
    def test_hash_is_valid_bcrypt_hash(self):
        password = "Password123!" #NOSONAR
        hashed = hash_password(password)
        assert bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        
class TestVerifyPassword:
    def test_returns_true_for_correct_password(self):
        password = "Password123!" #NOSONAR
        hashed = hash_password(password)
        assert verify_password(password, hashed)
		
    def test_returns_false_for_incorrect_password(self):
        hashed = hash_password("Password123!") #NOSONAR
        assert not verify_password("WrongPassword123!", hashed) #NOSONAR
        
    def test_returns_false_for_invalid_hash(self):
        assert not verify_password("Password123!", "invalid_bcrypt-hash")