from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

class AuthSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file = ".env", extra = "ignore")

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "gbdc"
    jwt_audience: str = 'gesture drone control clients'
    access_token_expire_minutes: int = 15

    refresh_token_expire_days: int = 1
    refresh_token_bytes: int = 32