"""
The shared application state.

This is created at startup in main.py
And used in endpoints via dependencies.py.
It assures that each endpoint can check the state
of the system
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field

from services.drone_control.adapters.drone_adapter import DroneAdapter
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)


@dataclass
class AppState:
	# currently connected drone adapter
	adapter: DroneAdapter | None = None

	# str() of drone adapter ("airsim, xfly...)
	adapter_name: str | None = None

	# currently connected input adapter
	input: InputAdapter | None = None

	# dummy, keyboard, controller, gesture...
	input_name: str | None = None

	# WS clients that are currently connected
	clients: set[object] = field(default_factory=set)

	# handler for telemetry streaming
	telemetry_task: asyncio.Task | None = None

	# id of the flight_summary row for the curr connected session
	current_flight_id: uuid.UUID | None = None
 
	# DIYA YOU WERE SUPPOSED TO ADD THIS 🫵
	current_drone_id: uuid.UUID | None = None

	@property
	def is_connected(self) -> bool:
		return self.adapter is not None

	@property
	def input_connected(self) -> bool:
		return self.input is not None

	def reset(self) -> None:
		"""
		Reset to a disconnected state, dont alter clients since thats not our responsibility
		"""
		self.adapter = None
		self.adapter_name = None
		self.current_flight_id = None
		self.current_drone_id = None
		if self.telemetry_task and not self.telemetry_task.done():
			self.telemetry_task.cancel()
		self.telemetry_task = None

	def input_reset(self) -> None:
		"""
		Reset inputs only to a disconnected state
		"""
		self.input = None
		self.input_name = None
