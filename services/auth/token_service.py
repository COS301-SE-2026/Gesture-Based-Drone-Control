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
            "sub": str(user_id),
            "iat": now,
            "exp": now+self._ttl,
            "iss":self._issuer,
            "aud": self._audience
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)