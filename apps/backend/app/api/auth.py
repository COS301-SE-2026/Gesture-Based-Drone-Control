from __future__ import annotations

from fastapi import (
	APIRouter,
	Depends,
	HTTPException,
	status,
)  # thingie that organizes the endpoints
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.auth_manager import EmailAlreadyRegisteredError, SessionTokens, auth_manager
from services.auth.cookies import set_auth_cookies
from services.auth.login import LoginRequest, LoginResponse
from services.auth.password_service import verify_password
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

	try:
		tokens: SessionTokens = auth_manager.register(
			db=db,
			email=request.email.lower(),
			password=request.password,
			first_name=request.first_name,
			last_name=request.last_name,
		)
		set_auth_cookies(
			access_token=tokens.access_token,
			refresh_token=tokens.refresh_token,
			refresh_expires_at=tokens.refresh_expires_at,
		)

		return SignupResponse(message='Signup Successful')
	except EmailAlreadyRegisteredError:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT, detail='A user with this email already exists'
		)
