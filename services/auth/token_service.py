import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from jwt import ExpiredSignatureError, InvalidAudienceError, InvalidIssuerError, InvalidTokenError

from services.auth.auth_settings import AuthSettings


class TokenError(Exception):
	"""Rasied for any access token validation failures. Code 401"""


@dataclass(frozen=True)
class AccessTokenPayload:
	user_id: uuid.UUID
	issued_at: datetime
	expires_at: datetime


class TokenService:
	def __init__(self, settings: AuthSettings) -> None:
		self._secret = settings.jwt_secret_key
		self._algorithm = settings.jwt_algorithm
		self._issuer = settings.jwt_issuer
		self._audience = settings.jwt_audience
		self._ttl = timedelta(minutes=settings.access_token_expire_minutes)

	def create_access_token(self, user_id: uuid.UUID) -> str:
		now = datetime.now(timezone.utc)
		payload = {
			'sub': str(user_id),
			'iat': now,
			'exp': now + self._ttl,
			'iss': self._issuer,
			'aud': self._audience,
		}
		return jwt.encode(payload, self._secret, algorithm=self._algorithm)

	def validate_access_token(self, token: str) -> AccessTokenPayload:
		try:
			payload = jwt.decode(
				token,
				self._secret,
				algorithms=[self._algorithm],
				audience=self._audience,
				issuer=self._issuer,
			)
		except ExpiredSignatureError as exc:
			raise TokenError('Access token has expired') from exc
		except InvalidAudienceError as exc:
			raise TokenError('Invalid Token Audience') from exc
		except InvalidIssuerError as exc:
			raise TokenError('Invalid Token Issuer') from exc
		except InvalidTokenError as exc:
			raise TokenError('Invalide access token') from exc

		try:
			user_id = uuid.UUID(payload['sub'])
		except (KeyError, ValueError) as exc:
			raise TokenError('Access token missing valid subject claim') from exc

		return AccessTokenPayload(
			user_id=user_id,
			issued_at=datetime.fromtimestamp(payload['iat'], tz=timezone.utc),
			expires_at=datetime.fromtimestamp(payload['exp'], tz=timezone.utc),
		)

	def create_refresh_token(self):
		plaintext = secrets.token_urlsafe(32)
		hash = self.hash_refresh_token(plaintext)

		return plaintext, hash

	@staticmethod
	def hash_refresh_token(self, token: str) -> str:
		return hashlib.sha256(token.encode('utf-8')).hexdigest()


token_service = TokenService(AuthSettings())
