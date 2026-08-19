"""
GestureStream shares one CvPipeline (one camera) across all WebSocket clients:
lazy-starts on first subscribe, fans events out via per-client drop-oldest queues,
stops on last unsubscribe.
Pipeline is faked so tests run with no camera and fast/deterministic
"""

import asyncio
import contextlib
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import pytest
from app.cv.serialization import GestureFramePayload
from app.cv.stream import GestureStream

from services.cv_pipeline.processing.pipeline import PipelineConfig

pytestmark = pytest.mark.asyncio

# fakes


@dataclass
class FakeEvent:
	frame_index: int = 0


class FakeCvPipeline:
	"""
	Drop-in for pipeline, events() yields FakeEvent objects on a short interval until
	stop() is called, so tests can await a few ticks and then assert on what was broadcasted
	"""

	instances: list['FakeCvPipeline'] = []

	def __init__(self, config: Optional[PipelineConfig] = None) -> None:
		self.config = config
		self.started = False
		self.stopped = False
		self._running = False
		self._frame_index = 0
		FakeCvPipeline.instances.append(self)

	async def start(self) -> None:
		await asyncio.sleep(0)
		self.started = True
		self._running = True

	async def stop(self) -> None:
		await asyncio.sleep(0)
		self.stopped = True
		self._running = False

	async def events(self) -> AsyncIterator[FakeEvent]:
		while self._running:
			self._frame_index += 1
			yield FakeEvent(frame_index=self._frame_index)
			await asyncio.sleep(0.005)

	def simulate_camera_death(self) -> None:
		self._running = False


@pytest.fixture(autouse=True)
def reset_fake_pipeline_instances():
	FakeCvPipeline.instances.clear()
	yield
	FakeCvPipeline.instances.clear()


@pytest.fixture
def patch_pipeline(monkeypatch):
	"""
	Swap the real pipeline used inside streampy for the fake
	"""
	monkeypatch.setattr('app.cv.stream.CvPipeline', FakeCvPipeline)


@pytest.fixture
def patch_serialize(monkeypatch):
	"""
	serialize_event expects a real pipeline event shape; for stream-level tests
	we dont care about payload contents, only that a payload of the right type
	reaches subscribers, so stub to wrap fake event
	"""

	def fake_serialize(event: FakeEvent, include_frame: bool = False) -> GestureFramePayload:
		return GestureFramePayload(frame_index=event.frame_index, timestamp=0.0, fps=0.0, hands=[])

	monkeypatch.setattr('app.cv.stream.serialize_event', fake_serialize)


@pytest.fixture
def stream(patch_pipeline, patch_serialize) -> GestureStream:
	return GestureStream()


@pytest.fixture(autouse=True)
def fast_linger(monkeypatch):
	"""collapse the camera linger so lifecycle tests ddont wait 3s"""
	monkeypatch.setattr('app.cv.stream.LINGER_SECONDS', 0.01)


# tests
class TestLazyStartStop:
	async def test_not_running_before_any_subscriber(self, stream: GestureStream):
		await asyncio.sleep(0)
		assert stream.is_running is False
		assert stream.client_count == 0

	async def test_first_subscribe_starts_pipeline(self, stream: GestureStream):
		await stream.subscribe()
		assert stream.is_running is True
		assert len(FakeCvPipeline.instances) == 1
		assert FakeCvPipeline.instances[0].started is True

	async def test_second_subscribe_does_not_restart_pipeline(self, stream: GestureStream):
		await stream.subscribe()
		await stream.subscribe()
		# only one pipeline should ever have been made
		assert len(FakeCvPipeline.instances) == 1
		assert stream.client_count == 2

	async def test_unsubscribe_with_remaining_client_keeps_running(self, stream: GestureStream):
		q1 = await stream.subscribe()
		await stream.subscribe()
		await stream.unsubscribe(q1)
		assert stream.is_running is True
		assert stream.client_count == 1

	async def test_last_unsubscribe_stops_pipeline(self, stream: GestureStream):
		q1 = await stream.subscribe()
		await stream.unsubscribe(q1)
		await asyncio.sleep(0.05)
		assert stream.is_running is False
		assert FakeCvPipeline.instances[0].stopped is True

	async def test_resubscribe_after_full_stop_starts_fresh_pipeline(self, stream: GestureStream):
		q1 = await stream.subscribe()
		await stream.unsubscribe(q1)
		await asyncio.sleep(0.05)
		assert stream.is_running is False

		await stream.subscribe()
		assert stream.is_running is True
		assert len(FakeCvPipeline.instances) == 2  # a new pipeline instance was created

	async def test_shutdown_force_stops_regardless_of_clients(self, stream: GestureStream):
		await stream.subscribe()
		await stream.subscribe()
		assert stream.client_count == 2

		await stream.shutdown()
		assert stream.is_running is False
		assert stream.client_count == 0

	async def test_resubscribe_within_linger_keeps_same_pipeline(self, stream: GestureStream):
		q1 = await stream.subscribe()
		await stream.unsubscribe(q1)
		await stream.subscribe()
		await asyncio.sleep(0.05)
		assert stream.is_running is True
		assert len(FakeCvPipeline.instances) == 1


class TestBroadcastFanOut:
	async def test_all_subscribed_clients_receive_payloads(self, stream: GestureStream):
		q1 = await stream.subscribe()
		q2 = await stream.subscribe()

		payload1 = await asyncio.wait_for(q1.get(), timeout=2)
		payload2 = await asyncio.wait_for(q2.get(), timeout=2)

		assert isinstance(payload1, GestureFramePayload)
		assert isinstance(payload2, GestureFramePayload)

	async def test_queue_never_exceeds_maxsize_one(self, stream: GestureStream):
		"""Drop-oldest: a client that never drains its queue should never block the broadcaster."""
		q = await stream.subscribe()
		# let several broadcast cycles pass without ever calling q.get()
		await asyncio.sleep(0.05)
		assert q.qsize() <= 1

	async def test_slow_client_does_not_block_fast_client(self, stream: GestureStream):
		fast = await stream.subscribe()
		slow = await stream.subscribe()  # never drained

		# drain "fast" repeatedly; it should keep receiving fresh payloads
		# even though "slow" is never drained and would otherwise back up
		seen = []
		for _ in range(3):
			payload = await asyncio.wait_for(fast.get(), timeout=2)
			seen.append(payload.frame_index)

		assert len(seen) == 3
		assert slow.qsize() <= 1  # slow client's queue capped, never grew unbounded


class TestUnsubscribeIsIdempotentAndSafe:
	async def test_unsubscribe_unknown_queue_does_not_raise(self, stream: GestureStream):
		stray_queue: asyncio.Queue = asyncio.Queue(maxsize=1)
		# never subscribed -- should not raise even though it's not in _clients
		await stream.unsubscribe(stray_queue)

	async def test_double_unsubscribe_does_not_raise(self, stream: GestureStream):
		q = await stream.subscribe()
		await stream.unsubscribe(q)
		await stream.unsubscribe(q)  # second call should be a no-op, not an error
		await asyncio.sleep(0.05)
		assert stream.is_running is False


class FailingCvPipeline(FakeCvPipeline):
	"""Camera is busy: start() raises the way CameraFeed does when the device is held."""

	async def start(self) -> None:
		await asyncio.sleep(0)
		raise RuntimeError('Failed to open camera index 0 after 4 attempts')


class TestStartFailure:
	async def test_failed_start_does_not_latch_a_dead_pipeline(self, monkeypatch, patch_serialize):
		"""
		Regression: _pipeline used to be assigned before start() succeeded, so a
		busy camera left a dead object in place and every later subscribe()
		short-circuited on `if self._pipeline is not None`. The stream stayed
		broken until the backend restarted.
		"""
		monkeypatch.setattr('app.cv.stream.CvPipeline', FailingCvPipeline)
		stream = GestureStream()

		with pytest.raises(RuntimeError):
			await stream.subscribe()

		assert stream.is_running is False
		assert stream.client_count == 0
		assert 'camera' in stream.last_error

	async def test_next_subscribe_retries_after_a_failed_start(self, monkeypatch, patch_serialize):
		monkeypatch.setattr('app.cv.stream.CvPipeline', FailingCvPipeline)
		stream = GestureStream()
		with pytest.raises(RuntimeError):
			await stream.subscribe()

		# camera freed up
		monkeypatch.setattr('app.cv.stream.CvPipeline', FakeCvPipeline)
		await stream.subscribe()

		assert stream.is_running is True
		assert stream.last_error is None


class TestBroadcastFailure:
	async def test_clients_are_told_when_the_broadcast_dies(self, monkeypatch, patch_pipeline):
		def boom(event, include_frame=False):
			raise ValueError('jpeg encode failed')

		monkeypatch.setattr('app.cv.stream.serialize_event', boom)
		stream = GestureStream()
		queue = await stream.subscribe()

		# None is the end-of-stream sentinel the WS handler closes on
		assert await asyncio.wait_for(queue.get(), timeout=2) is None

		await asyncio.sleep(0.05)
		assert stream.is_running is False
		assert 'jpeg encode failed' in stream.last_error

	async def test_clients_are_told_when_the_pipeline_stops_producing(self, stream):
		queue = await stream.subscribe()
		await asyncio.wait_for(queue.get(), timeout=2)

		# camera death: events() ends without stop() being called
		FakeCvPipeline.instances[0].simulate_camera_death()

		for _ in range(50):
			payload = await asyncio.wait_for(queue.get(), timeout=2)
			if payload is None:
				return
			pytest.fail('pipeline stopped producing but clients were never sent the sentinel')


class TestOrphanReap:
	async def test_orphaned_pipeline_is_replaced_on_next_subscribe(self, stream):
		"""
		If a scheduled stop never runs (its task was cancelled, or under
		TestClient its loop died), the pipeline stays assigned with nothing
		driving it. The next subscriber must get a fresh one, not a dead queue.
		"""
		await stream.subscribe()
		stale = FakeCvPipeline.instances[0]

		task = stream._broadcast_task  # NOSONAR - simulating a dead broadcaster
		task.cancel()
		with contextlib.suppress(asyncio.CancelledError):
			await task

		await stream.subscribe()

		assert len(FakeCvPipeline.instances) == 2
		assert stale.stopped is True
		assert stream.is_running is True


class TestIdleBehaviour:
	async def test_no_serialisation_while_no_clients(self, monkeypatch, patch_pipeline):
		"""
		During the linger window the camera is still capturing, but encoding a
		JPEG per frame for nobody starved the event loop badly enough to delay
		the 3s linger to ~16s.
		"""
		calls = 0

		def counting(event, include_frame=False):
			nonlocal calls
			calls += 1
			return GestureFramePayload(
				frame_index=event.frame_index, timestamp=0.0, fps=0.0, hands=[]
			)

		monkeypatch.setattr('app.cv.stream.serialize_event', counting)
		monkeypatch.setattr('app.cv.stream.LINGER_SECONDS', 5.0)

		stream = GestureStream()
		queue = await stream.subscribe()
		await asyncio.wait_for(queue.get(), timeout=2)
		await stream.unsubscribe(queue)

		before = calls
		await asyncio.sleep(0.1)
		assert stream.is_running is True
		assert calls == before

		await stream.shutdown()

	async def test_shutdown_without_a_pipeline_is_a_noop(self, stream):
		await stream.shutdown()
		assert stream.is_running is False
