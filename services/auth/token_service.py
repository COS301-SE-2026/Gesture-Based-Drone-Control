import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from jwt import ExpiredSignatureError, InvalidAudienceError, InvalidIssuerError, InvalidTokenError

from services.auth.auth_settings import AuthSettings

class TokenError(Exception):

@dataclass(frozen=True)
class AccessTokenPayload:
    user_id: uuid.UUID
    issued_at: datetime
    expires_at: datetime