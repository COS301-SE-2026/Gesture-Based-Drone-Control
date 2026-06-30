# apps/backend/app/api/drone.py

"""
All drone routes, REST and WebSockets

<include a summary here>
real chat just look at the docs or source files i cant be bothered
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
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
	# a way to know the rooms pysical bounds for leaflets fitBounds - wasnt sure how big the room is for now :(
	room_width_m: float = 10.0
	room_height_m: float = 10.0



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


# WebSockets endpoints
