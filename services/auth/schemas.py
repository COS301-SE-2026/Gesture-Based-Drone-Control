from __future__ import annotations

import re

from pydantic import (
	BaseModel,
	EmailStr,
	field_validator,
)  # pydantic is like a library used for validation commonly in python


def validate_password_strength(value: str) -> str:
	if len(value) < 8:
		raise ValueError('Password must be atleast 8 characters long.')
	if not re.search(r'[A-Z]', value):
		raise ValueError('Password must contain atleast one uppercase letter.')
	if not re.search(r'[a-z]', value):
		raise ValueError('Password must contain atleast one lowercase letter. ')
	if not re.search(r'\d', value):
		raise ValueError('Password must contain atleast one number. ')
	if not re.search(r'[^A-Za-z0-9]', value):
		raise ValueError('Password must contain atleast one special character. ')
	return value


class LoginRequest(BaseModel):
	email: EmailStr  # Pydantic library that checks if the email is the correct format..
	password: str

	@field_validator('password')
	@classmethod
	def validate_password(cls, value: str) -> str:
		return validate_password_strength(value)


class LoginResponse(BaseModel):
	message: str
