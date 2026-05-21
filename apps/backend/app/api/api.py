import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.telemetry import get_drone_telemetry, get_sim_telemetry

router = APIRouter()


@router.get('/health')
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

@router.get('/drone/flight-summary')
async def flight_summary():
	return [
        {"flight_id": 1, "time": 20, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 2, "time": 17, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 3, "time": 25, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 4, "time": 18, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 5, "time": 21, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 6, "time": 19, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 7, "time": 22, "max_altitude": 4, "average_speed": 2.5},
        {"flight_id": 8, "time": 20, "max_altitude": 4, "average_speed": 2.5},
    ]