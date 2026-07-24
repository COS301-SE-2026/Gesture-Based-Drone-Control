"""
Gesture calibration API

exposes:
POST /api/calibration/start
    Begin (or restart) a calibration run. Optional connecting to
    the WebSocket below also starts a run automatically

POST /api/calibration/skip
    Mark the user as calibrated wihtout running the sequence. Flight
    commands become available immediately

GET /api/calibration/status
    Current calibration state: not_started / in_progress / completed /
    skipped,
    plus progress through the gesture sequence

WS /api/calibration/stream
    Live calibration stream. One CalibrationFramepayload JSON message
    per processed camera frame, carrying the target gesture, whether
    the user's hand matched it, rolling-window pass stats, and all 21
    landmarks per hand for the red/green skeleton overlay

Web sockets are not represented in Openapi the way REST routes are,
so the WS route's message schema is documented in the docstring and mirrored
by the CalibrationFramePayload model (schemas -> swagger)
through the always-null 'last_frame' field on the status endpoint
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.api.gestures import stream
from app.cv.calibration import (
	CALIBRATION_SEQUENCE,
	CalibrationFramePayload,
	CalibrationManager,
	CalibrationPhase,
	CalibrationProgressOut,
	CalibrationStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/calibration', tags=['calibration'])

# single shared manager for the whole app, same pattern as stream in
# gestures.py, calibration is app-wide state (one camera, one user)
manager = CalibrationManager()


class CalibrationStatusOut(BaseModel):
	"""
	Current calibration state of the app
	"""

	status: CalibrationStatus = Field(..., description='Overall calibration state')
	is_calibrated: bool = Field(
		..., description='True when flight commands are allowed (completed/skipped)'
	)
	target_gesture: str | None = Field(
		default=None, description='Gesture currently being calibrated, null unless in progress'
	)
	progress: CalibrationProgressOut | None = Field(
		default=None, description='Sequence progress, null unless a session is in progress'
	)
	sequence: list[str] = Field(
		default_factory=lambda: list(CALIBRATION_SEQUENCE),
		description='Full ordered list of gestures the calibration run covers',
	)
	last_frame: CalibrationFramePayload | None = Field(
		default=None,
		description=(
			'Most recent calibration frame, included here only so '
			'CalibrationFrame Payload appears in the Swagger schema -- '
			'FastAPI does not include WebSocket message types in OpenAPI '
			'automatically. Always null on this endpoint; the real '
			'stream is on the WebSocket below'
		),
	)


def _status_out() -> CalibrationStatusOut:
	session = manager.session
	in_progress = manager.status is CalibrationStatus.IN_PROGRESS and session is not None
	return CalibrationStatusOut(
		status=manager.status,
		is_calibrated=manager.is_calibrated,
		target_gesture=session.target_gesture if in_progress else None,
		progress=CalibrationProgressOut(
			index=len(session.completed_gestures),
			total=len(CALIBRATION_SEQUENCE),
			completed=session.completed_gestures,
		)
		if in_progress
		else None,
	)


@router.get(
	'/status',
	summary='Get calibration status',
	description=(
		'Return the current calibration state. Flight command endpoints '
		'reject requests with 409 until this reports `is_calibrated: true` '
		'(i.e. status is `completed` or `skipped`). State is in-memory, so '
		'a backend restart returnds to `not_started`'
	),
)
async def get_calibration_status() -> CalibrationStatusOut:
	return _status_out()


@router.post(
	'/start',
	summary='Start or restart a calibration run',
	description=(
		'Begins a fresh calibration session covering every gesture in the '
		'sequence. Any previous result is discarded, so calling this while '
		'calibrated regates flight commands until the new run passes or is '
		'skipped. Connecting to the WebSocket also starts a run, so calling '
		'this endpoint first is optional'
	),
)
async def start_calibration() -> CalibrationStatusOut:
	manager.start()
	return _status_out()


@router.post(
	'/skip',
	summary='Skip calibration',
	description=(
		'Marks the user as calibrated without running the gesture sequence. '
		'Flight commands become available immedatiely. Intended for users '
		'who have calibrated before and want to fly right away'
	),
)
async def skip_calibration() -> CalibrationStatusOut:
	manager.skip()
	return _status_out()


@router.websocket('/stream')
async def calibration_websocket(websocket: WebSocket) -> None:
	"""
		WS stream of live calibration progress.
		Connecting starts a fresh calibration run (any previous progress or result is discarded),
		then the server pushes one JSON message per processed camera frame,
		shaped like CalibrationFramePayload
		(app/cv/calibration.py)

		```json
	{
		"type": "calibration_frame",
		"frame_index": 87,
		"timestamp": 1719831600.123,
		"phase": "awaiting_gesture",
		"target_gesture": "FIST",
		"detected_gesture": "FIST",
		"matched": true,
		"window": {
			"frames": 62,
			"matches": 55,
			"ratio": 0.887,
			"required_ratio": 0.8,
			"min_frames": 45
		},
		"progress": {"index": 1, "total": 6, "completed": ["OPEN_PALM"]},
		"hands": [
			{
				"handedness": "RIGHT",
				"gesture": "FIST",
				"fingers": 0,
				"confidence": 0.97,
				"speed": 0.03,
				"landmarks": [{"x": 0.5, "y": 0.5, "z": 0.0}, "...21 total"]
			}
		]
	}
		```

		Frontend rendering contract:
		-> draw skeleton from `hands[].landmarks`, coloured green when `matched` is true
		and red otherwise
		-> show `target_gesture` as the instruction
		-> while `phase` is "success_display" (2 seconds) show the success state for the gesture
		passed
		-> when `phase` is "done" the run is complete and the server sends that final frame
		and then closes the connection

		No messages need to be sent from the client: this is a server push stream.
		The camera pipeline is shared with /api/gestures/stream, so calibration works alongside
		other connected clients. Only one calibration client should be connected at a time
		(one webcam, one user), a second connection restarts the shared run
	"""

	await websocket.accept()
	session = manager.start()
	queue = None
	try:
		queue = await stream.subscribe()
		logger.info(
			'calibration client connected, run started (traget=%s)',
			session.target_gesture,
		)
		while True:
			frame = await queue.get()
			payload = manager.process_frame(frame)
			await websocket.send_json(payload.model_dump())
			if payload.phase is CalibrationPhase.DONE:
				logger.info('calibration run complete, closing stream')
				break
	except WebSocketDisconnect:
		logger.info('calibration client disconnected (status=%s)', manager.status.value)
	except Exception:
		logger.exception('calibration stream failed')
	finally:
		if queue is not None:
			await stream.unsubscribe(queue)
