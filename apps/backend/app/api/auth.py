from __future__ import annotations

from fastapi import APIRouter  # thingie that organizes the endpoints

from services.auth.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=LoginResponse)  # so this is da login endpoint
async def login(payload: LoginRequest):
	return LoginResponse(message='Validation passed yaay')
