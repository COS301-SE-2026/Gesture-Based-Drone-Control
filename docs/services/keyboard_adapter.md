
### Notes

A concrete InputAdapter that recieves browser key events forwarded
over a WebSocket connection and maps them to appropriate Command objects

The drone SDK runs in the python process, meaning the browser cannot talk
to it directly. The react frontend will thus capture raw keydown/up events and
forwards them as a JSON object through a WebSocket to FastAPI.
This adapter receives those messages and converts them into Commands that can
be used by the DroneAdapter.

This means that this adapter is not a standard keyboard listener like was implemented
as a proof of concept. Instead, it purely translates a message shape to a command.

Message format:

```
  { "key": "ArrowUp", "event": "keydown" }
  { "key": "ArrowUp", "event": "keyup" }
```

Currently we only consider keydown events. keyup is recieved and ignored for now,
but its included such that we can eventually support continuous movement without changing
any endpoints or parsing, only this file would be changed.

---

## Key Mapping

KEY_MAP defines the mapping between browser keys and CommandType values.

Keymapping:

The KEY_MAP dict is the single source of truth. currently custom keybinds are not supported,
however it can be added at a later stage.

```
  Arrow keys    : directional movement (forward/back/left/right)
  W / S         : altitude up / down
  A / D         : rotate counter-clockwise / clockwise
  T             : takeoff
  L             : land
  Spacebar      : hover (cancel movement)
  Escape        : EMERGENCY_STOP
```

---

## Example Usage

Usage: **FastAPI WebSockets**
    
    # intialisation
    adapter = KeyboardAdapter()
    adapter.set_handler(lambda cmd: asyncio.create_task(drone.execute(cmd)))
    await adapter.start()

    @app.websocket("/ws/keyboard")
    async def ws_keyboard(ws: WebSocket):
      await ws.accept()
      while True:
        msg = await ws.receive_json()
        adapter.handle_message(msg)

Usage: **PyTest unit testing**:

    received: list[Command] = []
    adapter = KeyboardAdapter()
    adapter.set_handler(received.append)

    adapter.handle_message({"key": "t", "event": "keydown"})
    assert received[0].type == CommandType.TAKEOFF

---

## KeyboardAdapter Class

### Inheritance
- InputAdapter

---

## Lifecycle

### start() -> None

Initialises the adapter.

Behavior:
- no listeners are created
- no background tasks are started
- logs readiness for WebSocket input

---

## Core Method

### handle_message(message: dict[str, Any]) -> None

Processes a single keyboard event message from the frontend.

---

### Parameters

- message: dict
  - key: str (KeyboardEvent.key value)
  - event: str ("keydown" | "keyup")

---

### Processing logic

1. Extract key and event
2. Ignore non-keydown events
3. Lookup key in KEY_MAP
4. If no mapping exists, ignore
5. Create Command
6. Emit via _emit()

---

### Ignored inputs

- keyup events
- unmapped keys
- malformed or irrelevant inputs

These are silently ignored to avoid noise from browser shortcuts and system keys.

---

## Command emission

### _emit(command: Command)

Delegates to InputAdapter._emit().

This routes the command to the registered handler, typically:

- DroneAdapter.execute()

---

## Utility

### get_bindings() -> dict[str, str]

Returns a readable mapping of keyboard keys to command names.

---
