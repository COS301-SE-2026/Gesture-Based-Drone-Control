# Drone Adapter Interface

## Overview

The `DroneAdapter` abstract base class defines the standard interface for all drone control implementations.

It acts as a core abstraction layer, allowing uniform interaction between all drone implementations, specifically our real drone and simulators. To implement support for a new drone, one simply needs to create a new `DroneAdapter` and implement all the required methods.

All drone interaction must go through `execute(command)` on a concrete implementation.

---

## TelemetryData

### Purpose

`TelemetryData` is the standard return structure for `get_telemetry()` across all adapters.

It provides a minimal, consistent snapshot of drone state. All drone adapters return data of this shape

---

### Fields

#### altitude_m: float
Current altitude in meters.

Default: 0.0

---

#### speed_ms: float
Current speed in meters per second.

Default: 0.0

---

#### battery_pct: float
Battery percentage estimate.

Default: 100.0 (used as sentinel for systems without battery modelling)

---

#### heading_deg: float
Drone heading in degrees.

Default: 0.0

---

#### is_flying: bool
Indicates whether the drone is currently airborne.

Default: False

---

#### source: str
Identifier for the adapter that produced the telemetry data.

Default: "unknown"

---

#### extra: dict
An escape hatch for adapter-specific telemetry values.

- Must not be relied upon by consumers
- Used only when adapter-specific data cannot fit standard fields

Default: empty dict

---

## DroneAdapter (Abstract Base Class)

### Purpose

Defines the required interface for all drone adapters.

Each implementation wraps a specific SDK or simulator and exposes a uniform control API.

The main point of interation is execute(command).
Makes use of the Adapter design pattern used so that callers do not
need to know the gory details of whatever drone sim
or drone sdk they are interacting with.
---

### Lifecycle Flow

1) create the adapter with connection parameterss (localhost, drone ip, etc.)
2) await adapter.connect() for a True
3) Pass commands via await adapter.execute(command)
4) Optionally in another thread, poll telemetry via await adapter.get_telemetry()
5) await adapter.disconnect() at shutdown. This should safely land the drone

---

## Abstract Methods

All subclasses MUST implement the following methods.

---

### connect() -> bool

Establish connection to drone or simulator.

Returns:
- True if successful
- False if connection fails

---

### disconnect() -> None

Releases connection and safely shuts down drone interaction.

Should ensure safe landing if applicable.

---

### takeoff() -> None

Arms drone and ascends to a safe hover altitude.

---

### land() -> None

Safely descends and disarms drone.

Should block further operations until landing completes.

---

### move(direction: CommandType, **kwargs) -> None

Executes a directional movement or rotation.

Parameters:
- direction: CommandType specifying movement type
- kwargs: optional movement modifiers extracted from Command.payload, for fine grained movement.

Planned kwargs:
- distance_m
- speed_ms
- duration_s
- degrees

- currently supports all basic commands from the `Command` class.

---

### hover() -> None

Cancels active movement and maintains position.

Should take priority over normal commands except emergency stop.

---

### emergency_stop() -> None

Immediately overrides all other pending commands and holds current position.

May optionally trigger landing depending on implementation.

---

### get_telemetry() -> TelemetryData

Returns current drone state snapshot.

Should be called frequently for live monitoring.

---

## execute(command: Command)

### Purpose

The only concrete method in this class, a single entry point for all command execution.

Routes a `Command` to the correct adapter method.

---

### Routing Logic

- EMERGENCY_STOP -> emergency_stop()
- TAKEOFF -> takeoff()
- LAND -> land()
- HOVER -> hover()
- Movement and rotation commands -> move()

Supported movement commands (all basic commands defined in `Command`):
- MOVE_UP
- MOVE_DOWN
- MOVE_FORWARD
- MOVE_BACKWARD
- MOVE_LEFT
- MOVE_RIGHT
- ROTATE_CW
- ROTATE_CCW

---

### Notes

- Routing must stay aligned with `CommandType`
- Any new command must be added here
- Current implementation does not yet pass payload into `move()`

---

### Unknown Commands

If a command is not handled:

A warning is logged indicating missing routing configuration in `drone_adapter.py`.