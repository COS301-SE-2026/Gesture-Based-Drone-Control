# DummyDroneAdapter

## Overview

The DummyDroneAdapter is a minimal implementation of the DroneAdapter abstract base class.

It is used as:

- a testing stub
- a development mock
- a demonstration of dynamic adapter switching

It performs no real drone operations. All methods only log actions or return fixed values.

It is intended mainly to be used as the first adapter a new input method is tested with.

---

## Purpose

This adapter exists to:

- validate control flow without a simulator
- test command routing logic
- simulate a connected drone interface
- support development when AirSim or Project AirSim is unavailable

---

## DummyDroneAdapter Class

### Class Definition

Implements:

- DroneAdapter (abstract base class)

---

## State

### Internal variables

- _connected: bool
  - tracks whether the adapter is logically connected

---

## Connection Lifecycle

### connect() -> bool

Attempts to mark the adapter as connected.

Behavior:

- If already connected:
  - logs message
  - returns `False`

- If not connected:
  - sets _connected = `True`
  - logs successful connection
  - returns `True`

---

### disconnect() -> None

Marks the adapter as disconnected.

Behavior:

- If already disconnected:
  - logs message and exits

- If connected:
  - sets _connected = `False`
  - logs disconnection

---

## Flight Commands

### takeoff() -> None

Simulates drone takeoff.

Behavior:

- logs: "DummyDroneAdapter took off"
- no state change

---

### land() -> None

Simulates landing operation.

Behavior:

- requires connection via `_assert_connected()`
- logs landing event

---

### move(direction: CommandType, **kwargs) -> None

Simulates directional movement or rotation.

Parameters:

- direction: CommandType
- kwargs: optional movement parameters (ignored)

Behavior:

- requires connection via `_assert_connected()`
- logs movement command with direction name

---

### hover() -> None

Not implemented.

- Simply logs a success message when called

---

### emergency_stop() -> None

- Simply logs a success message when called

---

## Telemetry

### get_telemetry() -> TelemetryData

Returns a fixed dummy telemetry snapshot.

### Returned values

- `altitude_m`: 1
- `speed_ms`: 2
- `battery_pct`: 300.0 (intentionally invalid to for endpoint testing)
- `heading_deg`: 0
- `is_flying`: True
- `source`: "dummy"

---

## Connection Guard

### _assert_connected()

Ensures the adapter is connected before executing commands.

Raises:

RuntimeError if:

- _connected is False

Message:

- "DummyDroneAdapter is not connected. Await connect() before issuing commands."

---

## Notes

- This adapter is for use mainly as a placeholder for testing
- It is safe to use in unit tests and CI pipelines
- This should be the first adapter any new input method is vetted with