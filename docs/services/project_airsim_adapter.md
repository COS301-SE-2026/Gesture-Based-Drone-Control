# Project AirSim Adapter

## Overview

The ProjectAirSimAdapter is a concrete implementation of DroneAdapter that wraps the Project AirSim (Unreal Engine 5) Python client.

It replaces legacy AirSim by using a modern async-native architecture based on pynng, where all drone operations are real coroutines.

---

## Key Differences vs Legacy AirSim

### Legacy AirSim

- Based on msgpackrpc
- Internally used Tornado IOLoop
- Conflicted with asyncio
- Required unreliable threading workarounds

---

### Project AirSim

- Built on pynng
- Fully async-native
- All methods are awaitable coroutines
- No blocking RPC layer

Examples:
- takeoff_async()
- move_by_velocity_body_frame_async()
- rotate_by_yaw_rate_async()

---

## Coordinate System

Project AirSim uses the same NED system as legacy AirSim:

- +x = North (forward)
- +y = East (right)
- +z = Down

### Body-frame movement

Movement uses body-frame velocity:

- forward/back/left/right are relative to drone orientation
- more intuitive for manual control than world-frame movement

---

## Simulation Configuration

Project AirSim requires a sim_config directory.

This adapter resolves it dynamically:

### Search order

1. vendors/sim_config
2. ProjectAirSim package gym_envs/sim_config

If neither exists, a runtime error is thrown.

---

## Connection Parameters

Project AirSim uses two ports:

- topics_port: pub-sub stream (default 8989)
- services_port: RPC commands (default 8990)

These replace legacy AirSim port 41451.

---

## Configuration Constants

### Movement

- DEFAULT_SPEED_MS = 8.0
- DEFAULT_DURATION_S = 0.5
- GRAVITY_COMP_VZ = -0.3

### Rotation

- DEFAULT_ROTATE_DEG = 15.0
- DEFAULT_YAW_RATE_DPS = 120.0

---

## ProjectAirSimAdapter Class

### Purpose

Wraps Project AirSim Drone API and implements DroneAdapter interface.

Provides full lifecycle control, movement, and telemetry normalisation.

---

## Constructor

### ProjectAirSimAdapter(host, topics_port, services_port, vehicle_name, scene_config, sim_config_path)

#### Parameters

- host: simulator host IP (default 127.0.0.1)
- topics_port: pub-sub port (default 8989)
- services_port: RPC port (default 8990)
- vehicle_name: drone identifier in scene config (default Drone1)
- scene_config: scene JSONC file name
- sim_config_path: optional override for sim_config directory

---

## Connection Lifecycle

### connect() -> bool

Initialises connection to Project AirSim.

Steps:
- Resolves sim_config path
- Creates ProjectAirSimClient
- Connects to simulator
- Creates World instance
- Creates Drone instance
- Enables API control

Returns:
- True on success
- False on failure

---

### disconnect() -> None

Cleanly shuts down the drone connection.

Steps:
- Lands drone
- Waits briefly to avoid async message errors
- Disarms drone
- Disables API control
- Disconnects client

---

## Flight Commands

### takeoff()

- Arms drone
- Calls takeoff_async()
- Requires connection

---

### land()

- Calls land_async()
- Waits until drone confirms landing via telemetry
- Disarms drone

---

### hover()

Stops movement and holds position using hover_async().

---

### emergency_stop()

Immediate safety stop:

- triggers hover_async()
- disarms drone

---

## Movement

### move(direction: CommandType, **kwargs)

Executes movement or rotation.

---

### Parameters

- speed_ms: movement speed (default 8.0)
- duration_s: movement duration (default 0.5)
- degrees: rotation amount

---

### Movement model

Uses body-frame velocity:

- MOVE_FORWARD -> +vx
- MOVE_BACKWARD -> -vx
- MOVE_RIGHT -> +vy
- MOVE_LEFT -> -vy
- MOVE_UP -> -z
- MOVE_DOWN -> +z

Gravity compensation:

- GRAVITY_COMP_VZ applied during horizontal movement

---

### Rotation

Handled separately via _rotate():

- ROTATE_CW
- ROTATE_CCW

Uses yaw rate control over computed duration.

---

## Hover

### hover()

Cancels active movement and stabilises drone position.

---

## Emergency Stop

### emergency_stop()

Safety shutdown:

- hover
- disarm

---

## Telemetry

### get_telemetry() -> TelemetryData

Returns normalised drone state.

---

### Extracted state

From get_ground_truth_kinematics():

- position (x, y, z)
- orientation quaternion
- linear velocity

---

### Computed values

- altitude_m = -z (NED conversion)
- speed_ms = magnitude of velocity vector
- heading_deg = quaternion-derived yaw
- is_flying = altitude > 0.1
- battery_pct = fixed 100

---

### Failure cases

- Returns TelemetryData(source="projectairsim-disconnected") if not connected
- Returns TelemetryData(source="projectairsim-error") on exception

---

## Rotation Helper

### _rotate(direction, degrees)

Rotates drone using yaw rate control.

- CW = positive yaw rate
- CCW = negative yaw rate

Duration = degrees / yaw_rate

---

## Quaternion Utility

### _yaw_from_quaternion_dict(q)

Converts quaternion dictionary into heading in degrees.

Supports:
- {w, x, y, z}
- {w_val, x_val, y_val, z_val}

Returns:
- heading in range [0, 360)

Falls back to 0.0 on error.

---

## Connection Guard

### _assert_connected()

Ensures:

- drone is connected
- client exists

Raises RuntimeError if not.

---

## Summary

This adapter provides:

- Full Project AirSim integration (UE5)
- Async-native control flow
- Body-frame velocity movement
- Quaternion-based telemetry conversion
- Safe connection lifecycle management