from __future__ import annotations

from typing import Annotated

from fastapi import (
	APIRouter,
	Cookie,
	Depends,
	HTTPException,
	Response,
	status,
)  # thingie that organizes the endpoints
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.auth_manager import (
	EmailAlreadyRegisteredError,
	InvalidAccessTokenError,
	InvalidCredentialsError,
	InvalidRefreshTokenError,
	SessionTokens,
	auth_manager,
)
from services.auth.auth_settings import get_auth_settings
from services.auth.cookies import clear_auth_cookies, set_auth_cookies
from services.auth.schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse
from services.database_manager.database import get_db

settings = get_auth_settings()
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
	response: Response,
	db: Annotated[AsyncSession, Depends(get_db)],
	refresh_token: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
):
	if refresh_token is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED, detail='No refresh token provided'
		)

	try:
		tokens: SessionTokens = await auth_manager.refresh(db=db, refresh_token=refresh_token)

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
	response: Response,
	db: Annotated[AsyncSession, Depends(get_db)],
	refresh_token: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
):
	if refresh_token is None:
		clear_auth_cookies(response=response)
		return AuthResponse(message='Logout Succesful')

	try:
		await auth_manager.logout(db=db, refresh_token=refresh_token)

		clear_auth_cookies(response=response)

		return AuthResponse(message='Logout Successful')
	except InvalidRefreshTokenError as e:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get('/me', response_model=UserResponse)
async def me(
	db: Annotated[AsyncSession, Depends(get_db)],
	access_token: Annotated[str | None, Cookie(alias=settings.access_cookie_name)] = None,
):
	if access_token is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED, detail='No access token provided'
		)

	try:
		return await auth_manager.get_user_from_access_token(db=db, access_token=access_token)
	except InvalidAccessTokenError as ex:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ex))
