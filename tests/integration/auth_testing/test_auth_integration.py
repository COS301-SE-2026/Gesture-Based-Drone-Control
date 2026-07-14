from __future__ import annotations
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from apps.backend.app.main import app
from services.auth.schemas import verify_password
from services.database_manager.database import get_db
from services.database_manager.managers.user_manager import user_manager

pytestmark = pytest.mark.asyncio

@pytest_asyncio.fixture
async def client(session):
    async def override_get_db():
        yield session
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

VALID_SIGNUP = {
    'email':'newuser@example.com',
    'password':'GoodPassword@123',
    'first_name':"Chinmayi",
    'last_name':"Santhosh",
}


async def test_signup_then_login_succeeds(client):
    signup_response = client.post('/api/auth/signup' , json=VALID_SIGNUP)
    assert signup_response.status_code == 201
    assert signup_response.json() =={'message':"Signup Successful"}

    login_response = client.post(
        '/api/auth/login',
        json = {'email': VALID_SIGNUP['email'],'password':VALID_SIGNUP['password']},
    )

    assert login_response.status_code == 200
    assert login_response.json() == {'message': 'Login is succesful'}


async def test_signup_duplicate_email_returns_409(client):
    client.post('/api/auth/signup', json=VALID_SIGNUP)

    duplicate_response = client.post('/api/auth/signup',json =VALID_SIGNUP)
    assert duplicate_response.status_code ==409


async def test_signup_weak_password_returns_422(client):
    weak_payload = {**VALID_SIGNUP,'password':'weak'}
    response = client.post('/api/auth/signup',json=weak_payload)
    assert response.status_code==422

async def test_login_wrong_password_returns_401(client):
    client.post('/api/auth/signup', json=VALID_SIGNUP)

    response = client.post(
        '/api/auth/login', json={'email':VALID_SIGNUP['email'],'password':"WrongPass123!"} ,
    )

    assert response.status_code ==401
    assert response.json()['detail']=='Invalid email or password'


async def test_login_nonexixtent_email_returns_401(client):
    response = client.post(
        '/api/auth/login',
        json={'email':'booiamaghost@example.com','password':'StrongPaswword@123'},

    )

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid email or password'


async def test_signup_stores_hashed_password_not_plaintextt(client,session):
    client.post('/api/auth/signup', json=VALID_SIGNUP)

    stored_user = await user_manager.get_by_email(session,VALID_SIGNUP['email'])
    assert stored_user is not None
    assert stored_user.hashed_password != VALID_SIGNUP['password']
    assert verify_password(VALID_SIGNUP['password'], stored_user.hashed_password)




