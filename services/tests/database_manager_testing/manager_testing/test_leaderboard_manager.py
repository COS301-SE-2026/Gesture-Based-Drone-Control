import uuid
from unittest.mock import MagicMock

import pytest
from unittest.mock import AsyncMock

from services.database_manager.managers.leaderboard_manager import LeaderboardManager


@pytest.fixture
def db():
    mock = AsyncMock()
    mock.add = MagicMock()
    return mock


@pytest.fixture
def manager():
    return LeaderboardManager()


async def test_submit_score_creates_entry(manager, db):
    """create the entry"""
    user_id = uuid.uuid4()

    result = await manager.submit_score(
        db,
        user_id=user_id,
        game_id='flappy-drone',
        score=1234,
    )

    db.add.assert_called_once()
    added_entry = db.add.call_args.args[0]

    assert added_entry.user_id == user_id
    assert added_entry.game_id == 'flappy-drone'
    assert added_entry.score == 1234

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(added_entry)
    assert result is added_entry


async def test_set_display_name_updates_existing(manager, db):
    user_id = uuid.uuid4()
    entry_id = uuid.uuid4()

    mock_entry = MagicMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = mock_entry
    db.execute.return_value = result_mock

    result = await manager.set_display_name(
        db,
        entry_id=entry_id,
        user_id=user_id,
        display_name=' Shavir',
    )

    assert mock_entry.display_name == 'Shavir'
    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(mock_entry)
    assert result is mock_entry


async def test_set_display_name_returns_none_when_entry_not_found(manager, db):
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute.return_value = result_mock

    result = await manager.set_display_name(
        db,
        entry_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        display_name='Shavir',
    )

    assert result is None
    db.execute.assert_awaited_once()
    db.commit.assert_not_awaited()
    db.refresh.assert_not_awaited()


async def test_set_display_name_truncates(manager, db):
    """Should limit to 24 chars"""
    mock_entry = MagicMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = mock_entry
    db.execute.return_value = result_mock

    long_name = 'a' * 30

    result = await manager.set_display_name(
        db,
        entry_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        display_name=long_name,
    )

    assert mock_entry.display_name == 'a' * 24
    assert result is mock_entry
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(mock_entry)


async def test_set_display_name_empty_name_sets_none(manager, db):
    mock_entry = MagicMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = mock_entry
    db.execute.return_value = result_mock

    result = await manager.set_display_name(
        db,
        entry_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        display_name='   ',
    )

    assert mock_entry.display_name is None
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(mock_entry)
    assert result is mock_entry


async def test_top_scores_returns_scores(manager, db):
    entries = [MagicMock(), MagicMock(), MagicMock()]

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = entries

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    db.execute.return_value = result_mock

    user_id = uuid.uuid4()

    result = await manager.top_scores(
        db,
        user_id=user_id,
        game_id='flappy-drone',
    )

    assert result == entries
    db.execute.assert_awaited_once()


async def test_top_scores_returns_empty_list_when_no_scores(manager, db):
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    db.execute.return_value = result_mock

    result = await manager.top_scores(
        db,
        user_id=uuid.uuid4(),
        game_id='flappy-drone',
    )

    assert result == []
    db.execute.assert_awaited_once()


async def test_top_scores_respects_limit(manager, db):
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    db.execute.return_value = result_mock

    await manager.top_scores(
        db,
        user_id=uuid.uuid4(),
        game_id='flappy-drone',
        limit=5,
    )

    db.execute.assert_awaited_once()

    # Verify that the generated query contains the requested limit
    query = db.execute.call_args.args[0]
    assert query._limit_clause is not None
    assert query._limit_clause.value == 5