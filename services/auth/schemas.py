from __future__ import annotations

from pydantic import (
	BaseModel,
	EmailStr,
	field_validator,
)  # pydantic is like a library used for validation commonly in

from services.auth.password_service import validate_password_strength


class AuthResponse(BaseModel):
	message: str


class SignupRequest(BaseModel):
	email: EmailStr
	password: str
	first_name: str
	last_name: str

	@field_validator('password')
	@classmethod
	def validate_password(cls, value: str) -> str:
		return validate_password_strength(value)


class LoginRequest(BaseModel):
	email: EmailStr
	password: str

	@field_validator('password')
	@classmethod
	def validate_password(cls, value: str) -> str:
		return validate_password_strength(value)


class RefreshRequest(BaseModel):
	refresh_token: str
