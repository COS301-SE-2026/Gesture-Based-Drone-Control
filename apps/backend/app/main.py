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

from app.api import router
from app.api.auth import router as auth_router
from app.state import AppState

logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s  %(levelname)-8s  %(name)s: %(message)s',
	datefmt='%H:%M:%S',
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
	logger.info('Starting API...')
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

app.include_router(router)

app.include_router(auth_router)
