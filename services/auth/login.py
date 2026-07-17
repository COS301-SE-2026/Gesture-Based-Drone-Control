from __future__ import annotations

from pydantic import BaseModel


class LoginResponse(BaseModel):
	message: str
