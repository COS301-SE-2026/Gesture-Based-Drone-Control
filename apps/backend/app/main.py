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
from app.api.gestures import stream as gesture_stream
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
	try:

		yield
	finally:
		try:
			await gesture_stream.shutdown()
		except Exception:
			logger.exception('Error in shutting down gesture stream')

		try:
			await app.state.app.shutdown()
		except Exception:
			logger.exception('Error in shutting down app state')

		
		await engine.dispose()
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
	allow_origins=[
		'http://127.0.0.1:3000',
		'http://localhost:3000',
		'http://127.0.0.1:4173',
		'http://localhost:4173',
	],
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)
app.include_router(router)

if __name__ == '__main__':
	import uvicorn

	# timeout_graceful_shutdown caps how long uvicorn waits for open connections
	# before running lifespan shutdown. without it a wedged /stream websocket blocks
	# the drain forever, so gesture_stream.shutdown() never runs and the webcam is
	# never released. must stay under electron's BACKEND_KILL_DEADLINE_MS
	uvicorn.run(app, host='127.0.0.1', port=3001, timeout_graceful_shutdown=3)
