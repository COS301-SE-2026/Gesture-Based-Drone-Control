from __future__ import annotations

from fastapi import (
	APIRouter,
	Depends,
	HTTPException,
	status,
)  # thingie that organizes the endpoints
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.login import LoginRequest, LoginResponse
from services.auth.schemas import verify_password
from services.auth.signup import SignupRequest, SignupResponse
from services.database_manager.database import get_db
from services.database_manager.managers.user_manager import user_manager

router = APIRouter(prefix='/auth', tags=['auth'])

@router.get('/health')
async def health():
	return {'status': 'ok'}

@router.post('/login', response_model=LoginResponse)  # so this is da login endpoint
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
	user = await user_manager.get_by_email(db, payload.email.lower())
	if user is None or not verify_password(payload.password, user.hashed_password):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password'
		)
	return LoginResponse(message='Login is succesful')


@router.post('/signup', response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):

	existing_user = await user_manager.get_by_email(db, request.email.lower())

	if existing_user is not None:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT, detail='A user with this email already exists'
		)

	result = await user_manager.create(
		db, request.email.lower(), request.password, request.first_name, request.last_name
	)

	if result is None:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT, detail='A user with this email already exists'
		)

	return SignupResponse(message='Signup Successful')
