# apps/backend/app/api/drone.py

"""
All drone routes, REST and WebSockets

REST:

POST /drone/connect - connect to a drone adapter
POST /drone.disconnect - disconnect the active drone adapter
GET /drone/status - connection state + telemetry

WebSockets:

WS /drone/ws/telemetry - Push live telemetry to clients every 0.1s
WS /drone/ws/commands - Utility to bypass inputs, directly issue a Command to droneadapter
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from apps.backend.app.dependencies import get_state, get_ws_state
from apps.backend.app.state import AppState
from services.commands.command import Command, CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/drone', tags=['drone'])


# support all kwargs. defaults should work when running locally
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


# REST endpoints\


@router.get('/health')
async def health():
	return {'status': 'ok'}


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
		return DisconnectResponse(success=False, message='There is no drone connected.')

	# there is an adapter connected, simply call disconnect and see if it works
	name = state.adapter_name
	await state.adapter.disconnect()
	state.reset()
	return DisconnectResponse(success=True, message=f'{name} adapter successfully disconnected')


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


@router.websocket('/ws/telemetry')
async def telemetry(websocket: WebSocket, state: Annotated[AppState, Depends(get_ws_state)]):
	"""
	Simply send telemetry to connected clients every 0.1 seconds.

	If no adapter is connected, the socket stays open and silently waits
		- this is to allow telemetry listening to occur immediately, without reconnecting
	data will flow once /drone/connect is called
	"""
	await websocket.accept()
	state.clients.add(websocket)
	logger.info('/drone/ws/telemetry: client connected (with %d total) ', len(state.clients))
	try:
		while True:
			if state.adapter is not None:
				try:
					telemetry = await state.adapter.get_telemetry()
					await websocket.send_json(asdict(telemetry))  # easy convert to json
				except Exception as ex:
					logger.exception('/drone/ws/telemetry: error getting telemetry - %s', ex)
			await asyncio.sleep(0.1)  # adjust this polling rate as needed
	except WebSocketDisconnect:
		state.clients.discard(websocket)
		logger.exception(
			'/drone/ws/telemetry: client disconnected, %d remaining', len(state.clients)
		)
	finally:
		state.clients.discard(websocket)


@router.websocket('/ws/commands')
async def command(websocket: WebSocket, state: Annotated[AppState, Depends(get_ws_state)]):
	"""
	A 'backdoor' of sorts to allow the user to directly issue a command to a drone.
	This can be done to easily wire up simple UI like the on screen buttons, without
	needing to go through the inputAdapter layer.
	Mirrors the DummyInputAdapter.

	message format:
		{"command": "CMD_NAME"}
		or
		{"command": "TAKEOFF", "source": "dashboard"}

	Command names map DIRECTLY to CommandType enum values. Make sure input lines up
	otherwise an error will be logged without closing the socket.
	"""
	# only one client for input so we dont touch state.clients
	# ...i think
	await websocket.accept()
	logger.info('drone/ws/commands: client connected')

	try:
		while True:
			data = await websocket.receive_json()
			name = data.get('command', '').upper()

			if state.adapter is None:
				await websocket.send_json(
					{
						'error': 'No drone connected. POST /drone/connect first',
					}
				)
				continue

			# check if the command passed in exists
			try:
				command_type = CommandType[name]
			except KeyError:
				await websocket.send_json(
					{'error': f'unknown command: {name!r}', 'valid': [c.name for c in CommandType]}
				)
				continue

			# send the successful command to the drone
			src = data.get('source', 'ws_commands')
			cmd = Command(type=command_type, source=src)

			logger.info('drone/ws/commands: executing %s', command_type.name)

			await state.adapter.execute(cmd)
			await websocket.send_json({'ok': True, 'command': command_type.name})

	except WebSocketDisconnect:
		logger.info('drone/ws/commands: Client disconnected')
