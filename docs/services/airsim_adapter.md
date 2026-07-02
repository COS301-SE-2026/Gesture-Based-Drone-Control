# AirSim Adapter

## Overview

The AirSimAdapter is a concrete implementation of DroneAdapter that wraps the AirSim Python client library.

It provides a full bridge between the DroneAdapter interface and the AirSim multirotor API.

This is not intended to be used very much. It works reliably, however the same cannot be said for legacy Airsim itself.  

---

## Prerequisites

### 1. AirSim runtime

An AirSim instance must already be running before `connect()` is called.

Default configuration:
- host: localhost
- port: 41451

- this is user configurable so theoretically it can connect to a remote instance of Airsim.
---

### 2. Python package

The AirSim Python package must be available in the active environment. It is worth noting that a pip install for this package needs to be done with all prerequisites already installed in the environment, as well as the `--no-build-isolation` flag

It should be installed when running via:

- `uv run` in the services environment
- or equivalent virtual environment setup

---

## Coordinate System (AirSim NED)

AirSim uses a North-East-Down coordinate system:

- +x = North (forward)
- +y = East (right)
- +z = Down (negative altitude when airborne)

### Implications

- Move up -> negative z velocity
- Move down -> positive z velocity
- Altitude must negate z position

All conversions are handled inside this adapter so that external consumers always receive consistent telemetry data.

---

## Async Behaviour Notes

AirSim movement calls return async-style objects that require `.join()` to block until completion.

Because this can block the event loop, operations are executed using:

- `asyncio.get_event_loop().run_in_executor()`

This is currently abstracted via `_run()`.

### Important note

For simplicity, `.join()` is still used directly inside the executor.
This should be refactored in production for fully non-blocking behaviour.

---

## Configuration Constants

### Movement

- DEFAULT_DISTANCE_M = 1.0
- DEFAULT_SPEED_MS = 2.0
- DEFAULT_DURATION_S = 0.5

### Rotation

- DEFAULT_ROTATE_DEG = 15.0
- DEFAULT_YAW_RATE_DPS = 45.0

---

## AirSimAdapter Class

### Purpose

Wraps `airsim.MultirotorClient` and implements the DroneAdapter interface.

---

### Constructor

#### AirSimAdapter(host, port, vehicle_name)

Parameters:

- host: IP address of AirSim instance (default: localhost)
- port: RPC port (default: 41451)
- vehicle_name: multirotor name in settings.json

---

## Internal State

- _host: connection host
- _port: RPC port
- _vehicle: vehicle identifier
- _client: AirSim MultirotorClient instance
- _connected: connection state flag

---

## Connection Lifecycle

### connect() -> bool

Connects to AirSim, enables API control, and arms the vehicle.

Returns:
- True if successful
- False if connection fails

Behavior:
- Chooses default or custom client initialization
- Calls confirmConnection()
- Enables API control
- Arms vehicle

---

### disconnect() -> None

- Disarms vehicle
- Disables API control
- Marks adapter as disconnected

---

## Flight Commands

### takeoff()

Commands drone to ascend to hover altitude.

Note:
- Blocks until completion using `.join()`

---

### land()

Commands drone to land and disarm.

---

### hover()

Stops movement and holds position.

---

### emergency_stop()

Immediately cancels active tasks and triggers hover.

Behavior:
- Calls cancelLastTask()
- Calls hoverAsync()

If client is None, logs warning and returns safely.

---

## Movement

### move(direction: CommandType, **kwargs)

Executes directional movement or rotation.

---

### Parameters

- direction: CommandType
- speed_ms: movement speed (default: 2.0)
- duration_s: movement duration (default: 0.5)
- degrees: rotation amount (for rotation commands)

---

### Supported Commands

#### Movement

- MOVE_FORWARD
- MOVE_BACKWARD
- MOVE_LEFT
- MOVE_RIGHT
- MOVE_UP
- MOVE_DOWN

Mapped to velocity vectors in NED frame.

---

#### Rotation

- ROTATE_CW
- ROTATE_CCW

Handled via `_rotate()` using yaw rate control.

---

### Post-move behaviour

After every movement:
- drone is forced into hover state to prevent drift

---

## Telemetry

### get_telemetry() -> TelemetryData

Returns a normalized snapshot of drone state.

---

### Fields

- altitude_m: computed from an inversion of the Z coordinate value
- speed_ms: magnitude of velocity vector
- battery_pct: fixed at 100 (AirSim limitation)
- heading_deg: derived from quaternion yaw
- is_flying: derived from landed state
- source: "airsim"
- extra: omitted (not used here)

---

### Failure cases

Returns:

- TelemetryData(source="airsim-disconnected") if not connected
- TelemetryData(source="airsim-error") on exception

---

## Rotation Helper

### _rotate(direction, degrees)

Rotates drone using yaw rate control.

- clockwise = positive yaw rate
- counter-clockwise = negative yaw rate

Duration is computed from:
`degrees / DEFAULT_YAW_RATE_DPS`

---

## Heading Calculation

### _get_heading_deg()

Converts quaternion orientation into degrees:

- 0–360 range
- clockwise from North

Falls back to 0.0 on failure.

---

## Connection Guard

### _assert_connected()

Raises RuntimeError if:

- client is None
- adapter is not connected

Prevents invalid command execution.

---

## Summary

This adapter is responsible for:

- AirSim connection lifecycle management
- NED coordinate conversion
- Movement and rotation abstraction
- Telemetry normalization
- Async-to-blocking bridging via executor