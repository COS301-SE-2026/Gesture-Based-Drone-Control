from __future__ import annotations

from typing import Annotated

from fastapi import (
	APIRouter,
	Depends,
	HTTPException,
	Response,
	status,
)  # thingie that organizes the endpoints
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.auth_manager import (
	EmailAlreadyRegisteredError,
	InvalidCredentialsError,
	InvalidRefreshTokenError,
	SessionTokens,
	auth_manager,
)
from services.auth.cookies import clear_auth_cookies, set_auth_cookies
from services.auth.schemas import AuthResponse, LoginRequest, RefreshRequest, SignupRequest
from services.database_manager.database import get_db

router = APIRouter(prefix='/auth', tags=['auth'])


@router.get('/health')
async def health():
	return {'status': 'ok'}


@router.post('/login', response_model=AuthResponse)  # so this is da login endpoint
async def login(
	payload: LoginRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]
):

	try:
		tokens: SessionTokens = await auth_manager.authenticate(
			email=payload.email.lower(), password=payload.password, db=db
		)
		set_auth_cookies(
			access_token=tokens.access_token,
			refresh_token=tokens.refresh_token,
			refresh_expires_at=tokens.refresh_expires_at,
			response=response,
		)
		return AuthResponse(message='Login is succesful')
	except InvalidCredentialsError:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password'
		)


@router.post('/signup', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
	request: SignupRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]
):

	try:
		tokens: SessionTokens = await auth_manager.register(
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
			response=response,
		)

		return AuthResponse(message='Signup Successful')
	except EmailAlreadyRegisteredError:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT, detail='A user with this email already exists'
		)


@router.post('/refresh', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def refresh(
	request: RefreshRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]
):

	try:
		tokens: SessionTokens = await auth_manager.refresh(
			db=db, refresh_token=request.refresh_token
		)

		set_auth_cookies(
			access_token=tokens.access_token,
			refresh_token=tokens.refresh_token,
			refresh_expires_at=tokens.refresh_expires_at,
			response=response,
		)

		return AuthResponse(message='Token Refresh Successful')
	except InvalidRefreshTokenError as e:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post('/logout', response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def logout(
	request: RefreshRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]
):
	try:
		await auth_manager.logout(db=db, refresh_token=request.refresh_token)

		clear_auth_cookies(response=response)

		return AuthResponse(message='Logout Successful')
	except InvalidRefreshTokenError as e:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
