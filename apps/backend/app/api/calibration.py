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

router = APIRouter(prefix='api/calibration', tags=['calibration'])

#single shared manager for the whole app, same pattern as stream in
#gestures.py, calibration is app-wide state (one camera, one user)
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