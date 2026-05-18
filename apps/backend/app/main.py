# /apps/backend/app/main.py

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI(
    title="Drone Control API",
    description="""
## REST Endpoints

* `GET /health` – Health check

## WebSocket Endpoints

* `ws://localhost:8000/telemetry` – Real‑time telemetry stream
  Connect with a WebSocket client. Sends telemetry every 0.5s
"""
)

@app.get("/health")
def health():
    return {"status": "ok"}

async def get_telemetry() -> dict:
    #this will have to read data from our various sources
    return {
        "battery": 98.5,
        "altitude": 5.2,
        "heading": 180,
        "speed": 12.3,
        "mode": "GUIDED"
    }

@app.websocket("/drone/telemetry")
async def telemetry():
    await websoocket.accept()

    try: 
        while True:
            data = await get_telemetry()
            await websocket.send_json(data)
            await asyncio.sleep(0.5)
    except:
        print("TELEMETRY CLIENT DISCONNECT")