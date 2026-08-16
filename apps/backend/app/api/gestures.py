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

import asyncio
import contextlib
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

WS_CAMERA_UNAVAILABLE = 1011
WS_STREAM_ENDED = 1001


async def _send_frames(websocket: WebSocket, queue: asyncio.Queue) -> None:
	while True:
		payload = await queue.get()
		if payload is None:
			logger.info('gesture stream ended, closing client socket')
			await websocket.close(code=WS_STREAM_ENDED)
			return
		await websocket.send_json(payload.model_dump())


async def _watch_for_disconnect(websocket: WebSocket) -> None:
	with contextlib.suppress(Exception):
		while True:
			await websocket.receive()


class GestureStreamStatus(BaseModel):
	"""
	Current state of the shared gesture pipeline
	"""

	running: bool = Field(..., description='Whether the camera pipeline is currently active')
	connected_clients: int = Field(..., ge=0, description='Number of open WebSocket connections')
	last_error: str | None = Field(
		default=None,
		description=(
			'Why the camera last failed to open or the pipeline last died, so the '
			'UI can show something better than "Disconnected". Null when healthy'
		),
	)
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
	return GestureStreamStatus(
		running=stream.is_running,
		connected_clients=stream.client_count,
		last_error=stream.last_error,
	)


@router.get('/health')
async def health():
	return {'status': 'ok'}


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
	queue = None
	try:
		try:
			queue = await stream.subscribe()
		except Exception as exc:
			logger.warning('gesture client rejected, camera unavailable" %s', exc)
			await websocket.send_json(
				{
					'type': 'error',
					'code': 'camera_unavailable',
					'message': str(exc),
				}
			)
			await websocket.close(code=WS_CAMERA_UNAVAILABLE)
			return

		logger.info('gesture client connected (total = %d)', stream.client_count)
		logger.info('gesture client connected (total = %d)', stream.client_count)
		sender = asyncio.create_task(_send_frames(websocket, queue), name='gesture-send')
		watcher = asyncio.create_task(_watch_for_disconnect(websocket), name='gesture-watch')
		_, pending = await asyncio.wait({sender, watcher}, return_when=asyncio.FIRST_COMPLETED)
		for task in pending:
			task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await task
	except WebSocketDisconnect:
		logger.info('gesture client disconnected')
	except Exception:
		logger.exception('gesture stream failed')
	finally:
		if queue is not None:
			await stream.unsubscribe(queue)
