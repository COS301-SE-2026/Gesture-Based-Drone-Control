"""

A concrete DroneAdapter that broadcasts Commands to browser game clients.

This just acts as a receiver for these commands, the actual handling
is more game-specific so it should be easier to handle on the frontend.

Commmand payload:
    {"command": "MOVE_FORWARD"}
    {"command": "HOVER"}
    ...

Each game will have to implement listeners for these payloads and interpret them
accordingly.

A callback is used over a more intuitive method because unlike other drone adapters,
this one has no idea what if anything it's connecting to. thus we just issue a promise
and hope it sorts itself out
"""

from __future__ import annotations

import logging
from typing import Awaitable, Callable

from services.commands.command import AnalogInput, CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

logger = logging.getLogger(__name__)

# alias for the broadcast callback that the API uses
CommandCallback = Callable[[dict], Awaitable[None]]


class GameAdapter(DroneAdapter):
	def __init__(self) -> None:
		self._callback: CommandCallback | None = None

	def set_command_callback(self, fn: CommandCallback):
		"""
		register the async function that recieves each command payload
		game.py will call this when the first game client connects, or via
		POST /drone/connect
		"""
		self._callback = fn
		logger.debug('GameAdapter: command callback registered')

	def clear_command_callback(self, fn: CommandCallback):
		"""remove the callback, which will be triggered on disconnect"""
		self._callback = None

	async def _forward(self, payload: dict) -> None:
		"""send a payload to the registered callback if it exists"""
		if self._callback is not None:
			await self._callback(payload)
		else:
			logger.debug('GameAdapter: no callback registered, dropping %s', payload)

	# Connection lifecycle, more or less stubbed
	async def connect(self) -> bool:
		logger.info('GameAdapter: ready, waiting for game clients')
		return True

	async def disconnect(self) -> None:
		self._callback = None
		logger.info('GameAdapter: disconnected')

	# flight commands forwarded to _forward
	async def takeoff(self) -> None:
		await self._forward({'command': 'TAKEOFF'})

	async def land(self) -> None:
		await self._forward({'command': 'LAND'})

	async def hover(self) -> None:
		await self._forward({'command': 'HOVER'})

	async def emergency_stop(self) -> None:
		logger.warning('GameAdapter: EMERGENCY_STOP')
		await self._forward({'command': 'EMERGENCY_STOP'})

	async def move(self, direction: CommandType, **kwargs) -> None:
		await self._forward({'command': direction.name})

	async def analog(self, input: AnalogInput) -> None:
		"""
		Analog commands are forwarded kinda as is, we dont do anything with them right now though
		"""
		await self._forward(
			{
				'command': 'ANALOG',
				'left_x': input.left_x,
				'left_y': input.left_y,
				'right_x': input.right_x,
				'right_y': input.right_y,
				'ltrigger': input.ltrigger,
				'rtrigger': input.rtrigger,
			}
		)

	async def get_telemetry(self) -> TelemetryData:
		"""its literally just a stub"""
		return TelemetryData(source='game')
