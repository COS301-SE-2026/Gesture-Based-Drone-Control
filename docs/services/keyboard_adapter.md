
### Notes

- Only "keydown" events are processed
- "keyup" events are ignored for now (reserved for future continuous control support)

---

## Key Mapping

KEY_MAP defines the mapping between browser keys and CommandType values.

### Directional movement
- ArrowUp -> MOVE_FORWARD
- ArrowDown -> MOVE_BACKWARD
- ArrowLeft -> MOVE_LEFT
- ArrowRight -> MOVE_RIGHT

### Altitude control
- w -> MOVE_UP
- s -> MOVE_DOWN

### Rotation
- a -> ROTATE_CCW
- d -> ROTATE_CW

### Flight control
- t -> TAKEOFF
- l -> LAND
- Space -> HOVER

### Safety
- Escape -> EMERGENCY_STOP

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

### Example output
