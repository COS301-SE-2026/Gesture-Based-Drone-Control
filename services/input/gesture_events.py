"""
Change-only resolved gesture commands

The GestureAdapter re-emits a Command on every frame while as gesture is
held. That is fine for the drone but bad for the command history as a gesture
held for like 5s at 30fps would push a large amount of rows which is uncessary

This module sits nects to the adapter and records one event per "transition":
    ONE_FINGER helf for 5s -> 1 event
    then TWO_FINGER 3S -> 1 event
    then ONE_FINGER again -> 1 event (new hold = new event)

Events are fanned out to any number of WebSocket subscribers using the same bounded
drop-oldest queue pattern in the stream.py file and a short rolling history is kept so
a client that connects late still sees recent activity.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections import deque
from typing import Any, Optional

logger = logging.getLogger(__name__)

# how many past events a newly connected client gets backfiled with
HISTORY_SIZE = 50


class GestureEventLog:
	"""
	Append-only bounded log of gesture -> command transitions

	record() is syncrhonous because the adapter calls it from inside its consumer task
	, which already runs on the event loop. put_nowait is therefore safe and we never block
	the pipeline
	"""

	def __init__(self, history_size: int = HISTORY_SIZE) -> None:
		self._history: deque[dict[str, Any]] = deque(maxlen=history_size)
		self._subscribers: set[asyncio.Queue] = set()
		self._seq: int = 0

	@property
	def subscriber_count(self) -> int:
		return len(self._subscribers)

	def history(self) -> list[dict[str, Any]]:
		"""Oldest first, frontend reverses this for newest-first display"""
		return list(self._history)

	def clear(self) -> None:
		self._history.clear()

	def record(
		self,
		*,
		command: str,
		hands: Optional[dict[str, Any]] = None,
		confidence: float = 0.0,
		source: str = 'gesture',
	) -> dict[str, Any]:
		"""
		Record one transition and push it to every subscriber

		command: CommandType name
		hand: snapshot that produced it
		confidence: lowest per-hand confidence in the frame that resolved it
		source: 'gesture' for a real gesture, 'gesture_idling' for the
		safety hover that fires after idle_timeout_s
		"""
		self._seq += 1
		event: dict[str, Any] = {
			'type': 'gesture_event',
			'id': self._seq,
			'command': command,
			'hands': dict(hands or {}),
			'confidence': round(float(confidence), 3),
			'source': source,
			'timestamp': time.time(),
		}

		self._history.append(event)
		self._fan_out(event)

		logger.info(
			'GestureEventLog: #%d %s -> %s (%.2f)',
			event['id'],
			event['hands'] or source,
			command,
			event['confidence'],
		)
		return event

	def _fan_out(self, event: dict[str, Any]) -> None:
		for queue in self._subscribers:
			if queue.full():
				# drops oldest so one slow browser cannot back up the log
				with contextlib.suppress(asyncio.QueueEmpty):
					queue.get_nowait()
			queue.put_nowait(event)

	async def subscribe(self) -> 'asyncio.Queue[dict[str, Any]]':
		queue: asyncio.Queue = asyncio.Queue(maxsize=HISTORY_SIZE)
		self._subscribers.add(queue)
		return queue

	async def unsubscribe(self, queue: 'asyncio.Queue[dict[str, Any]]') -> None:
		self._subscribers.discard(queue)


# single shared instance, same patter as GestureStream Singleton
gesture_events = GestureEventLog()
