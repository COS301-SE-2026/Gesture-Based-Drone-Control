# DummyInputAdapter

## Overview

The DummyInputAdapter is a minimal implementation of InputAdapter used for testing and simulation.

It does not interface with real input devices. Instead, it exposes manual trigger methods that simulate user actions and generate Command objects.

This allows verification of the full pipeline:

InputAdapter -> Command -> DroneAdapter

---

## Purpose

This adapter is used for:

- unit testing input-to-command mapping
- validating system integration without hardware
- simulating user actions deterministically
- debugging command flow

---

## DummyInputAdapter Class

### Class Definition

Extends:

- InputAdapter

---

## Internal State

### _started: bool

Tracks whether the adapter has been started.

Initial value:

- False

---

### emitted: list[Command]

Stores all emitted commands.

Used for:

- test assertions
- verifying correct command generation
- debugging input flow

---

## Lifecycle

### start() -> None

Marks the adapter as active.

Behavior:

- logs startup event
- sets _started = True

Notes:

- does not start real listeners
- does not spawn background tasks
- purely state-based for testing

---

## Input Simulation Methods

Each method simulates a user action and emits a corresponding Command.

All commands use:

- source = "dummy-input"

---

### trigger_takeoff()

Emits:

- CommandType.TAKEOFF

---

### trigger_land()

Emits:

- CommandType.LAND

---

### trigger_move_forward()

Emits:

- CommandType.MOVE_FORWARD

---

### trigger_move_backward()

Emits:

- CommandType.MOVE_BACKWARD

---

### trigger_rotate_cw()

Emits:

- CommandType.ROTATE_CW

---

### trigger_rotate_ccw()

Emits:

- CommandType.ROTATE_CCW

---

### trigger_hover()

Emits:

- CommandType.HOVER

---

### trigger_emergency_stop()

Emits:

- CommandType.EMERGENCY_STOP

---

## Emission Override

### _emit(command: Command) -> None

Overrides InputAdapter._emit to add test visibility.

### Behavior

1. Appends command to emitted list
2. Calls parent _emit() implementation

This preserves normal pipeline behaviour while enabling inspection.

---

## Execution Flow

Example flow:

1. trigger_move_forward() called
2. Command created
3. _emit(command) invoked
4. InputAdapter handler receives command
5. DroneAdapter.execute() processes command
6. Command executed by concrete adapter

---

## Notes

- This adapter is strictly for testing and simulation
- It is safe to use in CI pipelines
- It should never be used as a production input source