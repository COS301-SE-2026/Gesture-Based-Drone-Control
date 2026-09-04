# Service Contracts

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Source of truth</span>
  <span class="tx-status">OpenAPI 3.0.3 · AsyncAPI 3.0</span>
  <span class="tx-status">Drift-checked in CI</span>
</div>

!!! abstract "What this document covers"
    This page documents the **authored API contracts** — the
    machine-readable specifications of the boundary between the React
    dashboard, the FastAPI service layer, and the drone / input adapter
    subsystems. Request–response endpoints are specified in
    **`openapi.yaml`**; the continuous WebSocket streams are specified in
    **`asyncapi.yaml`**. A validator (`validate_contracts.py`) checks that
    both are well-formed and that the REST contract still matches what the
    backend actually serves.

    The contracts live in
    [`packages/api-contracts/`](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/tree/dev/packages/api-contracts).
    For the interactive, try-it-out view of the same REST surface, see the
    [API Reference](../api/API_REFERENCE.md), which runs the live Swagger UI.

---

## 1. Why a Contract at All

FastAPI already generates an OpenAPI document at runtime from the
Pydantic models (served at `/openapi.json`, rendered as Swagger at
`/docs`). So why keep a separate hand-authored contract?

- **A stable, reviewable artefact.** The authored `openapi.yaml` is
  version-controlled and diffable. A change to the API boundary shows up
  as a reviewable change to the contract, not just as a side effect of
  editing a route.
- **A specification, not a reflection.** The generated document mirrors
  whatever the code currently does — including mistakes. The authored
  contract states what the boundary is *meant* to be, and the drift check
  ([§3](#3-the-validator)) flags the moment the two disagree.
- **WebSockets, which Swagger cannot express.** FastAPI's generated
  OpenAPI does not describe WebSocket streams. `asyncapi.yaml` fills that
  gap with a first-class specification of the camera, telemetry,
  calibration and command channels.

---

## 2. The Two Contracts

### 2.1 `openapi.yaml` — REST (OpenAPI 3.0.3)

Specifies every request–response endpoint under the `/api` prefix:
authentication, drone connect/status, gesture recognizer selection,
calibration start/skip/status, input adapter control, and analytics.
Authentication is cookie-based — `POST /api/auth/login` and
`POST /api/auth/signup` issue the session cookies the rest of the surface
relies on.

This is the same REST surface you can exercise interactively through the
[Swagger UI](../api/API_REFERENCE.md); the contract is the static,
reviewable form of it.

### 2.2 `asyncapi.yaml` — WebSocket (AsyncAPI 3.0)

Specifies the continuous streams that OpenAPI cannot: camera frames,
live telemetry, calibration progress, and the live command feed. Each
channel declares its address and messages, and each operation declares
whether the server **sends** or **receives** on it. These are the
endpoints shown in plain text in the Swagger page, because they cannot be
invoked from a request–response UI.

---

## 3. The Validator

`validate_contracts.py` runs three independent checks. Run it with:

```bash
task contracts
```

| # | Check | What it proves | If tooling missing |
| --- | --- | --- | --- |
| 1 | **OpenAPI structure** | `openapi.yaml` is a structurally valid OpenAPI 3.0.3 document | Skips if `openapi-spec-validator` absent |
| 2 | **AsyncAPI structure** | `asyncapi.yaml` parses, declares version 3.x, and every channel, operation and `$ref` is well-formed and resolves | In-process; a `--deep` mode also runs the AsyncAPI CLI when it is installed |
| 3 | **Contract drift** | Every REST operation the backend actually serves is present in the authored `openapi.yaml`, and vice-versa | Skips if the backend cannot be imported |

!!! tip "The drift check is the one that earns its keep"
    Structure checks only confirm the YAML is well-formed. **Drift** is
    what keeps the contract honest — it compares the authored
    `openapi.yaml` against the live schema FastAPI generates from the
    Pydantic models (`app.openapi()`), the very same schema the
    [Swagger UI](../api/API_REFERENCE.md) renders. It fails the moment
    someone adds or removes a route without updating the contract, so the
    published specification can never quietly fall out of step with the
    running service.

### 3.1 Reading the output

Each check prints `PASS`, `FAIL`, or `SKIP` with a one-line detail. A
drift failure lists exactly which operations are out of step:

```
implemented but missing from openapi.yaml:
  - GET /api/drone/telemetry
in openapi.yaml but not implemented:
  - POST /api/drone/calibrate
```

The first group means the code grew a route the contract does not
document; the second means the contract promises something the code does
not serve. Either way, the fix is to bring the two back into agreement.

### 3.2 Flags

- `--deep` — additionally run the AsyncAPI CLI (only if it is already
  installed; the run never pauses to download a toolchain).
- `--strict` — treat any `SKIP` as a failure. Use this in an environment
  where every check is expected to run.

---

## 4. In CI

Contract validation runs as part of the pipeline so a drifting contract
cannot merge unnoticed. Because the **drift** check needs to import the
backend, it only runs meaningfully in an environment where the backend
and its dependencies are installed; structure checks run anywhere.

!!! note "Keeping the contract in step"
    When you add, remove or rename a route, update `openapi.yaml` in the
    same change. Run `task contracts` locally before pushing — the drift
    check will tell you immediately if the contract and the code disagree,
    the same signal CI will give on the pull request.

---

## 5. References

- [`packages/api-contracts/openapi.yaml`](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/blob/dev/packages/api-contracts/openapi.yaml)
  — the REST contract.
- [`packages/api-contracts/asyncapi.yaml`](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/blob/dev/packages/api-contracts/asyncapi.yaml)
  — the WebSocket contract.
- [API Reference](../api/API_REFERENCE.md) — the live, interactive Swagger
  view of the REST surface.
- [`SAS.md`](../SAS.md) — the architecture these contracts sit at the
  boundary of.