from __future__ import annotations

import uuid

import pytest

from services.database_manager.managers.user_manager import user_manager

pytestmark = pytest.mark.asyncio


@pytest.fixture
def user_payload() -> dict:
	return {
		'email': 'jsmith@example.com',
		'password': 'S3curePassword!',
		'first_name': 'J',
		'last_name': 'Smith',
	}


class TestUserManagerCreate:
	async def test_create_persists_user_to_db(self, session, user_payload):
		created = await user_manager.create(session, **user_payload)

		fetched = await user_manager.get_by_email(session, user_payload['email'])

		assert fetched is not None
		assert fetched.id == created.id
		assert fetched.email == user_payload['email']
		assert fetched.first_name == user_payload['first_name']
		assert fetched.last_name == user_payload['last_name']

	async def test_create_assigns_uuid_primary_key(self, session, user_payload):
		created = await user_manager.create(session, **user_payload)

		assert isinstance(created.id, uuid.UUID)

	async def test_create_hashes_password(self, session, user_payload):
		created = await user_manager.create(session, **user_payload)

		assert created.hashed_password != user_payload['password']
		assert created.hashed_password
		assert len(created.hashed_password) > len(user_payload['password'])

	async def test_is_active_defaults_true(self, session, user_payload):
		created = await user_manager.create(session, **user_payload)

		assert created.is_active is True
