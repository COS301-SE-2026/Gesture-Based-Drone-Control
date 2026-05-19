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
