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
import time
from dataclasses import asdict
from typing import Annotated

import cv2
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocketState

from apps.backend.app.dependencies import get_state, get_ws_state
from apps.backend.app.state import AppState
from services.commands.command import Command, CommandType
from services.database_manager.database import AsyncSessionLocal, get_db
from services.database_manager.managers.flight_manager import flight_manager
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

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

	if body.adapter == 'tello':
		from services.drone_control.adapters.tello_adapter import TelloAdapter

		return TelloAdapter()

	if body.adapter == 'game':
		from services.drone_control.adapters.game_adapter import GameAdapter

		return GameAdapter()

	raise ValueError(
		f'Unknown adapter: {body.adapter}. Supported: dummy, airsim, projectairsim, tello, game'
	)


# REST endpoints\


@router.get('/health')
async def health():
	return {'status': 'ok'}


@router.post('/connect', response_model=ConnectResponse)
async def connect(
	body: ConnectRequest,
	state: Annotated[AppState, Depends(get_state)],
	db: Annotated[AsyncSession, Depends(get_db)],
):  # NOSONAR
	# fuckass sonarqube would break this... dependencies are supposed to be injected like this
	"""
	connect to a drone adapter.
	if there is already an adapter connected, this endpoint handles disconnecting it
	should be seamless switching
	"""

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

	if state.adapter is not None:
		logger.info('drone/connect: replacing existing adapter %s', state.adapter_name)
		await state.adapter.disconnect()
		state.reset()

	# update global state
	state.adapter = adapter
	state.adapter_name = body.adapter

	# start flight record
	drone_row = await flight_manager.get_or_create_drone(
		db, display_name=body.adapter, is_simulated=(body.adapter != 'tello')
	)
	state.current_drone_id = drone_row.id

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
async def disconnect(
	state: Annotated[AppState, Depends(get_state)], db: Annotated[AsyncSession, Depends(get_db)]
):  # NOSONAR
	"""
	Simply disconnects from the connected drone if there is one connected.
	Returns a false for failure cases
	"""
	if state.adapter is None:
		return DisconnectResponse(success=False, message='There is no drone connected.')

	# there is an adapter connected, simply call disconnect and see if it works
	name = state.adapter_name
	if state.current_flight_id is not None:
		await flight_manager.end_flight(db, state.current_flight_id)
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


BOUNDARY = 'frame'
TARGET_FPS = 20
JPEG_QUALITY = 70
FRAME_W, FRAME_H = 640, 480
STARTUP_TIMEOUT_S = 5.0
STALE_AFTER_S = 3.0
MIN_DIM, MAX_DIM = 160, 1280


@router.get(
	'/feed',
	responses={
		409: {'description': 'No drone connected, or the connected adapter has no camera'},
		503: {'description': 'Video stream could not be started, or is not producing frames'},
	},
)
async def feed(
	state: Annotated[AppState, Depends(get_state)],
	w: Annotated[int, Query(ge=MIN_DIM, le=MAX_DIM)] = FRAME_W,
	h: Annotated[int, Query(ge=MIN_DIM, le=MAX_DIM)] = FRAME_H,
):
	if not state.is_connected or state.adapter is None:
		raise HTTPException(status_code=409, detail='No drone connected')

	adapter = state.adapter

	if not adapter.has_camera:
		raise HTTPException(status_code=409, detail=f'{state.adapter_name} adapter has no camera')

	# lazy start for the camera
	if not await adapter.start_video():
		raise HTTPException(status_code=503, detail='Could not start video stream')

	deadline = time.monotonic() + STARTUP_TIMEOUT_S
	while adapter.latest_frame().frame is None:
		if time.monotonic() > deadline:
			raise HTTPException(status_code=503, detail='Stream not producing frames')
		await asyncio.sleep(0.1)

	return StreamingResponse(
		_mjpeg_stream(adapter, w, h),
		media_type=f'multipart/x-mixed-replace; boundary={BOUNDARY}',
		headers={
			'Cache-Control': 'no-store, no-cache, must-revalidate',
			'Pragma': 'no-cache',
			'X-Accel-Buffering': 'no',
		},
	)


def _encode_jpeg(frame, width: int, height: int) -> bytes | None:
	"""
	Downscale and Jpeg encode a BGR frame

	called via asyncio.to_thread - at target fps
	"""
	small = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
	ok, buf = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
	return buf.tobytes() if ok else None


def _mjpeg_part(jpeg: bytes) -> bytes:
	return (
		b'--' + BOUNDARY.encode() + b'\r\n'
		b'Content-Type: image/jpeg\r\n'
		b'Content-Length: ' + str(len(jpeg)).encode() + b'\r\n\r\n' + jpeg + b'\r\n'
	)


async def _mjpeg_stream(adapter: DroneAdapter, box_w: int, box_h: int):
	"""
	yields multipart jpeg parts until the client disconnects or the feed goes stale

	skips encoding of duplicate frames
	"""

	interval = 1.0 / TARGET_FPS
	last_seq = -1
	last_good = time.monotonic()

	try:
		while True:
			shot = adapter.latest_frame()

			if shot.frame is not None and shot.seq != last_seq:
				last_seq = shot.seq
				jpeg = await asyncio.to_thread(_encode_jpeg, shot.frame, box_w, box_h)
				if jpeg is not None:
					last_good = time.monotonic()
					yield _mjpeg_part(jpeg)

			if time.monotonic() - last_good > STALE_AFTER_S:
				logger.warning('/drone/feed: stale after 0.1s, closing stream')
				return

			await asyncio.sleep(interval)

	except asyncio.CancelledError:
		logger.info('/drone/feedL client disconnected')
		raise


# WebSockets endpoints


@router.websocket('/ws/telemetry')
async def telemetry(websocket: WebSocket, state: Annotated[AppState, Depends(get_ws_state)]):
	"""
	Simply send telemetry to connected clients every 0.1 seconds.

	If no adapter is connected, the socket stays open and silently waits
		- this is to allow telemetry listening to occur immediately, without reconnecting
	data will flow once /drone/connect is called

	every 10th tick (probably +- a second) also persists a telemtry row to the db
	for the currently active flight, so analytics has histroy to chart
	"""
	await websocket.accept()
	state.clients.add(websocket)
	logger.info('/drone/ws/telemetry: client connected (with %d total) ', len(state.clients))
	tick = 0
	try:
		while True:
			if websocket.client_state != WebSocketState.CONNECTED:
				break

			if state.adapter is None:
				await asyncio.sleep(0.1)
				continue

			try:
				telemetry = await state.adapter.get_telemetry()

				await websocket.send_json(asdict(telemetry))

				tick += 1
				if tick % 10 == 0:
					await _record_telemetry(state, telemetry)

			except (RuntimeError, WebSocketDisconnect):
				logger.info('/drone/ws/telemetry: client disconnected mid-send')
				break

			except Exception as ex:
				logger.exception('/drone/ws/telemetry: error getting telemetry - %s', ex)

			await asyncio.sleep(0.1)

	except WebSocketDisconnect:
		logger.info(
			'/drone/ws/telemetry: client disconnected, %d remaining', len(state.clients) - 1
		)

	finally:
		state.clients.discard(websocket)


# helper function record the telemetry.
async def _record_telemetry(
	state: AppState,
	telemetry: TelemetryData,
) -> None:
	"""
	Does nothing if no active flight is happening
	"""
	if state.current_flight_id is None:
		return

	try:
		async with AsyncSessionLocal() as db:
			await flight_manager.record_telemetry(
				db,
				flight_id=state.current_flight_id,
				displacement_x=telemetry.x_displacement,
				displacement_y=telemetry.y_displacement,
				altitude=telemetry.altitude_m,
				battery_level=telemetry.battery_pct,
				speed=telemetry.speed_ms,
			)
	except Exception as ex:
		logger.exception('/drone/ws/telemetry: error recording telemetry row - %s', ex)


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
			# await websocket.send_json({'ok': True, 'command': command_type.name})
			# start a flight record on takeoff, end on land
			if command_type is CommandType.TAKEOFF and state.current_flight_id is None:
				if state.current_drone_id is not None:
					async with AsyncSessionLocal() as db:
						flight = await flight_manager.start_flight(
							db, drone_id=state.current_drone_id
						)
						state.current_flight_id = flight.id
					logger.info('drone/ws/commands: flight %s started', state.current_flight_id)
				else:
					logger.warning('drone/ws/commands: TAKEOFF recieved but no drone_id in state')

			# end flight on normal landing OR emrgency stop
			elif command_type in (CommandType.LAND, CommandType.EMERGENCY_STOP) and (
				state.current_flight_id is not None
			):
				ended_id = state.current_flight_id
				async with AsyncSessionLocal() as db:
					await flight_manager.end_flight(db, ended_id)
				logger.info('drone/ws/commands: flight %s ended', state.current_flight_id)
				state.current_flight_id = None

			await websocket.send_json({'ok': True, 'command': command_type.name})

	except WebSocketDisconnect:
		logger.info('drone/ws/commands: Client disconnected')
