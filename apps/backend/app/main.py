# /apps/backend/app/main.py

"""
Entry point for FastAPI

- Create FastAPI app
- Manage startup and shutdown
- Mount the router
- Store AppState so routes can access

"""
from __future__ import annotations # prevents typeerrors

import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from app.api import router

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app : FastAPI):
  logger.info('Starting API...')
  yield
  logger.info('Stopping api')
  

app = FastAPI(title="GBDC API", version="1.0",
              description="""
              Describe each endpoint here
              """,
              lifespan=lifespan,)

app.include_router(router)

