# apps/backend/app/api/drone.py

"""
All drone routes, REST and WebSockets

<include a summary here>
real chat just look at the docs or source files i cant be bothered
"""

from __future__ import annotations

import logging
from typing import Annotated
from dataclasses import asdict

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException
from pydantic import BaseModel

from apps.backend.app.dependencies import get_state
from apps.backend.app.state import AppState
from services.drone_control.adapters.drone_adapter import DroneAdapter

logger = logging.getLogger(__name__)

router = APIRouter()

# generic models to be used as default


# support all kwargs
class ConnectRequest(BaseModel):
	# shared
	adapter: str = 'dummy'
	vehicle_name: str = 'Drone-1'
	host: str = '127.0.0.1'
	# airsim specific
	port: int = 41451
	# pas specific
	topics_port: int = 8989
	services_port: int = 8990


class ConnectResponse(BaseModel):
	connected: bool
	adapter: str
	message: str


# factory to create the adapters based on requested drone type
def _build_adapter(body: ConnectRequest) -> DroneAdapter:
	if body.adapter == 'dummy':
		from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter

		return DummyDroneAdapter()

	if body.adapter == 'projectairsim':
		from services.drone_control.adapters.project_airsim_adapter import ProjectAirSimAdapter

		return ProjectAirSimAdapter(
			host=body.host,
			vehicle_name=body.vehicle_name,
			topics_port=body.topics_port,
			services_port=body.services_port,
		)

	if body.adapter == 'airsim':
		from services.drone_control.adapters.airsim_adapter import AirSimAdapter

		return AirSimAdapter(
			host=body.host,
			port=body.port,
			vehicle_name=body.vehicle_name,
		)
	raise ValueError(f'Unknown adapter: {body.adapter}. Supported: dummy, airsim, projectairsim')


# REST endpoints
@router.post('/connect', response_model=ConnectResponse)
async def connect(body: ConnectRequest, state: Annotated[AppState, Depends(get_state)]):  # NOSONAR
	# fuckass sonarqube would break this... dependencies are supposed to be injected like this
	"""
	connect to a drone adapter.
	if there is already an adapter connected, this endpoint handles disconnecting it
	should be seamless switching
	"""
	if state.adapter is not None:
		logger.info('drone/connect: replacing existing adapter %s', state.adapter_name)
		await state.adapter.disconnect()
		state.reset()
	try:
		adapter = _build_adapter(body)
	except ValueError as ex:
		return ConnectResponse(connected=False, adapter=body.adapter, message=str(ex))

	all_good = await adapter.connect()
	if not all_good:
		return ConnectResponse(
			connected=False,
			adapter=body.adapter,
			message=f'Cannot connect to {body.adapter} at {body.host}.',
		)

	# update global state
	state.adapter = adapter
	state.adapter_name = body.adapter

	# start telemetry loop
	# TODO: add telemetry endpoint

	logger.info('/drone/connect: connected via %s', state.adapter)
	return ConnectResponse(
		connected=True,
		adapter=body.adapter,
		message=f'Connected to {body.adapter} at {body.host}',
	)
 
class DisconnectResponse(BaseModel):
	success: bool
	message: str
 
@router.post('/disconnect', response_model=DisconnectResponse)
async def disconnect(state: Annotated[AppState, Depends(get_state)]):  # NOSONAR
	"""
	Simply disconnects from the connected drone if there is one connected.
	Returns a false for failure cases
 	"""
	if state.adapter is None:
		return DisconnectResponse(success=False, message="There is no drone connected.")

	# there is an adapter connected, simply call disconnect and see if it works
	name = state.adapter_name
	await state.adapter.disconnect()
	return DisconnectResponse(success=True, message=f"{name} adapter successfully disconnected")


@router.get('/status')
async def status(state: Annotated[AppState, Depends(get_state)]):
	"""
	GET implementation of some basic telemetry data and general 
	drone info. probably not too important but its here as an option
	"""
	if not state.is_connected or state.adapter is None:
		return {'connected': False, 'adapter': None}
	
	telemetry = await state.adapter.get_telemetry()
	return {
		'connected': True,
		'adapter': state.adapter_name,
		'telemetry': asdict(telemetry),
	}

# WebSockets endpoints



