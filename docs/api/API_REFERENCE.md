# API Documentation

Documentation related to the API is handled through Swagger docs. These
can be accessed by hosting the project locally and accessing the docs
through the following instructions.

The REST surface shown here is also specified as a static, reviewable
contract — see [Service Contracts](../contracts/CONTRACTS.md) for the
`openapi.yaml` / `asyncapi.yaml` specifications and the validator that
keeps them in step with the running service.

---

## Prerequisites

Ensure you have cloned the repository on your local device and run the
installation using
`task install`

---

## Usage

Start the development server in the project root by running
`task dev`

You will then be able to access the Swagger Docs at
<http://127.0.0.1:3001/docs>.

The raw generated schema is served alongside it at
<http://127.0.0.1:3001/openapi.json> — this is the exact document the
contract drift check compares against.

### Sections

The WebSockets section is displayed in plain text, as these endpoints
cannot be tested in the Web UI. They are specified in full in
[`asyncapi.yaml`](../contracts/CONTRACTS.md#22-asyncapiyaml-websocket-asyncapi-30).

The REST API section is displayed in the standard interactable format of
Swagger Docs. These endpoints can be tested directly in the browser.

---

## Live docs vs. the authored contract

Two views of the same REST surface exist, and they are meant to agree:

- **Swagger (`/docs`)** — generated at runtime from the Pydantic models.
  Interactive, always reflects the code as it is *right now*. Best for
  trying endpoints out.
- **[`openapi.yaml`](../contracts/CONTRACTS.md)** — the hand-authored
  contract. Version-controlled and reviewable, it states what the
  boundary is *meant* to be.

The [contract validator](../contracts/CONTRACTS.md#3-the-validator)
(`task contracts`) checks the two against each other, so the interactive
docs and the published specification cannot silently drift apart.

---