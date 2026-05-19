# /apps/backend/app/main.py
import sys
from pathlib import Path

from fastapi import FastAPI

from app.api import router

project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))


app = FastAPI(
	title='Drone Control API',
	description="""
## REST Endpoints

* `GET /health` – Health check

## WebSocket Endpoints

* `ws://localhost:3000/drone/telemetry` – Real‑time telemetry stream from live drone
  Connect with a WebSocket client. Sends telemetry every 0.5s

* `ws://localhost:3000/sim/telemetry` – Real‑time telemetry stream simulated drone
  Connect with a WebSocket client. Sends telemetry every 0.5s
""",
)

app.include_router(router)
