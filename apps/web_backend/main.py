# /apps/web_backend/main.py

"""
Entry point for the HOSTED WEB DEMO backend.

This is completely separate from the desktop backend (apps/backend/app/main.py),
which is what gets packaged into the released executable. Nothing here is
imported by the desktop app, and nothing in the desktop app was changed to
make this work.

Differences from the desktop backend:
    - one Session per browser tab instead of one global AppState,
      so several laptops can play at the same time without affecting each other
    - only game + keyboard/gamepad routes (see routes.py)
    - no camera / MediaPipe / OpenCV / AirSim / database imports at all,
      which keeps memory low enough for a t3.micro

Run (from the repo root):
    uvicorn apps.web_backend.main:app --host 127.0.0.1 --port 3001
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from apps.web_backend.routes import router
from apps.web_backend.sessions import SessionStore

logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s  %(levelname)-8s  %(name)s: %(message)s',
	datefmt='%H:%M:%S',
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
	app.state.sessions = SessionStore()
	app.state.sessions.start()
	logger.info('GBDC web demo backend started')
	try:
		yield
	finally:
		await app.state.sessions.shutdown()
		logger.info('GBDC web demo backend stopped')


# docs are disabled in production; nobody at project day needs /docs
app = FastAPI(
	title='GBDC Web Demo API',
	version='1.0',
	lifespan=lifespan,
	docs_url=None,
	redoc_url=None,
	openapi_url=None,
)

# No CORS middleware on purpose: Caddy serves the frontend and proxies /api
# from the same origin, so the browser never makes a cross-origin request.
app.include_router(router)
