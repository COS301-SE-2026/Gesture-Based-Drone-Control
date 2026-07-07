"""
Shares one pipeline (one webcame) across any number of Websocket clients.

The webcam can only be opened once, so we cant spin up a pipeline per connection.
Instead: first cleint to subscribe() starts pipeline; every event
gets fanned out to all subscribed clients via their own bounded, drop-oldest queue
(one slow browser can therefore not lag the others);
last client to unsubscribe() stops the pipeline and releases the camera
"""

import asyncio
import logging
from typing import Optional

from app.cv.serialization import GestureFramePayload, serialize_event
from cv_pipeline.processing.pipeline import CvPipeline, PipelineConfig

logger = logging.getLogger(__name__)


class GestureStream:
	"""
	Manages the lifecycle of a single shared pipeline for all clients.
	"""

	def __init__(self, config: Optional[PipelineConfig] = None) -> None:
		self._config = config
		self._pipeline: Optional[CvPipeline] = None
		self._broadcast_task: Optional[asyncio.Task] = None
		self._clients: set[asyncio.Queue[GestureFramePayload]] = set()
		self._lock = asyncio.Lock()

	@property
	def client_count(self) -> int:
		return len(self._clients)

	@property
	def is_running(self) -> bool:
		return self._pipeline is not None

	async def subscribe(self) -> 'asyncio.Queue[GestureFramePayload]':
		"""
		Register a new client queue and ensure the pipeline is running
		"""

		queue: asyncio.Queue[GestureFramePayload] = asyncio.Queue(maxsize=1)
		self._clients.add(queue)
		await self._ensure_started()
		return queue

	async def unsubscribe(self, queue: 'asyncio.Queue[GestureFramePayload]') -> None:
		"""
		Remove a client queue and stop the pipeline if it was the last one
		"""
		self._clients.discard(queue)
		await self._maybe_stop()

	async def shutdown(self) -> None:
		"""
		Force-stop regardless of clients Call this from app shutdown/lifespan
		"""
		self._clients.clear()
		await self._maybe_stop()

	async def _ensure_started(self) -> None:
		async with self._lock:
			if self._pipeline is not None:
				return
			self._pipeline = CvPipeline(self._config)
			await self._pipeline.start()
			self._broadcast_task = asyncio.create_task(
				self._broadcast(), name='gesture-stream-broadcast'
			)
			logger.info('GestureStream started (camera opened)')

	async def _maybe_stop(self) -> None:
		async with self._lock:
			if self._clients or self._pipeline is None:
				return
			if self._broadcast_task is not None:
				self._broadcast_task.cancel()
				try:
					await self._broadcast_task
				except asyncio.CancelledError:
					current = asyncio.current_task()
					if current is not None and current.cancelling() > 0:
						raise
				self._broadcast_task = None
			await self._pipeline.stop()
			self._pipeline = None
			logger.info('GestureStream stopped (no clients remaining)')

	async def _broadcast(self) -> None:
		assert self._pipeline is not None
		try:
			async for event in self._pipeline.events():
				payload = serialize_event(event)
				# beat this sonar
				for queue in list(
					self._clients
				):  # NOSONAR - copy: set may mutate during async iteration
					# drop oldest: never let one slow client back-pressure the stream
					if queue.full():
						try:
							queue.get_nowait()
						except asyncio.QueueEmpty:
							pass
					queue.put_nowait(payload)
		except asyncio.CancelledError:
			logger.debug('GestureStream broadcast cancelled')
			raise
