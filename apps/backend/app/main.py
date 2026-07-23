# /apps/backend/app/main.py

"""
Entry point for FastAPI

- Create FastAPI app
- Manage startup and shutdown
- Mount the router
- Store AppState so routes can access

"""

from __future__ import annotations  # prevents typeerrors

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.api.auth import router as auth_router
from app.state import AppState
from services.database_manager.database import Base, engine
from services.database_manager.models.drones import Drone
from services.database_manager.models.flight_summary import FlightSummary
from services.database_manager.models.telemetry import Telemetry
from services.database_manager.models.users import User

logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s  %(levelname)-8s  %(name)s: %(message)s',
	datefmt='%H:%M:%S',
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
	logger.info('Starting API...')

	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)

	app.state.app = AppState()
	yield
	logger.info('Stopping API...')


app = FastAPI(
	title='GBDC API',
	version='1.0',
	description="""
              Describe each endpoint here
              """,
	lifespan=lifespan,
)
# lets Fastapi know that requests from lclhst3000 is chill
app.add_middleware(
	CORSMiddleware,
	allow_origins=['http://localhost:3000', 'http://localhost:4173'],
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)
app.include_router(router)

if __name__ == '__main__':
	import uvicorn

	uvicorn.run(app, host='0.0.0.0', port=3001)
