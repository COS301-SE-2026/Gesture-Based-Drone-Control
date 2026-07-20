# /services/input/sources/input_adapter.py

"""
adapts all sources of input (KBM, gesture, etc) to a common interface
serves as the parent class for gesture_adapter, keyboard_adapter, etc.

The only job of the INputAdapter is to receive raw input from whatever source
it naturally arrives from, be it key events, landmark arrays, http payloads, etc.
and convert it into a suitable Command object

It does not know anything about the drones, simulators or how execution actually
happens. therefore:

	- the rest of the system never needs to change when a new input source is added
	- Input sources can be tested in isolation using a mock handler
	- The handler can be swapped dynamically at runtime

Adding a new input source:

	- New file in services/input/sources
	- Define a subclass of InputAdapter
	- Implement all of the abstract methods ()
	- Register it in services/input/sources/__init__.py
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Callable

from services.commands.command import Command

logger = logging.getLogger(__name__)


class InputAdapter(ABC):
	"""
		Abstract base class for all input adapters.

		Subclasses represent a single input channnel.
		Each channel must implement start() to begin listening
		and call self._emit() whenever a Command needs to be fired.

		_emit() is synchronous. If a subclass runs in a background thread
	or async task, schedule the handler appropriately. I do not know how to do this
	"""

	def __init__(self) -> None:
		# inentionally set to None until set_handler is called
		# _emit() will log a warning rather than silently drop commands
		# if the handler hasnt been registered
		self._handler: Callable[[Command], None] | None = None

	# Public methods

	def set_handler(self, handler: Callable[[Command], None]) -> None:
		"""
		Register the function that will receive the emitted commands

		This gets called before start(), such that we have a handler
		to issue the command to.
		This will be a DroneAdapter.execute() call unless expansion is done

		Parameters

		handler : Callable[[Command], None]
			Any callable that accepts a single Command as an argument
			It may be a coroutine function, in which case subclassed
			need to implement correct scheduling logic
			(i.e asyncio integration)
		"""
		self._handler = handler
		logger.debug('%s: handler registered -> %s', self.__class__.__name__, handler)

	@abstractmethod
	async def start(self) -> None:
		"""
		Begin listening for input

		This is called once at application startup (for instance
		api lifespan). Some adapters have nothing to initialise,
		whereas others down the line (like gamepad adapters) would
		need to start a background task here.

		This method must not block
		"""
		...

	@abstractmethod
	async def handle_message(self, message: dict[str, Any]) -> None:
		"""
		Handle input, and delegate to the correct command
		"""
		...

	# Protected helper only used in subclasses

	def _emit(self, command: Command) -> None:
		"""
		Send a Command to the registered handler

		Subclasses call this whenever raw input has been successfully
		mapped to a Command.

		Do not call this directly from outside the adapter hierarchy

		Parameters

		command : Command
			The fully constructed Command to dispatch
		"""
		if self._handler is None:
			logger.warning(
				'%s: _emit called but no handler is registered. '
				'Call set_handler() before start(). Command dropped: %r',
				self.__class__.__name__,
				command,
			)
			return

		logger.debug('%s: emitting %r', self.__class__.__name__, command)
		self._handler(command)
