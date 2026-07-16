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

from fastapi import Depends, HTTPException, Request

from apps.backend.app.state import AppState
from services.drone_control.adapters.drone_adapter import DroneAdapter


def get_state(request: Request) -> AppState:
	"""Returns the global state according to how main sees it"""
	return request.app.state.app


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
