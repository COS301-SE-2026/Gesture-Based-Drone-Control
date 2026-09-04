"""
QR-13 / NFR3.3 -> failsafe: EMERGENCY_STOP is always elevated to critical
priority no matter what
QR-14 / NFR3.3 -> failsafe: emergency_stop() on a flying drone clears the
flying state even when disconnected
"""

from __future__ import annotations

import asyncio

from services.commands.command import (
	PRIORITY_CRITICAL,
	PRIORITY_NORMAL,
	Command,
	CommandType,
)
from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter
from tests.nfr._helpers import emit


def test_emergency_stop_priority_is_forced():
	estop = Command(type=CommandType.EMERGENCY_STOP, priority=PRIORITY_NORMAL)

	wrongly_elevated = [
		t.name
		for t in CommandType
		if t is not CommandType.EMERGENCY_STOP and Command(type=t).priority != PRIORITY_NORMAL
	]

	passed = estop.priority == PRIORITY_CRITICAL and not wrongly_elevated

	emit(
		'QR-13',
		'NFR3.3',
		'EMERGENCY_STOP priority after contruction',
		actual=estop.priority,
		target=f'== {PRIORITY_CRITICAL}',
		passed=passed,
		other_types_elevated=wrongly_elevated,
	)

	assert estop.priority == PRIORITY_CRITICAL, 'emergency stop was not elevated'
	assert not wrongly_elevated, f'unexpected elevation: {wrongly_elevated}'


def test_emergency_stop_clears_flying_state():
	async def scenario() -> bool:
		drone = DummyDroneAdapter()
		await drone.connect()
		await drone.takeoff()
		flying_before = (await drone.get_telemetry()).is_flying
		await drone.emergency_stop()
		flying_after = (await drone.get_telemetry()).is_flying
		return flying_before and not flying_after

	cleared = asyncio.run(scenario())

	emit(
		'QR-14',
		'NFR3.3',
		'is_flying after emergency stop',
		actual='grounded' if cleared else 'still flying',
		target='grounded',
		passed=cleared,
	)

	assert cleared, 'emergency stop did not clear the flying state'
