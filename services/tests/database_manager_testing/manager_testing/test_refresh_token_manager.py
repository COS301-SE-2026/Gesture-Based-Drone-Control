import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from services.database_manager.managers.refresh_token_manager import refresh_token_manager
from services.database_manager.models.refresh_tokens import RefreshToken


class TestCreate:
	@pytest.mark.asyncio
	async def test_create(self):
		db = AsyncMock()
		user_id = uuid.uuid4()
		expires_at = datetime.now(timezone.utc) + timedelta(days=1)

		token = await refresh_token_manager.create(
			db=db, user_id=user_id, token_hash='hashed-token', expires_at=expires_at
		)

		db.add.assert_called_once()
		db.flush.assert_awaited_once()
		added_token = db.add.call_args.args[0]

		assert added_token.user_id == user_id
		assert added_token.token_hash == 'hashed-token'
		assert added_token.expires_at == expires_at
		assert token is added_token


class TestGetByValidHash:
	@pytest.mark.asyncio
	async def test_returns_token_when_found(self):
		db = AsyncMock()

		token = RefreshToken(
			user_id=uuid.uuid4(), token_hash='hash', expires_at=datetime.now(timezone.utc)
		)

		result = MagicMock()
		result.scalar_one_or_none.return_value = token
		db.execute.return_value = result

		returned = await refresh_token_manager.get_valid_by_hash(db=db, token_hash='hash')

		db.execute.assert_awaited_once()
		result.scalar_one_or_none.assert_called_once()
		assert returned is token

	@pytest.mark.aasyncio
	async def test_returns_none_when_not_found(self):
		db = AsyncMock()
		result = MagicMock()
		result.scalar_one_or_none.return_value = None
		db.execute.return_value = result

		returned = await refresh_token_manager.get_valid_by_hash(db=db, token_hash='hash')

		db.execute.assert_awaited_once()
		result.scalar_one_or_none.assert_called_once()
		assert returned is None


class TestMarkUsed:
	@pytest.mark.asyncio
	async def test_mark_used(self):
		db = AsyncMock()
		token = RefreshToken(
			user_id=uuid.uuid4(), token_hash='hash', expires_at=datetime.now(timezone.utc)
		)
		assert token.last_used_at is None
		await refresh_token_manager.mark_used(db=db, token=token)
		assert token.last_used_at is not None
		assert isinstance(token.last_used_at, datetime)
		assert token.last_used_at.tzinfo == timezone.utc
		db.flush.assert_awaited_once()


class TestRevoke:
	@pytest.mark.asyncio
	async def test_revoke(self):
		db = AsyncMock()
		token = RefreshToken(
			user_id=uuid.uuid4(), token_hash='hash', expires_at=datetime.now(timezone.utc)
		)
		await refresh_token_manager.revoke(db=db, token=token)
		assert token.revoked is True
		db.flush.assert_awaited_once()


class TestDeleteByHash:
	@pytest.mark.asyncio
	async def test_delete_by_hash(self):
		db = AsyncMock()

		await refresh_token_manager.delete_by_hash(db=db, token_hash='hash')
		db.execute_assert_awaited_once()


class TestDeleteAllByUser:
	@pytest.mark.asyncio
	async def test_delete_by_hash(self):
		db = AsyncMock()
		user_id = uuid.uuid4()

		await refresh_token_manager.delete_all_for_user(db=db, user_id=user_id)
		db.execute_assert_awaited_once()
