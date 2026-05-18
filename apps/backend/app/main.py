# /apps/backend/app/main.py

from fastapi import FastAPI

app = FastAPI(
	title='Drone Control API',
	description="""
## REST Endpoints

* `GET /health` – Health check

## WebSocket Endpoints

* `ws://localhost:8000/telemetry` – Real‑time telemetry stream
  Connect with a WebSocket client. Sends telemetry every 0.5s
""",
)
