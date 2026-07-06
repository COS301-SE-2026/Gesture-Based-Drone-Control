from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status  # thingie that organizes the endpoints

from services.auth.schemas import LoginRequest, LoginResponse, hash_password
from services.auth.signup import SignupRequest, SignupResponse

from services.database_manager.database import get_db
from services.database_manager.models.users import User

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=LoginResponse)  # so this is da login endpoint
async def login(payload: LoginRequest):
	return LoginResponse(message='Validation passed yaay')


@router.post('/signup', response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):

	result = await db.execute(select(User).where(User.email == request.email))
	existing_user = result.scalar_one_or_none()

	if existing_user is not None:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="A user with this email already exists"
		)
	
	new_user = User(
		email = request.email,
		hashed_password= hash_password(request.password),
		first_name = request.first_name,
		last_name= request.last_name
	)

	db.add(new_user)
	await db.commit()
	await db.refresh(new_user)

	return SignupResponse(message='Signup Successful')
