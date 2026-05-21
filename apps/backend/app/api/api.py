import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.telemetry import get_drone_telemetry, get_sim_telemetry

router = APIRouter()


@router.get('/health', tags=['Rest Endpoints'])
def health():
	return {'status': 'ok'}


@router.websocket('/drone/telemetry')
async def drone_telemetry(websocket: WebSocket):
	await websocket.accept()

	try:
		while True:
			data = await get_drone_telemetry()
			await websocket.send_json(data)
			await asyncio.sleep(0.5)
	except WebSocketDisconnect:
		print('TELEMETRY CLIENT DISCONNECT')


@router.websocket('/sim/telemetry')
async def sim_telemetry(websocket: WebSocket):
	await websocket.accept()

	try:
		while True:
			data = await get_sim_telemetry()
			await websocket.send_json(data)
			await asyncio.sleep(0.5)
	except WebSocketDisconnect:
		print('TELEMETRY CLIENT DISCONNECT')


@router.get('/drone/flight-summary', tags=['Rest Endpoints'])
async def drone_flight_summary():
	return [
		{'flight_id': 1, 'time': 20, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 2, 'time': 17, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 3, 'time': 25, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 4, 'time': 18, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 5, 'time': 21, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 6, 'time': 19, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 7, 'time': 22, 'max_altitude': 4, 'average_speed': 2.5},
		{'flight_id': 8, 'time': 20, 'max_altitude': 4, 'average_speed': 2.5},
	]


@router.get('/sim/flight-summary', tags=['Rest Endpoints'])
async def sim_flight_summary():
	return [
		{'flight_id': 1, 'time': 20, 'max_altitude': 112, 'average_speed': 18.4},
		{'flight_id': 2, 'time': 17, 'max_altitude': 98, 'average_speed': 21.7},
		{'flight_id': 3, 'time': 25, 'max_altitude': 134, 'average_speed': 15.2},
		{'flight_id': 4, 'time': 18, 'max_altitude': 87, 'average_speed': 23.9},
		{'flight_id': 5, 'time': 21, 'max_altitude': 145, 'average_speed': 19.1},
		{'flight_id': 6, 'time': 19, 'max_altitude': 103, 'average_speed': 17.6},
		{'flight_id': 7, 'time': 22, 'max_altitude': 119, 'average_speed': 22.3},
		{'flight_id': 8, 'time': 20, 'max_altitude': 91, 'average_speed': 20.8},
	]
