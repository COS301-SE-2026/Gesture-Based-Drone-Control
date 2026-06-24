# Command System

## Overview

The `Command` dataclass and `CommandType` enum define a standardised communication layer between input adapters (gesture, keyboard, etc.) and drone control adapters (AirSim, etc.).

A command represents an intent that an input system wants to execute. It is intentionally minimal to keep input systems decoupled from drone implementations.

New commands are added by extending the CommandType enum and implementing handling in DroneAdapter.execute() and corresponding concrete adapters.

---

## CommandType Enum

### Purpose

Defines all supported drone actions. Each enum value maps to a single operation in a DroneAdapter implementation.

### Values

- TAKEOFF
- LAND
- MOVE_UP
- MOVE_DOWN
- MOVE_LEFT
- MOVE_RIGHT
- MOVE_FORWARD
- MOVE_BACKWARD
- ROTATE_CW
- ROTATE_CCW
- HOVER
- EMERGENCY_STOP

---

## Priority Constants

These constants define execution priority levels for commands.

- PRIORITY_NORMAL = 1
- PRIORITY_HIGH = 10
- PRIORITY_CRITICAL = 999

Higher values indicate higher priority.

---

## Command Dataclass

### Purpose

Represents a single immutable command to be executed by the drone control pipeline.

---

### Fields

#### type: CommandType

Required. Specifies the action to perform.

---

#### payload: dict[str, Any]

Optional dictionary of parameters that modify command behaviour.

Supported keys:
- distance_m: movement distance
- speed_ms: movement speed in metres per second
- duration_s: duration of movement execution
- degrees: rotation amount in degrees

---

#### priority: int

Execution priority of the command.

- Higher value means higher priority
- Default: PRIORITY_NORMAL
- Automatically set to PRIORITY_CRITICAL for EMERGENCY_STOP commands

---

#### source: str

Identifier for the input system that created the command.

Used primarily for logging and debugging.

Default: "unknown"

---

## Behaviour

### Emergency Stop Priority Override

If the command type is EMERGENCY_STOP, the priority is automatically set to:

- PRIORITY_CRITICAL

This is enforced in __post_init__.

---

## Methods

### __post_init__()

Automatically adjusts priority for emergency stop commands.

---

### __repr__()

Returns a compact string representation of the command. Used for non-verbose logging.

Only includes:
- type
- payload (if present)
- priority (if not default)
- source (if not default)

Example output:

Command(type=MOVE_FORWARD, payload={'speed_ms': 2.0}, source='gesture')

---

## Example Usage

### Basic Takeoff
```
Command(type=CommandType.TAKEOFF, source="keyboard")
```
---

### Move forward for 3m at a custom speed
```
Command(
    type=CommandType.MOVE_FORWARD,
    payload={"distance_m": 3.0, "speed_ms": 1.5},
    source="gesture",
)
```
---

### Emergency Stop

```
cmd = Command(type=CommandType.EMERGENCY_STOP, source="keyboard")
assert cmd.priority == PRIORITY_CRITICAL
```