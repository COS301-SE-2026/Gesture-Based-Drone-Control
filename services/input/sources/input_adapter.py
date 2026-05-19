# /services/input/sources/input_adapter.py

"""
adapts all sources of input (KBM, gesture, etc) to a common interface
serves as the parent class for gesture_adapter, keyboard_adapter,
"""

from abc import ABC, abstractmethod


# STUB
class InputAdapter(ABC):
	"""Abstract base class for all input adapters."""

	@abstractmethod
	def start(self) -> None:
		"""Start receiving input."""
		...

	@abstractmethod
	def stop(self) -> None:
		"""Stop receiving input."""
		...

	@abstractmethod
	def get_next_command(self):
		"""Get the next command from this input source."""
		...
