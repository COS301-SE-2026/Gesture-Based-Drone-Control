from __future__ import annotations
from pydantic import BaseModel,EmailStr,field_validator
from services.auth.schemas import validate_password_strength

class LoginRequest(BaseModel):
    email:EmailStr
    password:str

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)
    
class LoginResponse(BaseModel):
    message: str
    
