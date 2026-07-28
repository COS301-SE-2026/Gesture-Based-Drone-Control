# InputAdapter

## Overview

The InputAdapter is an abstract base class that standardises how all input sources are integrated into the system.

It acts as a translation layer between raw input signals and the internal Command model.

---

## Responsibility Scope

The InputAdapter is responsible only for:

- receiving raw input
- converting input into Command objects
- emitting commands to a registered handler

It is explicitly NOT responsible for:

- drone control logic
- simulator interaction
- command execution
- routing decisions

---

## Design Goals

This abstraction ensures:

- new input sources can be added without modifying core system logic
- input systems can be tested independently
- input sources can be swapped dynamically at runtime

---

## Adding a New Input Source

To implement a new input adapter:

1. Create a new file in:
   services/input/sources

2. Subclass InputAdapter

3. Implement required abstract methods

4. Register the adapter in:
   services/input/sources/__init__.py

---

## InputAdapter Class

### Class Definition

Abstract base class for all input adapters.

Each subclass represents a single input channel.

---

## Internal State

### _handler

Type:

Callable[[Command], None] | None

Purpose:

Stores the function that receives emitted commands.

Initial state:

- None until set_handler() is called

---

## Public API

### set_handler(handler: Callable[[Command], None]) -> None

Registers the callback that receives generated commands.

#### Parameters

- handler:
  Callable that accepts a Command object

This is typically:

- DroneAdapter.execute()
- or a higher-level dispatcher function

#### Notes

- Can accept coroutine functions, but execution scheduling must be handled by subclass if needed
- Must be set before start() is called for normal operation

---

## Abstract Methods

### start() -> None

Begins listening for input events.

Requirements:

- must not block execution
- must run asynchronously or in background context
- called once at application startup

Typical implementations:

- keyboard event listeners
- gesture recognition loops
- HTTP/WebSocket input streams

---

## Protected API

### _emit(command: Command) -> None

Dispatches a constructed Command to the registered handler.

#### Parameters

- command:
  Fully constructed Command instance

---

## Behaviour

If no handler is registered:

- logs warning
- drops the command silently

If handler exists:

- logs debug message
- forwards command to handler

---

## Execution Flow

1. raw input received
2. subclass maps input -> Command
3. _emit(command) called
4. handler processes command (usually DroneAdapter.execute)

---

## Notes

- This class is intentionally decoupled from execution systems
- It enforces a strict one-way flow: input -> command -> handler