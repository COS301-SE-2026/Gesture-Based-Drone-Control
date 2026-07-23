# apps/backend/app/dependencies.py

"""
Dependency functions.

Import the needed function, use with Depends() in
any route that needs a specific state.

These are all essentially helper functions to assert
a certain precondition for an endpoint to work.

Works hand in hand with a global state that gets updated
to store info that may be relevant to endpoints at different times
"""

from __future__ import annotations

from fastapi import Depends, HTTPException
from starlette.requests import HTTPConnection
from starlette.websockets import WebSocket

from apps.backend.app.state import AppState
from services.drone_control.adapters.drone_adapter import DroneAdapter


def get_state(request: HTTPConnection) -> AppState:
	"""Returns the global state according to how main sees it"""
	return request.app.state.app


def get_ws_state(websocket: WebSocket) -> AppState:
	"""Same as get_state, but for Websocket routes"""
	return websocket.app.state.app


# example of usage: it is only possible to get the adapter if the state
# exists, therefore get__adapter() depends on get_state()
def get_adapter(state: AppState = Depends(get_state)) -> DroneAdapter:
	"""for use in routes that require an active connection"""
	if state.adapter is None:
		raise HTTPException(
			status_code=409,  # conflicting state
			detail='No drone adapter connected.',
		)
	return state.adapter


def require_calibrated() -> None:
	"""
	For use in flight-command routes: rejects the request until the user has
	completed (or skipped) calibration

	Usage on a single route:
		@router.post('/takeoff', dependencies=[Depends(require_calibrated)])

	Or gate every flight route at once on the router:
		router = APIRouter(..., dependencies=[Depends(require_calibrated)])

	Imported lazily to avoid an import cycle: this module is imported by routers,
	and the calibration manager lives in a router module
	(same module-level singleton pattern as GestureStream)
	"""
	from app.api.calibration import manager

	if not manager.is_calibrated:
		raise HTTPException(
			status_code=409,  # conflicting state
			detail=(
				'Gesture calibration required before flight. '
				'Complete it via WS /api/calibration/stream or skip it '
				'via POST /api/calibration/skip'
			),
		)
