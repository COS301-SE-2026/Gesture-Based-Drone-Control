from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from services.auth.cookies import (
	clear_auth_cookies,
	set_auth_cookies,
)


class TestSetAuthCookies:
	@patch('services.auth.cookies.AuthSettings')
	def test_set_both_cookies(self, mock_settings):
		settings = mock_settings.return_value
		settings.access_token_expire_minutes = 15
		settings.cookie_secure = False
		settings.cookie_samesite = 'lax'
		settings.cookie_domain = None
		settings.access_cookie_name = 'access_token'
		settings.refresh_cookie_name = 'refresh_token'
		response = MagicMock()
		expires = datetime.now(timezone.utc) + timedelta(days=1)

		set_auth_cookies(
			response, access_token='access', refresh_token='refresh', refresh_expires_at=expires
		)
		assert response.set_cookie.call_count == 2
		response.set_cookie.assert_any_call(
			'access_token',
			'access',
			max_age=900,
			httponly=True,
			secure=False,
			samesite='lax',
			domain=None,
			path='/',
		)
		_, refresh_call = response.set_cookie.call_args_list
		assert refresh_call.args == ('refresh_token', 'refresh')
		assert refresh_call.kwargs['httponly'] is True
		assert refresh_call.kwargs['secure'] is False
		assert refresh_call.kwargs['samesite'] == 'lax'
		assert refresh_call.kwargs['domain'] is None
		assert refresh_call.kwargs['path'] == '/'
		assert refresh_call.kwargs['max_age'] > 0


class TestClearAuthCookies:
	@patch('services.auth.cookies.AuthSettings')
	def test_clears_both_cookies(self, mock_settings):
		settings = mock_settings.return_value
		settings.access_cookie_name = 'access_cookie'
		settings.refresh_cookie_name = 'refresh_cookie'
		settings.cookie_domain = None

		response = MagicMock()

		clear_auth_cookies(response)

		assert response.delete_cookie.call_count == 2
		response.delete_cookie.assert_any_call('access_cookie', path='/', domain=None)

		response.delete_cookie.assert_any_call('refresh_cookie', path='/', domain=None)
