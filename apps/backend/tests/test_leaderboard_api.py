import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.backend.app.api.leaderboard import get_current_user_id, router
from services.database_manager.database import get_db


def make_app(db: AsyncMock, user_id: uuid.UUID) -> FastAPI:
	app = FastAPI()
	app.include_router(router)

	app.dependency_overrides[get_db] = lambda: db
	app.dependency_overrides[get_current_user_id] = lambda: user_id

	return app


# mock the DB since we only want to test the API endpoints
@pytest.fixture
def db():
	mock = AsyncMock()
	return mock


@pytest.fixture
def user_id():
	return uuid.uuid4()


def test_submit_score_success(db, user_id):
	"""basically the same as the db tests"""
	client = TestClient(make_app(db, user_id))

	entry_id = uuid.uuid4()
	created_at = datetime.now(timezone.utc)

	mock_entry = MagicMock()
	mock_entry.id = entry_id
	mock_entry.game_id = 'flappy-drone'
	mock_entry.score = 1234
	mock_entry.display_name = None
	mock_entry.created_at = created_at

	with patch(
		'apps.backend.app.api.leaderboard.leaderboard_manager.submit_score',
		new=AsyncMock(return_value=mock_entry),
	) as mock_submit:
		response = client.post(
			'/leaderboard/scores',
			json={
				'game_id': 'flappy-drone',
				'score': 1234,
			},
		)

	assert response.status_code == 201
	body = response.json()

	assert body['id'] == str(entry_id)
	assert body['game_id'] == 'flappy-drone'
	assert body['score'] == 1234
	assert body['display_name'] is None

	mock_submit.assert_awaited_once_with(
		db,
		user_id=user_id,
		game_id='flappy-drone',
		score=1234,
	)


def test_set_display_name_success(db, user_id):
	client = TestClient(make_app(db, user_id))

	entry_id = uuid.uuid4()
	created_at = datetime.now(timezone.utc)

	mock_entry = MagicMock()
	mock_entry.id = entry_id
	mock_entry.game_id = 'flappy-drone'
	mock_entry.score = 1234
	mock_entry.display_name = 'Shavir'
	mock_entry.created_at = created_at

	with patch(
		'apps.backend.app.api.leaderboard.leaderboard_manager.set_display_name',
		new=AsyncMock(return_value=mock_entry),
	) as mock_set_name:
		response = client.patch(
			f'/leaderboard/scores/{entry_id}/name',
			json={'display_name': 'Shavir'},
		)

	assert response.status_code == 200
	body = response.json()

	assert body['id'] == str(entry_id)
	assert body['game_id'] == 'flappy-drone'
	assert body['score'] == 1234
	assert body['display_name'] == 'Shavir'

	mock_set_name.assert_awaited_once_with(
		db,
		entry_id=entry_id,
		user_id=user_id,
		display_name='Shavir',
	)


def test_set_display_name_not_found(db, user_id):
	client = TestClient(make_app(db, user_id))

	entry_id = uuid.uuid4()

	with patch(
		'apps.backend.app.api.leaderboard.leaderboard_manager.set_display_name',
		new=AsyncMock(return_value=None),
	) as mock_set_name:
		response = client.patch(
			f'/leaderboard/scores/{entry_id}/name',
			json={'display_name': 'Shavir'},
		)

	assert response.status_code == 404
	assert response.json()['detail'] == 'Score not found'

	mock_set_name.assert_awaited_once_with(
		db,
		entry_id=entry_id,
		user_id=user_id,
		display_name='Shavir',
	)


def test_set_display_name_invalid_entry_id(db, user_id):
	client = TestClient(make_app(db, user_id))

	response = client.patch(
		'/leaderboard/scores/not-a-uuid/name',
		json={'display_name': 'Shavir'},
	)

	assert response.status_code == 422


def test_get_top_scores_success(db, user_id):
	client = TestClient(make_app(db, user_id))

	entries = []

	for score in [1000, 750, 500]:
		entry = MagicMock()
		entry.id = uuid.uuid4()
		entry.game_id = 'flappy-drone'
		entry.score = score
		entry.display_name = None
		entry.created_at = datetime.now(timezone.utc)
		entries.append(entry)

	with patch(
		'apps.backend.app.api.leaderboard.leaderboard_manager.top_scores',
		new=AsyncMock(return_value=entries),
	) as mock_top_scores:
		response = client.get(
			'/leaderboard/scores/flappy-drone',
		)

	assert response.status_code == 200
	body = response.json()

	assert len(body) == 3
	assert [entry['score'] for entry in body] == [1000, 750, 500]

	mock_top_scores.assert_awaited_once_with(
		db,
		game_id='flappy-drone',
		limit=20,
		user_id=user_id,
	)


def test_get_top_scores_custom_limit(db, user_id):
	client = TestClient(make_app(db, user_id))

	with patch(
		'apps.backend.app.api.leaderboard.leaderboard_manager.top_scores',
		new=AsyncMock(return_value=[]),
	) as mock_top_scores:
		response = client.get(
			'/leaderboard/scores/flappy-drone?limit=5',
		)

	assert response.status_code == 200
	assert response.json() == []

	mock_top_scores.assert_awaited_once_with(
		db,
		game_id='flappy-drone',
		limit=5,
		user_id=user_id,
	)


def test_get_top_scores_empty(db, user_id):
	client = TestClient(make_app(db, user_id))

	with patch(
		'apps.backend.app.api.leaderboard.leaderboard_manager.top_scores',
		new=AsyncMock(return_value=[]),
	):
		response = client.get('/leaderboard/scores/flappy-drone')

	assert response.status_code == 200
	assert response.json() == []
