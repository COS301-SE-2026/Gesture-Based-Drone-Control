"""
Gesture pipeline API

exposes:
GET /api/gestures/status
REST is the camera pipeline running how many clients connected

WS /api/gestures/stream
	Web socket: live stream of GestureFramePayload
 JSON messages, one per processed camera frame

 Web sockets not represented in OpenAPI the way REST routes are
 so the WS route's message schema is documented here in the docstring and
 mirrored by the GestureFramePayload model (under Schemas on swagger)
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.cv.serialization import GestureFramePayload
from app.cv.stream import GestureStream

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/gestures', tags=['gestures'])

# single shared stream instance for the whole app
# camera opens lazily on first WS connection and closes when the last one disconnects
stream = GestureStream()


class GestureStreamStatus(BaseModel):
	"""
	Current state of the shared gesture pipeline
	"""

	running: bool = Field(..., description='Whether the camera pipeline is currently active')
	connected_clients: int = Field(..., ge=0, description='Number of open WebSocket connections')
	last_frame: GestureFramePayload | None = Field(
		default=None,
		description=(
			'Most recently broadcast frame, included here only so '
			'GestureFramePayload appears in the Swagger schema -- '
			'FastAPI does not include WebSocket message types in OpenAPI '
			'automatically. Always null on this endpoint; the real '
			'stream is on the WebSocket below.'
		),
	)


@router.get(
	'/status',
	summary='Get gesture pipeline status',
	description=(
		'Returns whether the camera pipeline is currently running and how many '
		'clients are connected. The pipeline starts automatically when the first '
		'client connects to /ws/gestures and stops when the last one disconnects.'
	),
)
async def get_gesture_stream_status() -> GestureStreamStatus:
	return GestureStreamStatus(running=stream.is_running, connected_clients=stream.client_count)

@router.get('/health')
async def health():
	return {"status": "ok"}

@router.websocket('/stream')
async def gesture_websocket(websocket: WebSocket) -> None:
	"""
	WS stream of live gesture recognition results
	Connect, then receive one JSON message per processed camera frame,
	shaped like 'GestureFramePayload (serialization.py)

	```json
	{
		"type": "gesture_frame",
		"frame_index": 142,
		"timestamp": 1719831600.123,
		"fps": 28.7,
		"hands": [
			{
				'handedness': 'RIGHT',
				'gesture': 'OPEN_PALM',
				'fingers': 5,
				'confidence': 0.95,
				'speed': 0.12,
				'landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}, "...21 total"],
			}
		]
	}
	```
	No messages need to be sent from client; this is a server push stream
	The connection stays open until the client disconnects
	"""
	await websocket.accept()
	queue = await stream.subscribe()
	logger.info('gesture client connected (total =%d)', stream.client_count)
	try:
		while True:
			payload = await queue.get()
			await websocket.send_json(payload.model_dump())
	except WebSocketDisconnect:
		logger.info('gesture client disconnected')
	finally:
		await stream.unsubscribe(queue)
