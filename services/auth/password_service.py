from __future__ import annotations

import re

import bcrypt
from services.auth.auth_settings import AuthSettings


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


def hash_password(password: str) -> str:
	settings = AuthSettings()
	return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=settings.bcrypt_rounds)).decode('utf-8')


def verify_password(password: str, stored_hash: str) -> bool:
	try:
		return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
	except ValueError:
		return False