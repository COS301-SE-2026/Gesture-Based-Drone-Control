import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from services.auth.auth_settings import AuthSettings
from services.auth.token_service import AccessTokenPayload, TokenError, TokenService


@pytest.fixture
def settings():
	return AuthSettings(
		jwt_secret_key='this-is-a-much-longer-secret-only-for-testing',
		jwt_algorithm='HS256',
		jwt_issuer='test-issuer',
		jwt_audience='test_audience',
		access_token_expire_minutes=15,
	)


@pytest.fixture
def token_service(settings):
	return TokenService(settings)


class TestCreateAccessToken:
	def test_returns_string(self, token_service):
		token = token_service.create_access_token(uuid.uuid4())
		assert isinstance(token, str)
		assert len(token) > 0

	def test_contains_expected_claims(self, token_service, settings):
		user_id = uuid.uuid4()
		token = token_service.create_access_token(user_id)

		payload = jwt.decode(
			token,
			settings.jwt_secret_key,
			algorithms=[settings.jwt_algorithm],
			audience=settings.jwt_audience,
			issuer=settings.jwt_issuer,
		)

		assert payload['sub'] == str(user_id)
		assert payload['iss'] == settings.jwt_issuer
		assert payload['aud'] == settings.jwt_audience
		assert 'iat' in payload
		assert 'exp' in payload


class TestValidateAccessToken:
	def test_returns_payload(self, token_service):
		user_id = uuid.uuid4()
		token = token_service.create_access_token(user_id)
		payload = token_service.validate_access_token(token)

		assert isinstance(payload, AccessTokenPayload)
		assert payload.user_id == user_id
		assert payload.issued_at.tzinfo == timezone.utc
		assert payload.expires_at.tzinfo == timezone.utc
		assert payload.expires_at > payload.issued_at

	def test_expired_token(self, settings, token_service):
		now = datetime.now(timezone.utc)

		token = jwt.encode(
			{
				'sub': str(uuid.uuid4()),
				'iat': now - timedelta(minutes=30),
				'exp': now - timedelta(minutes=15),
				'iss': settings.jwt_issuer,
				'aud': settings.jwt_audience,
			},
			settings.jwt_secret_key,
			algorithm=settings.jwt_algorithm,
		)
		with pytest.raises(TokenError, match='Access token has expired'):
			token_service.validate_access_token(token)

	def test_invalid_audience(self, settings, token_service):
		now = datetime.now(timezone.utc)

		token = jwt.encode(
			{
				'sub': str(uuid.uuid4()),
				'iat': now,
				'exp': now + timedelta(minutes=15),
				'iss': settings.jwt_issuer,
				'aud': 'Wrong-Audience',
			},
			settings.jwt_secret_key,
			algorithm=settings.jwt_algorithm,
		)
		with pytest.raises(TokenError, match='Invalid Token Audience'):
			token_service.validate_access_token(token)

	def test_invalid_issuer(self, settings, token_service):
		now = datetime.now(timezone.utc)

		token = jwt.encode(
			{
				'sub': str(uuid.uuid4()),
				'iat': now,
				'exp': now + timedelta(minutes=15),
				'iss': 'invalid-issuer',
				'aud': settings.jwt_audience,
			},
			settings.jwt_secret_key,
			algorithm=settings.jwt_algorithm,
		)
		with pytest.raises(TokenError, match='Invalid Token Issuer'):
			token_service.validate_access_token(token)

	def test_invalid_signature(self, settings, token_service):
		now = datetime.now(timezone.utc)

		token = jwt.encode(
			{
				'sub': str(uuid.uuid4()),
				'iat': now,
				'exp': now + timedelta(minutes=15),
				'iss': settings.jwt_issuer,
				'aud': settings.jwt_audience,
			},
			'invalid-secret',
			algorithm=settings.jwt_algorithm,
		)
		with pytest.raises(TokenError, match='Invalid Access Token'):
			token_service.validate_access_token(token)

	def test_missing_subject(self, settings, token_service):
		now = datetime.now(timezone.utc)

		token = jwt.encode(
			{
				'iat': now,
				'exp': now + timedelta(minutes=15),
				'iss': settings.jwt_issuer,
				'aud': settings.jwt_audience,
			},
			settings.jwt_secret_key,
			algorithm=settings.jwt_algorithm,
		)
		with pytest.raises(TokenError, match='Access token missing valid subject claim'):
			token_service.validate_access_token(token)

	def test_invalid_subject_uuid(self, settings, token_service):
		now = datetime.now(timezone.utc)

		token = jwt.encode(
			{
				'sub': 'not-a-uuid',
				'iat': now,
				'exp': now + timedelta(minutes=15),
				'iss': settings.jwt_issuer,
				'aud': settings.jwt_audience,
			},
			settings.jwt_secret_key,
			algorithm=settings.jwt_algorithm,
		)
		with pytest.raises(TokenError, match='Access token missing valid subject claim'):
			token_service.validate_access_token(token)
