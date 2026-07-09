"""
assemble all routes into a single router that main.py uses

currently added:
    /drone - everything to do with the adapters
    /gestures - camera pipeline status and websocket stream
"""

from fastapi import APIRouter

from app.api import auth, drone, gestures

router = APIRouter(prefix='/api')


@router.get('/health')
async def health():
	return {'status': 'ok'}


router.include_router(drone.router)
router.include_router(gestures.router)
router.include_router(auth.router)
