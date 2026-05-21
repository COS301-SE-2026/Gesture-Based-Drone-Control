"""
Drone adapters pipeline - Demo / user testing script

A self contained FastAPI server that wires up InputAdapters and DroneAdapters
and provides a minimal web UI to interact with each component

This aims to showcase the two adapters being used, allowing for instant compatibility
from all supported forms of input to all supported forms of output.

Currently movement is implemented as an execution of a discrete command
Analog movement is intended as an expansion at some point

How to use:

First have your instance of whatever real drone/sim active
Then:
    uv run python demo.py
        or
    python demo.py

Then open http://localhost:8000

Adapters:
    Input  : keyboard (WebSocket forwarding), dummy (on-screen buttons)
    Drone  : dummy (logs only), airsim, projectairsim

Demo mode:
    Arms the drone, ascends, then flies a figure-8 pattern infinitely

"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

logging.basicConfig(
  level=logging.INFO,
  format='%(asctime)s  %(levelname)-8s  %(name)s - %(message)s',
)

logger = logging.getLogger('demo')

import airsim  # daniel
import projectairsim  # the cooler daniel

from services.commands.command import Command, CommandType  # type: ignore
from services.input.sources.input_adapter import InputAdapter  # type: ignore
from services.input.sources.keyboard_adapter import KeyboardAdapter  # type: ignore

from services.input.sources.dummy_input_adapter import DummyInputAdapter
from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter

from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData  # type: ignore
from services.drone_control.adapters.airsim_adapter import AirSimAdapter  # type: ignore
from services.drone_control.adapters.project_airsim_adapter import ProjectAirSimAdapter  # type: ignore


def _load_projectairsim_adapter() -> type[DroneAdapter] | None:
  try:
    return ProjectAirSimAdapter
  except ImportError:
    return None


# app state


class AppState:
  def __init__(self) -> None:
    # Lazy init for adapters, wait until called
    self.input_adapter: InputAdapter | None = None
    self.drone_adapter: DroneAdapter | None = None

    # input options not optional
    self.dummy_input = DummyInputAdapter()
    self.keyboard_input = KeyboardAdapter()

    # Drone adapter registry - populated at startup
    self.drone_registry: dict[str, DroneAdapter] = {}

    # Demo mode
    self.demo_task: asyncio.Task | None = None
    self.demo_running: bool = False

    # Telemetry broadcast connections
    self.telemetry_clients: list[WebSocket] = []

    # Event log (last N entries sent to UI)
    self.event_log: list[str] = []

  def log(self, msg: str) -> None:
    ts = time.strftime('%H:%M:%S')
    entry = f'[{ts}] {msg}'
    self.event_log.append(entry)
    self.event_log = self.event_log[-100:]  # keep last 100
    logger.info(msg)

  # Switching adapters

  async def set_drone_adapter(self, name: str) -> bool:
    if name not in self.drone_registry:
      self.log(f'Unknown drone adapter: {name}')
      return False

    new_adapter = self.drone_registry[name]
    if new_adapter is self.drone_adapter:
      self.log(f'Drone adapter already set to {name}')
      return True

    # Disconnect old
    if self.drone_adapter is not None:
      try:
        await self.drone_adapter.disconnect()
      except Exception as ex:
        self.log(f'Disconnect error: {ex}')

    self.drone_adapter = new_adapter
    ok = await new_adapter.connect()
    if ok:
      self.log(f'Drone adapter switched -> {name}')
      # Re-wire input handler
      if self.input_adapter is not None:
        self.input_adapter.set_handler(
          lambda cmd: asyncio.create_task(self.drone_adapter.execute(cmd))
        )
    else:
      self.log(f'Drone adapter {name} failed to connect')
    return ok

  async def set_input_adapter(self, name: str) -> bool:
    adapter_map = {
      'dummy': self.dummy_input,
      'keyboard': self.keyboard_input,
    }
    if name not in adapter_map:
      self.log(f'Unknown input adapter: {name}')
      return False

    new_adapter = adapter_map[name]
    if new_adapter is self.input_adapter:
      self.log(f'Input adapter already set to {name}')
      return True

    if self.drone_adapter is not None:
      new_adapter.set_handler(
        lambda cmd: asyncio.create_task(self.drone_adapter.execute(cmd))
      )
    await new_adapter.start()
    self.input_adapter = new_adapter
    self.log(f'Input adapter switched -> {name}')
    return True

  # command passthrough for dummyinputadapter

  async def send_command(self, cmd_name: str) -> bool:
    if self.drone_adapter is None:
      self.log('No drone adapter connected')
      return False
    try:
      cmd_type = CommandType[cmd_name.upper()]
    except KeyError:
      self.log(f'Unknown command: {cmd_name}')
      return False

    cmd = Command(type=cmd_type, source='ui-button')
    self.log(f'CMD -> {cmd_type.name}')
    await self.drone_adapter.execute(cmd)
    return True

  # figure 8 demo
  async def start_demo(self) -> None:
    if self.demo_running:
      self.log('Demo already running')
      return
    if self.drone_adapter is None:
      self.log('No drone adapter - cannot start demo')
      return

    self.demo_running = True
    self.demo_task = asyncio.create_task(self._figure8_loop())
    self.log('Demo mode started - figure-8 pattern')

  async def stop_demo(self) -> None:
    self.demo_running = False
    if self.demo_task:
      self.demo_task.cancel()
      try:
        await self.demo_task
      except asyncio.CancelledError:
        pass
      self.demo_task = None
    if self.drone_adapter:
      await self.drone_adapter.hover()
    self.log('Demo mode stopped')

  async def _figure8_loop(self) -> None:
    """
    Figure-8 flight pattern.

    The pattern is decomposed into discrete commands compatible with
    the existing DroneAdapter interface (move + rotate).

    Honestly no idea if its an actual figure 8. we go off vibes here
    """
    drone = self.drone_adapter
    try:
      self.log('Demo: arming and ascending…')
      await drone.takeoff()
      await asyncio.sleep(2)

      # climb a bit higher than default hover
      for _ in range(4):
        await drone.move(CommandType.MOVE_UP)
        await asyncio.sleep(0.4)

      self.log('Demo: beginning figure-8…')

      loop_count = 0
      while self.demo_running:
        loop_count += 1
        self.log(f'Demo: loop #{loop_count}')

        # right ear
        # Forward into the lobe
        for _ in range(3):
          if not self.demo_running:
            break
          await drone.move(CommandType.MOVE_FORWARD)
          await asyncio.sleep(0.3)

        # Curve right (4 steps of rotate CW + forward)
        for _ in range(4):
          if not self.demo_running:
            break
          for _ in range(2):
            await drone.move(CommandType.ROTATE_CW)
            await asyncio.sleep(0.1)
          await drone.move(CommandType.MOVE_FORWARD)

        # Cross through centre
        for _ in range(2):
          if not self.demo_running:
            break
          await drone.move(CommandType.MOVE_FORWARD)
          await asyncio.sleep(0.3)

        # left ear
        # Forward into the lobe
        for _ in range(2):
          if not self.demo_running:
            break
          await drone.move(CommandType.MOVE_FORWARD)
          await asyncio.sleep(0.3)

        # Curve left (4 steps of rotate CCW + forward)
        for _ in range(4):
          if not self.demo_running:
            break
          for _ in range(2):
            await drone.move(CommandType.ROTATE_CW)
            await asyncio.sleep(0.1)
          await drone.move(CommandType.MOVE_FORWARD)

        # Return to start of the 8
        for _ in range(2):
          if not self.demo_running:
            break
          await drone.move(CommandType.MOVE_FORWARD)
          await asyncio.sleep(0.3)

      await drone.hover()
    except asyncio.CancelledError:
      self.log('Demo: cancelled')
      raise
    except Exception as ex:
      self.log(f'Demo error: {ex}')
      logger.exception('Figure-8 demo error')

  # Telemetry broadcast

  async def broadcast_telemetry(self) -> None:
    """Runs forever; pushes telemetry to all connected WebSocket clients."""
    while True:
      await asyncio.sleep(0.5)
      if not self.telemetry_clients:
        continue
      if self.drone_adapter is None:
        data = {'source': 'none'}
      else:
        try:
          t = await self.drone_adapter.get_telemetry()
          data = {
            'altitude_m': t.altitude_m,
            'speed_ms': t.speed_ms,
            'battery_pct': t.battery_pct,
            'heading_deg': t.heading_deg,
            'is_flying': t.is_flying,
            'source': t.source,
          }
        except Exception as ex:
          data = {'error': str(ex)}

      payload = json.dumps({'type': 'telemetry', 'data': data})
      dead = []
      for ws in self.telemetry_clients:
        try:
          await ws.send_text(payload)
        except Exception:
          dead.append(ws)
      for ws in dead:
        self.telemetry_clients.remove(ws)


# minimal fastapi app

state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
  # Startup****
  state.log('Demo server starting…')

  # Build drone registry
  state.drone_registry['dummy'] = DummyDroneAdapter()

  if AirSimAdapter:
    state.drone_registry['airsim'] = AirSimAdapter()
    state.log('AirSim adapter available')

  if ProjectAirSimAdapter:
    state.drone_registry['projectairsim'] = ProjectAirSimAdapter()
    state.log('ProjectAirSim adapter available')

  # Default to dummy adapters
  await state.set_drone_adapter('dummy')
  await state.set_input_adapter('keyboard')

  # Start telemetry broadcast loop
  telem_task = asyncio.create_task(state.broadcast_telemetry())

  state.log('Ready - http://localhost:8000')

  yield

  # shutdown****
  telem_task.cancel()
  await state.stop_demo()
  if state.drone_adapter:
    await state.drone_adapter.disconnect()
  state.log('Server shut down')


app = FastAPI(title='Drone Demo', lifespan=lifespan)

# general REST endpoints


@app.get('/', response_class=HTMLResponse)
async def index():
  return HTMLResponse(FRONTEND_HTML)


@app.get('/api/status')
async def api_status():
  drone_name = 'none'
  for name, adapter in state.drone_registry.items():
    if adapter is state.drone_adapter:
      drone_name = name
      break

  input_name = 'none'
  if state.input_adapter is state.keyboard_input:
    input_name = 'keyboard'
  elif state.input_adapter is state.dummy_input:
    input_name = 'dummy'

  return {
    'drone_adapter': drone_name,
    'input_adapter': input_name,
    'drone_adapters': list(state.drone_registry.keys()),
    'input_adapters': ['keyboard', 'dummy'],
    'demo_running': state.demo_running,
    'log': state.event_log[-20:],
  }


# post methods to interact with the switcher


@app.post('/api/drone/{name}')
async def switch_drone(name: str):
  ok = await state.set_drone_adapter(name)
  return {'ok': ok}


@app.post('/api/input/{name}')
async def switch_input(name: str):
  ok = await state.set_input_adapter(name)
  return {'ok': ok}


@app.post('/api/command/{cmd}')
async def send_command(cmd: str):
  ok = await state.send_command(cmd)
  return {'ok': ok}


@app.post('/api/demo/start')
async def demo_start():
  await state.start_demo()
  return {'ok': True}


@app.post('/api/demo/stop')
async def demo_stop():
  await state.stop_demo()
  return {'ok': True}


# websocket for keyboard events


@app.websocket('/ws/keyboard')
async def ws_keyboard(ws: WebSocket):
  await ws.accept()
  state.log('Keyboard WebSocket connected')
  try:
    while True:
      msg = await ws.receive_json()
      state.keyboard_input.handle_message(msg)
  except WebSocketDisconnect:
    state.log('Keyboard WebSocket disconnected')


# websocket for telemetry and logs streaming


@app.websocket('/ws/telemetry')
async def ws_telemetry(ws: WebSocket):
  await ws.accept()
  state.telemetry_clients.append(ws)
  # send current log immediately
  await ws.send_text(json.dumps({'type': 'log', 'data': state.event_log[-50:]}))
  try:
    while True:
      await asyncio.sleep(1)  # keep alive. telemetry pushed from broadcast loop
  except WebSocketDisconnect:
    if ws in state.telemetry_clients:
      state.telemetry_clients.remove(ws)


# basic html css to not look ass ugly

FRONTEND_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Adapter Demo</title>

<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: Monaco, Helvetica, sans-serif;
    background: #101010;
    color: #e5e5e5;
    font-size: 18px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 22px;
    background: #181818;
    border-bottom: 2px solid #2c2c2c;
  }

  header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin-right: 10px;
  }

  .pill {
    padding: 6px 12px;
    border-radius: 6px;
    background: #232323;
    border: 1px solid #3a3a3a;
    color: #cfcfcf;
    font-size: 15px;
  }

  .pill.active {
    background: #1f3a1f;
    border-color: #3d6b3d;
    color: #8fe28f;
  }

  .pill.demo {
    background: #3a2a12;
    border-color: #7a5820;
    color: #f0c060;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    gap: 20px;
  }

.top-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
}

  section {
    background: #181818;
    border: 1px solid #2f2f2f;
    border-radius: 10px;
    padding: 20px;
  }

  h2 {
    font-size: 18px;
    margin-bottom: 18px;
    color: #ffffff;
    border-bottom: 1px solid #303030;
    padding-bottom: 10px;
  }

  button {
    width: 100%;
    padding: 14px;
    margin-bottom: 10px;
    background: #252525;
    border: 1px solid #444;
    border-radius: 6px;
    color: #f0f0f0;
    font-size: 17px;
    cursor: pointer;
    transition: background 0.15s;
  }

  button:hover {
    background: #333333;
  }

  button.selected {
    background: #295229;
    border-color: #4f8b4f;
  }

  button.danger {
    border-color: #8a2f2f;
    color: #ff9090;
  }

  button.demo-btn.active {
    background: #5a4315;
    border-color: #b78a2a;
  }

  .section-gap {
    margin-top: 26px;
  }

  /* Telemetry */

  .telem-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .telem-cell {
    background: #111111;
    border: 1px solid #303030;
    border-radius: 8px;
    padding: 16px;
  }

  .telem-label {
    font-size: 13px;
    color: #999999;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .telem-value {
    font-size: 30px;
    font-weight: bold;
    color: #ffffff;
  }

  /* Controls */

.controls-wrapper {
  display: flex;
  justify-content: flex-start;
}

  .cmd-panel {
    width: 100%;
    max-width: 900px;
  }

  .control-grid {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 40px;
    align-items: center;
  }

  .dpad {
    display: grid;
    grid-template-areas:
      ". up ."
      "left mid right"
      ". down .";
    gap: 10px;
    justify-content: center;
  }

  .dpad button {
    width: 80px;
    height: 70px;
    margin: 0;
    text-align: center;
    font-size: 28px;
    font-weight: bold;
  }

  .dpad .up    { grid-area: up; }
  .dpad .down  { grid-area: down; }
  .dpad .left  { grid-area: left; }
  .dpad .right { grid-area: right; }

  .dpad .mid {
    grid-area: mid;
    background: #141414;
    border-color: #222;
    color: #555;
    cursor: default;
  }

  .side-controls {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .control-row {
    display: flex;
    gap: 12px;
  }

  .control-row button {
    flex: 1;
    text-align: center;
    margin-bottom: 0;
  }

  .e-stop {
    background: #5a1010 !important;
    border-color: #a02020 !important;
    color: #ffffff !important;
    font-size: 20px !important;
    font-weight: bold;
    padding: 18px !important;
  }

  /* Event Log */

  .log-panel {
    width: 100%;
    max-width: 1000px;
    align-self: center;
  }

  #log {
    background: #0c0c0c;
    border: 1px solid #303030;
    border-radius: 8px;
    padding: 18px;
    height: 320px;
    overflow-y: auto;
    font-size: 17px;
    line-height: 1.7;
    color: #d0d0d0;
  }

  #log .entry.warn {
    color: #ffca6a;
  }

  #log .entry.error {
    color: #ff8f8f;
  }

  /* Keyboard */

  .keyboard-info {
    margin-top: 18px;
    color: #bbbbbb;
    line-height: 2;
    font-size: 16px;
  }

  kbd {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 15px;
  }

  footer {
    padding: 14px 22px;
    background: #181818;
    border-top: 1px solid #2f2f2f;
    color: #999999;
    font-size: 15px;
  }

  @media (max-width: 1100px) {

    .top-layout {
      grid-template-columns: 1fr;
    }

    .control-grid {
      grid-template-columns: 1fr;
    }

    .dpad {
      margin-bottom: 20px;
    }
  }
</style>
</head>

<body>

<header>
  <h1>Adapter Demo</h1>

  <span class="pill" id="pill-drone">Drone: -</span>
  <span class="pill" id="pill-input">Input: -</span>
  <span class="pill" id="pill-demo">Demo: Off</span>
  <span class="pill" id="pill-fly">Grounded</span>
</header>

<main>

  <div class="top-layout">

    <!-- Left Panel -->
    <section>

      <h2>Drone Adapter</h2>
      <div id="drone-btns"></div>

      <div class="section-gap"></div>

      <h2>Input Adapter</h2>

      <button id="btn-input-keyboard" onclick="switchInput('keyboard')">
        Keyboard
      </button>

      <button id="btn-input-dummy" onclick="switchInput('dummy')">
        dummy (on screen)
      </button>

      <div class="section-gap"></div>

      <h2>Demo Mode</h2>

      <button class="demo-btn" id="btn-demo-toggle" onclick="toggleDemo()">
        Start Figure Eight
      </button>

      <div class="section-gap"></div>

      <h2>Telemetry</h2>

      <div class="telem-grid">

        <div class="telem-cell">
          <div class="telem-label">Altitude</div>
          <div class="telem-value" id="t-alt">-</div>
        </div>

        <div class="telem-cell">
          <div class="telem-label">Speed</div>
          <div class="telem-value" id="t-spd">-</div>
        </div>

        <div class="telem-cell">
          <div class="telem-label">Heading</div>
          <div class="telem-value" id="t-hdg">-</div>
        </div>

        <div class="telem-cell">
          <div class="telem-label">Battery</div>
          <div class="telem-value" id="t-bat">-</div>
        </div>

      </div>

    </section>

    <!-- Controls + Log Combined -->
    <section class="controls-wrapper">

      <div class="cmd-panel">

        <h2>Flight Controls</h2>

        <div class="control-grid">

          <!-- D Pad -->
          <div class="dpad">

            <button class="up" onclick="cmd('move_forward')">^</button>

            <button class="left" onclick="cmd('move_left')"><</button>

            <button class="mid" disabled>+</button>

            <button class="right" onclick="cmd('move_right')">></button>

            <button class="down" onclick="cmd('move_backward')">v</button>

          </div>

          <!-- Other Controls -->
          <div class="side-controls">

            <div class="control-row">
              <button onclick="cmd('move_up')">Altitude Up</button>
              <button onclick="cmd('move_down')">Altitude Down</button>
            </div>

            <div class="control-row">
              <button onclick="cmd('rotate_ccw')">Rotate Left</button>
              <button onclick="cmd('rotate_cw')">Rotate Right</button>
            </div>

            <div class="control-row">
              <button onclick="cmd('takeoff')">Take Off</button>
              <button onclick="cmd('hover')">Hover</button>
              <button onclick="cmd('land')">Land</button>
            </div>

            <button class="e-stop" onclick="cmd('emergency_stop')">
              Emergency Stop
            </button>

          </div>

        </div>

        <!-- Event Log moved directly under controls -->
        <div class="section-gap"></div>

        <h2>Event Log</h2>

        <div id="log"></div>

        <div class="keyboard-info">

          <div>
            <kbd>Arrow Keys</kbd> Move
          </div>

          <div>
            <kbd>W</kbd> and <kbd>S</kbd> Altitude
          </div>

          <div>
            <kbd>A</kbd> and <kbd>D</kbd> Rotate
          </div>

          <div>
            <kbd>T</kbd> Take Off
            &nbsp;&nbsp;
            <kbd>L</kbd> Land
          </div>

          <div>
            <kbd>Space</kbd> Hover
            &nbsp;&nbsp;
            <kbd>Escape</kbd> Emergency Stop
          </div>

        </div>

      </div>

    </section>

  </div>

</main>

<footer>
  Keyboard input is active while this page is focused.
</footer>

<script>
// WebSocket: keyboard forwarding
const wsKey = new WebSocket(`ws://${location.host}/ws/keyboard`);

wsKey.onopen = () => console.log("keyboard ws open");
wsKey.onerror = e => console.warn("keyboard ws error", e);

document.addEventListener("keydown", e => {
  if (wsKey.readyState !== WebSocket.OPEN) return;

  if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;

  e.preventDefault();

  wsKey.send(JSON.stringify({
    key: e.key,
    event: "keydown"
  }));
});

document.addEventListener("keyup", e => {
  if (wsKey.readyState !== WebSocket.OPEN) return;

  if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;

  wsKey.send(JSON.stringify({
    key: e.key,
    event: "keyup"
  }));
});

// Telemetry
const wsTelem = new WebSocket(`ws://${location.host}/ws/telemetry`);

wsTelem.onmessage = e => {
  const msg = JSON.parse(e.data);

  if (msg.type === "telemetry") updateTelemetry(msg.data);

  if (msg.type === "log") {
    msg.data.forEach(appendLog);
  }
};

function updateTelemetry(d) {

  setText(
    "t-alt",
    d.altitude_m !== undefined ? d.altitude_m.toFixed(2) : "-"
  );

  setText(
    "t-spd",
    d.speed_ms !== undefined ? d.speed_ms.toFixed(2) : "-"
  );

  setText(
    "t-hdg",
    d.heading_deg !== undefined ? d.heading_deg.toFixed(1) : "-"
  );

  setText(
    "t-bat",
    d.battery_pct !== undefined ? d.battery_pct.toFixed(0) + "%" : "-"
  );

  const flyEl = document.getElementById("pill-fly");

  if (d.is_flying) {
    flyEl.textContent = "Airborne";
    flyEl.className = "pill active";
  } else {
    flyEl.textContent = "Grounded";
    flyEl.className = "pill";
  }
}

// API helpers
async function api(method, path) {
  const r = await fetch(path, { method });
  return r.json();
}

async function cmd(name) {
  await api("POST", `/api/command/${name}`);
  pollStatus();
}

async function switchDrone(name) {
  await api("POST", `/api/drone/${name}`);
  pollStatus();
}

async function switchInput(name) {
  await api("POST", `/api/input/${name}`);
  pollStatus();
}

let demoRunning = false;

async function toggleDemo() {

  if (demoRunning) {
    await api("POST", "/api/demo/stop");
  } else {
    await api("POST", "/api/demo/start");
  }

  pollStatus();
}

// Status
async function pollStatus() {
  const s = await api("GET", "/api/status");
  applyStatus(s);
}

function applyStatus(s) {

  const droneDiv = document.getElementById("drone-btns");

  if (droneDiv.children.length !== s.drone_adapters.length) {

    droneDiv.innerHTML = "";

    s.drone_adapters.forEach(name => {

      const b = document.createElement("button");

      b.id = "btn-drone-" + name;
      b.textContent = name;
      b.onclick = () => switchDrone(name);

      droneDiv.appendChild(b);
    });
  }

  s.drone_adapters.forEach(name => {

    const b = document.getElementById("btn-drone-" + name);

    if (b) {
      b.className = name === s.drone_adapter ? "selected" : "";
    }
  });

  ["keyboard","dummy"].forEach(name => {

    const b = document.getElementById("btn-input-" + name);

    if (b) {
      b.className = name === s.input_adapter ? "selected" : "";
    }
  });

  setText("pill-drone", "Drone: " + s.drone_adapter);
  setText("pill-input", "Input: " + s.input_adapter);

  const demoEl = document.getElementById("pill-demo");
  const demoBtnEl = document.getElementById("btn-demo-toggle");

  demoRunning = s.demo_running;

  if (demoRunning) {

    demoEl.textContent = "Demo: Running";
    demoEl.className = "pill demo";

    demoBtnEl.textContent = "Stop Demo";
    demoBtnEl.className = "demo-btn active";

  } else {

    demoEl.textContent = "Demo: Off";
    demoEl.className = "pill";

    demoBtnEl.textContent = "Start Figure Eight";
    demoBtnEl.className = "demo-btn";
  }

  if (s.log) {
    s.log.forEach(appendLog);
  }
}

// Log
const seen = new Set();

function appendLog(line) {

  if (seen.has(line)) return;

  seen.add(line);

  const el = document.getElementById("log");

  const div = document.createElement("div");

  div.className =
    "entry" +
    (
      line.toLowerCase().includes("error")
        ? " error"
        : line.toLowerCase().includes("warn")
        ? " warn"
        : ""
    );

  div.textContent = line;

  el.appendChild(div);

  el.scrollTop = el.scrollHeight;
}

function setText(id, val) {

  const el = document.getElementById(id);

  if (el) {
    el.textContent = val;
  }
}

// Init
pollStatus();

setInterval(pollStatus, 3000);
</script>

</body>
</html>
"""

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
  host = '0.0.0.0'
  port = 8000
  print(f'\n  Drone Demo  ->  http://localhost:{port}\n')
  uvicorn.run(app, host=host, port=port, log_level='warning')
