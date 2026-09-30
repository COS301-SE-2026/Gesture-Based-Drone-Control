# API Reference

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Hosted on this site</span>
  <span class="tx-status">No clone required</span>
  <span class="tx-status">OpenAPI 3.0.3 · AsyncAPI 3.0</span>
</div>

The complete API surface is published here, on this site. Nothing needs to be
installed, cloned or started to read it.

<div class="grid cards" markdown>

-   :material-api:{ .lg .middle } **[REST — Swagger UI](SWAGGER.md)**

    ---

    Every request–response endpoint under `/api`: authentication, drone
    lifecycle, gesture recognition, calibration, input adapters and analytics.
    Full schemas, examples and response codes.

-   :material-transit-connection-variant:{ .lg .middle } **[WebSockets — AsyncAPI](ASYNCAPI.md)**

    ---

    The continuous streams OpenAPI cannot express: camera frames, live
    telemetry, calibration progress and the command feed.

</div>

Both views are rendered from the version-controlled contracts in
[`packages/api-contracts/`](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/tree/dev/packages/api-contracts),
which CI checks against the running backend on every push — see
[Service Contracts](../contracts/CONTRACTS.md). The raw machine-readable
documents are served alongside the pages:

- [`openapi.yaml`](openapi.yaml) — import into Postman, Insomnia or a client generator.
- [`asyncapi.yaml`](asyncapi.yaml) — import into AsyncAPI Studio.

---

## Executing requests

Reading the API needs nothing. **Executing** a request against it does, because
the service is not publicly hosted — the drone control backend talks to a local
simulator and a local camera pipeline, so there is no public instance to point
at, and the contract's server block names the local development server
(`http://127.0.0.1:3001`).

To make Swagger's **Try it out** button live, run the backend yourself:

```bash
task install   # once
task dev
```

The backend then also serves its own runtime-generated Swagger UI at
<http://127.0.0.1:3001/docs>, with the raw generated schema at
<http://127.0.0.1:3001/openapi.json>. That generated document is what the
[contract drift check](../contracts/CONTRACTS.md#3-the-validator) compares the
authored `openapi.yaml` against.

---

## Two views of the same surface

| | [Published contracts](SWAGGER.md) (this site) | Runtime `/docs` (local backend) |
| --- | --- | --- |
| **Source** | Authored `openapi.yaml` / `asyncapi.yaml` | Generated from the Pydantic models at runtime |
| **Availability** | Always, publicly, no setup | Only while the backend is running locally |
| **Covers WebSockets** | Yes, in full | No — listed as plain text only |
| **Try it out works** | Only against your own local backend | Yes |
| **Best for** | Reading, reviewing, client generation | Exercising endpoints while developing |

They are meant to agree, and `task contracts` fails the build if they drift
apart, so the published specification cannot quietly fall out of step with the
running service.