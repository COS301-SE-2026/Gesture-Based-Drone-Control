from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.models.users import User
from services.auth.schemas import hash_password

class UserManager:
    async def get_by_email(self, db: AsyncSession, email:str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def create( 
        self,
        db: AsyncSession,
        email: str,
        password: str,
        first_name: str,
        last_name: str,             
    )->User:
        new_user = User(
            email=email,
            hashed_password=hash_password(password),
            first_name=first_name,
            last_name=last_name
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

user_manager = UserManager()