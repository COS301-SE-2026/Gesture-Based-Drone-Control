from datetime import datetime, timezone

from fastapi import Response

from services.auth.auth_settings import AuthSettings


def set_auth_cookies(
	response: Response,
	*,
	access_token: str,
	refresh_token: str,
	refresh_expires_at: datetime,
) -> None:
	settings = AuthSettings()
	access_max_age = settings.access_token_expire_minutes * 60
	refresh_max_age = int((refresh_expires_at - datetime.now(timezone.utc)).total_seconds())
	common = dict(
		httponly=True,
		secure=settings.cookie_secure,
		samesite=settings.cookie_samesite,
		domain=settings.cookie_domain,
		path='/',
	)

	response.set_cookie(settings.access_cookie_name, access_token, max_age=access_max_age, **common)

	response.set_cookie(
		settings.refresh_cookie_name, refresh_token, max_age=refresh_max_age, **common
	)


def clear_auth_cookies(response: Response, *, settings: AuthSettings) -> None:
	response.delete_cookies(settings.access_cookie_name, path='/', domain=settings.cookie_domain)
	response.delete_cookies(settings.refresh_cookie_name, path='/', domain=settings.cookie_domain)
