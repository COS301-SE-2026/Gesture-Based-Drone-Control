"""
Shares one pipeline (one webcame) across any number of Websocket clients.

The webcam can only be opened once, so we cant spin up a pipeline per connection.
Instead: first cleint to subscribe() starts pipeline; every event
gets fanned out to all subscribed clients via their own bounded, drop-oldest queue
(one slow browser can therefore not lag the others);
last client to unsubscribe() stops the pipeline and releases the camera
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Optional

from app.cv.serialization import GestureFramePayload, serialize_event

from services.cv_pipeline.processing.pipeline import CvPipeline, PipelineConfig

logger = logging.getLogger(__name__)

# how long camera stas open after last client disconnects
LINGER_SECONDS = 3.0

# client queue carries payloads or none (none=stream done close socket)
ClientQueue = 'asyncio.Queue[Optional[GestureFramePayload]]'


class GestureStream:
	"""
	Manages the lifecycle of a single shared pipeline for all clients.
	"""

	def __init__(self, config: Optional[PipelineConfig] = None) -> None:
		self._config = config
		self._pipeline: Optional[CvPipeline] = None
		self._broadcast_task: Optional[asyncio.Task] = None
		self._linger_task: Optional[asyncio.Task] = None
		self._teardown_task: Optional[asyncio.Task] = None
		self._clients: set[asyncio.Queue] = set()
		self._lock = asyncio.Lock()
		self._last_error: Optional[str] = None

	@property
	def client_count(self) -> int:
		return len(self._clients)

	@property
	def is_running(self) -> bool:
		return self._pipeline is not None

	@property
	def last_error(self) -> Optional[str]:
		"""WHy the camera last failed, surfaced on the sattus endpoint"""
		return self._last_error

	async def subscribe(self) -> 'asyncio.Queue[GestureFramePayload]':
		"""
		Register a new client queue and ensure the pipeline is running
		"""

		queue: asyncio.Queue = asyncio.Queue(maxsize=1)
		self._clients.add(queue)
		self._cancel_linger()

		try:
			await self._ensure_started()
		except Exception:
			self._clients.discard(queue)
			raise
		return queue

	async def unsubscribe(self, queue: 'asyncio.Queue[GestureFramePayload]') -> None:
		"""
		Remove a client queue and stop the pipeline if it was the last one
		"""
		self._clients.discard(queue)
		await asyncio.shield(self._schedule_stop_if_idle())

	async def shutdown(self) -> None:
		"""
		Force-stop regardless of clients Call this from app shutdown/lifespan
		"""
		self._clients.clear()
		self._cancel_linger()
		await self._stop_pipeline()

	def _is_orphaned(self) -> bool:
		task = self._broadcast_task
		return task is not None and task.done()

	async def _ensure_started(self) -> None:
		async with self._lock:
			if self._pipeline is not None and not self._is_orphaned():
				return
			if self._pipeline is not None:
				logger.warning('GestureStream found an oprhaned pipeline, restarting it')
				stale = self._pipeline
				self._pipeline = None
				with contextlib.suppress(Exception):
					await stale.stop()
			pipeline = CvPipeline(self._config)
			try:
				await pipeline.start()
			except Exception as exc:
				with contextlib.suppress(Exception):
					await pipeline.stop()
				self._last_error = str(exc)
				logger.exception('GestureStream failed to start pipeline: %s', exc)
				raise

			self._pipeline = pipeline
			self._last_error = None
			self._broadcast_task = asyncio.create_task(
				self._broadcast(), name='gesture-stream-broadcast'
			)
			logger.info('GestureStream started (camera opened)')

	def _cancel_linger(self) -> None:
		if self._linger_task is not None and not self._linger_task.done():
			self._linger_task.cancel()
		self._linger_task = None

	async def _schedule_stop_if_idle(self) -> None:  # NOSONAR
		if self._clients or self._pipeline is None:
			return
		if self._linger_task is not None and not self._linger_task.done():
			return
		self._linger_task = asyncio.create_task(
			self._linger_then_stop(), name='gesture-stream-linger'
		)

	async def _linger_then_stop(self) -> None:
		try:
			await asyncio.sleep(LINGER_SECONDS)
		except asyncio.CancelledError:  # NOSONAR
			raise  # NOSONAR
		if self._clients:
			return
		await self._stop_pipeline()
		logger.info('Gesture stopped (idle for %.1fs)', LINGER_SECONDS)

	async def _stop_pipeline(self) -> None:
		async with self._lock:
			if self._pipeline is None:
				return

			task = self._broadcast_task
			self._broadcast_task = None
			if task is not None and task is not asyncio.current_task():
				task.cancel()
				with contextlib.suppress(asyncio.CancelledError):
					await task

			pipeline = self._pipeline
			self._pipeline = None
			await asyncio.shield(pipeline.stop())

	def _fan_out(self, payload: Optional[GestureFramePayload]) -> None:
		for queue in self._clients:
			if queue.full():
				with contextlib.suppress(asyncio.QueueEmpty):
					queue.get_nowait()
			queue.put_nowait(payload)

	async def _broadcast(self) -> None:
		pipeline = self._pipeline
		if pipeline is None:
			return
		try:
			async for event in pipeline.events():
				if not self._clients:
					continue
				self._fan_out(serialize_event(event, include_frame=True))
			self._fan_out(None)
		except asyncio.CancelledError:
			logger.debug('GestureStream broadcast cancelled')
			raise
		except Exception as exc:
			logger.exception('GestureStream broadcast failed')
			self._last_error = str(exc)
			self._fan_out(None)
			self._teardown_task = asyncio.create_task(
				self._stop_pipeline(), name='gesture-stream-teardown'
			)
