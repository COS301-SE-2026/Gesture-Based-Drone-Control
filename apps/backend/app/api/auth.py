from __future__ import annotations

from fastapi import APIRouter  # thingie that organizes the endpoints

from services.auth.schemas import LoginRequest, LoginResponse
from services.auth.signup import SignupRequest, SignupResponse

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=LoginResponse)  # so this is da login endpoint
async def login(payload: LoginRequest):
	return LoginResponse(message='Validation passed yaay')


@router.post('/signup', response_model=SignupResponse)
async def signup(payload: SignupRequest):
	return SignupResponse(message='Signup Successful')
