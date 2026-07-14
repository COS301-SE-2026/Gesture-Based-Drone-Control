import uuid
from dataclass import dataclass
from datetime import datetime

from services.database_manager.managers.refresh_token_manager import refresh_token_manager
from services.database_manager.managers.user_manager import user_manager
from services.database_manager.models.users import User
from services.auth.password_service import hash_password, verify_password
from services.auth.token_service import token_service

class EmailAlreadyRegisteredError(Exception):
    pass

class InvalidCredentialsError(Exception):
    pass

class InvalidRefreshTokenError(Exception):
    pass

@dataclass(frozen=True)
class SessionTokens:
    access_token: str
    rtefresh_token:str
    refresh_expires_at: datetime

class AuthManager:

    async def register(
            self, 
            *,
            email: str,
            password: str,
    ) -> SessionTokens:
        existing = await user_manager.get_by_email(email=email)

        if existing is not None:
            raise EmailAlreadyRegisteredError()
        
        password_hash = hash_password(password)

        user = await user_manager.create(email = email, hashed_password=password_hash)

        return await self._create_session(user)
    
    async def _create_session(
            self,
            user: User
    )-> SessionTokens:
        
        access_token = token_service.create_access_token(user.id)