import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from services.database_manager.models.users import User


async def test_create_user_minimal_fields(session):
	# NOSONAR
	user = User(email='test@example.com', hashed_password='hashed')
	session.add(user)
	await session.commit()

	assert isinstance(user.id, uuid.UUID)
	assert user.is_active is True
	assert user.first_name is None
	assert user.last_name is None


async def test_email_uniqueness_enforced(session):
	# NOSONAR
	session.add(User(email='test@example.com', hashed_password='hashed'))
	await session.commit()

	# NOSONAR
	session.add(User(email='test@example.com', hashed_password='hashed'))
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_email_required(session):
	# NOSONAR
	session.add(User(hashed_password='a'))
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_password_required(session):
	# NOSONAR
	session.add(User(email='example@email.com'))
	with pytest.raises(IntegrityError):
		await session.commit()


async def test_is_active_can_be_overriden(session):
	# NOSONAR
	user = User(email='test@example.com', hashed_password='hashed', is_active=False)
	session.add(user)
	await session.commit()
	assert user.is_active is False


async def test_flight_summaries_relationship_empty_by_default(session):
	# NOSONAR
	user = User(email='test@example.com', hashed_password='hashed', is_active=False)
	session.add(user)
	await session.commit()
	await session.refresh(user, attribute_names=['flight_summaries'])
	assert user.flight_summaries == []
