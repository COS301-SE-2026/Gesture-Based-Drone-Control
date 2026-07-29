# /services/cv-pipeline/processing/async_queue.py
"""
Bounded to be drop oldest queue for cv pipeline
how it works:
-> Camera acts as thread, and pushes CapturedFrames in through try_put_nowait()
-> Async consumer pulls them out with get()
-> Queue is bounded (deafult = 2), if full ->oldest frame deleted so newest one can be added
-> drops logged to test pipeline lag in dev
(i must not forget to remove the debug for main push)
"""

import asyncio
import logging
from typing import Generic, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar('T')


# bounded queeue with drop oldest frame
class BoundedFrameQueue(Generic[T]):
	"""
	wrapper around asyncio.Queue which:
	-> replcaes oldest item when queue = full (no blocking)
	-> Tracks drop counter so I know how often consumer behind
	-> Can be put to from a thread (try_put_threadsafe) — the camera captureloop runs in a
	thread because cv2.VideoCapture.read() is blocking

	Usage:
		q = BoundedFrameQueue[Capturedframe](maxSize = 2)
		#from camera thread
		q.ttry_put_threadsafe(frame, loop)
		# from async consumer
		item = await q.get()
	"""

	def __init__(self, maxsize: int = 2) -> None:
		if maxsize < 1:
			raise ValueError('maxsize must be >= 1')
		self._queue: asyncio.Queue[T] = asyncio.Queue(maxsize=maxsize)
		self._maxsize = maxsize
		self._drop_count = 0

	@property
	def maxsize(self) -> int:
		return self._maxsize

	@property
	def drop_count(self) -> int:
		# total frames dropped since created
		return self._drop_count

	def qsize(self) -> int:
		return self._queue.qsize()

	def empty(self) -> bool:
		return self._queue.empty()

	def full(self) -> bool:
		return self._queue.full()

	# put - inside loop
	def try_put_nowait(self, item: T) -> bool:
		"""
		Put item from inside loop
		true = item landed cleanly
		false = drop occured
		ina full queue drops oldest item and puts newest one
		"""

		if self._queue.full():
			self._drop_oldest()

		try:
			self._queue.put_nowait(item)
			return True
		except asyncio.QueueFull:
			# shouldnt reach here after oldest drop, just a fallback
			logger.error('BoundedFrameQueue still full after deletion - item deleted')
			self._drop_count += 1
			return False

	# put = from thread
	def try_put_threadsafe(self, item: T, loop: asyncio.AbstractEventLoop) -> None:
		"""
		Schedule a put from thread (one) that isnt a loop thread
		Used by cam capture loop in pipeline.py
		"""

		loop.call_soon_threadsafe(self.try_put_nowait, item)

	# get async
	async def get(self) -> T:
		# await next item and blocks until something queued
		return await self._queue.get()

	async def get_with_timeout(self, timeout: float) -> Optional[T]:
		# returns None after timeout with no item
		try:
			return await asyncio.wait_for(self._queue.get(), timeout=timeout)
		except asyncio.TimeoutError:
			return None

	# helpers
	def _drop_oldest(self) -> None:
		# delete oldest item
		# logs warning for visibility
		try:
			dropped = self._queue.get_nowait()
			self._drop_count += 1
			logger.debug(
				'BoundedFrameQueue dropped oldest item (total drops = %d)',
				self._drop_count,
			)
			# discard ref
			del dropped
		except asyncio.QueueEmpty:
			# race: another consumer drained it between full() and get_nowait()
			pass
