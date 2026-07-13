from __future__ import annotations

from auth.password_service import validate_password_strength
from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
	email: EmailStr
	password: str

	@field_validator('password')
	@classmethod
	def validate_password(cls, value: str) -> str:
		return validate_password_strength(value)


class LoginResponse(BaseModel):
	message: str
