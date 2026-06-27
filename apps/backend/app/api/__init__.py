"""
assemble all routes into a single router that main.py uses

currently added:
    /drone - everything to do with the adapters
"""

from fastapi import APIRouter

from app.api import drone

router = APIRouter()

router.include_router(drone.router, prefix='/drone', tags=['drone'])
