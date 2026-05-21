# unit testing for async_queue.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_async_queue.py -v

import asyncio
import os
import sys
import threading

import pytest

# add services/ to sys.path so cv_pipeline.* imports resolve
_services_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, _services_dir)

from cv_pipeline.processing.async_queue import BoundedFrameQueue  # noqa: E402


# constrcution
class TestConstruction:
	def test_default_maxsize(self):
		q = BoundedFrameQueue[int]()
		assert q.maxsize == 2

	def test_custom_maxsize(self):
		q = BoundedFrameQueue[int](maxsize=5)
		assert q.maxsize == 5

	def test_zero_maxsize_rejected(self):
		with pytest.raises(ValueError, match='maxsize must be >= 1'):
			BoundedFrameQueue[int](maxsize=0)

	def test_negative_maxsize_rejected(self):
		with pytest.raises(ValueError, match='maxsize must be >= 1'):
			BoundedFrameQueue[int](maxsize=-1)

	def test_starts_empty(self):
		q = BoundedFrameQueue[int]()
		assert q.empty() is True
		assert q.full() is False
		assert q.qsize() == 0
		assert q.drop_count == 0


# try_put_nowait
class TestTryPutNowait:
	@pytest.mark.asyncio
	async def test_put_returns_true_on_success(self):
		q = BoundedFrameQueue[int](maxsize=2)
		assert q.try_put_nowait(1) is True
		assert q.qsize() == 1

	@pytest.mark.asyncio
	async def test_put_fills_to_maxsize(self):
		q = BoundedFrameQueue[int](maxsize=2)
		q.try_put_nowait(1)
		q.try_put_nowait(2)
		assert q.full() is True
		assert q.drop_count == 0

	@pytest.mark.asyncio
	async def test_put_when_full_evicts_oldest(self):
		q = BoundedFrameQueue[int](maxsize=2)
		q.try_put_nowait(1)
		q.try_put_nowait(2)
		# third put — should evict 1
		assert q.try_put_nowait(3) is True
		assert q.qsize() == 2
		assert q.drop_count == 1

	@pytest.mark.asyncio
	async def test_drain_after_drop_preserves_newer_items(self):
		"""After drop-oldest, the queue should hold the two most recent items in order."""
		q = BoundedFrameQueue[int](maxsize=2)
		q.try_put_nowait(1)
		q.try_put_nowait(2)
		q.try_put_nowait(3)  # evicts 1
		a = await q.get()
		b = await q.get()
		assert a == 2
		assert b == 3


# drop counter
class TestDropCount:
	@pytest.mark.asyncio
	async def test_drop_count_starts_at_zero(self):
		q = BoundedFrameQueue[int](maxsize=1)
		assert q.drop_count == 0

	@pytest.mark.asyncio
	async def test_drop_count_accumulates(self):
		q = BoundedFrameQueue[int](maxsize=1)
		q.try_put_nowait(1)
		q.try_put_nowait(2)  # +1 drop
		q.try_put_nowait(3)  # +1 drop
		q.try_put_nowait(4)  # +1 drop
		assert q.drop_count == 3
		assert q.qsize() == 1

	@pytest.mark.asyncio
	async def test_no_drop_when_consumer_keeps_up(self):
		q = BoundedFrameQueue[int](maxsize=1)
		q.try_put_nowait(1)
		await q.get()
		q.try_put_nowait(2)
		await q.get()
		assert q.drop_count == 0


# get + get_with_timeout
class TestGet:
	@pytest.mark.asyncio
	async def test_get_returns_queued_item(self):
		q = BoundedFrameQueue[str](maxsize=2)
		q.try_put_nowait('hello')
		assert await q.get() == 'hello'

	@pytest.mark.asyncio
	async def test_get_fifo_order(self):
		q = BoundedFrameQueue[int](maxsize=3)
		for n in [10, 20, 30]:
			q.try_put_nowait(n)
		assert await q.get() == 10
		assert await q.get() == 20
		assert await q.get() == 30


class TestGetWithTimeout:
	@pytest.mark.asyncio
	async def test_returns_item_within_timeout(self):
		q = BoundedFrameQueue[int](maxsize=1)
		q.try_put_nowait(42)
		assert await q.get_with_timeout(1.0) == 42

	@pytest.mark.asyncio
	async def test_returns_none_after_timeout(self):
		q = BoundedFrameQueue[int](maxsize=1)
		result = await q.get_with_timeout(0.05)
		assert result is None


# try_put_threadsafe — cross-thread put
class TestTryPutThreadsafe:
	@pytest.mark.asyncio
	async def test_item_pushed_from_thread_arrives(self):
		"""Simulates the camera thread pushing frames into the queue."""
		q = BoundedFrameQueue[int](maxsize=2)
		loop = asyncio.get_running_loop()

		def producer():
			q.try_put_threadsafe(99, loop)

		thread = threading.Thread(target=producer)
		thread.start()
		thread.join()

		# call_soon_threadsafe schedules — give the loop a tick to run it
		item = await asyncio.wait_for(q.get(), timeout=1.0)
		assert item == 99

	@pytest.mark.asyncio
	async def test_multiple_threaded_puts_arrive_in_order(self):
		"""Single producer thread, multiple puts — order preserved."""
		q = BoundedFrameQueue[int](maxsize=5)
		loop = asyncio.get_running_loop()

		def producer():
			for n in [1, 2, 3]:
				q.try_put_threadsafe(n, loop)

		thread = threading.Thread(target=producer)
		thread.start()
		thread.join()

		results = []
		for _ in range(3):
			results.append(await asyncio.wait_for(q.get(), timeout=1.0))
		assert results == [1, 2, 3]


# state helpers
class TestStateHelpers:
	@pytest.mark.asyncio
	async def test_empty_reflects_state(self):
		q = BoundedFrameQueue[int](maxsize=2)
		assert q.empty() is True
		q.try_put_nowait(1)
		assert q.empty() is False
		await q.get()
		assert q.empty() is True

	@pytest.mark.asyncio
	async def test_full_reflects_state(self):
		q = BoundedFrameQueue[int](maxsize=2)
		assert q.full() is False
		q.try_put_nowait(1)
		assert q.full() is False
		q.try_put_nowait(2)
		assert q.full() is True

	@pytest.mark.asyncio
	async def test_qsize_tracks_count(self):
		q = BoundedFrameQueue[int](maxsize=3)
		assert q.qsize() == 0
		q.try_put_nowait(1)
		q.try_put_nowait(2)
		assert q.qsize() == 2
		await q.get()
		assert q.qsize() == 1
