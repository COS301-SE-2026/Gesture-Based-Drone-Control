# Swagger UI

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Hosted — no clone required</span>
  <span class="tx-status">OpenAPI 3.0.3</span>
  <span class="tx-status">Rendered from <code>openapi.yaml</code></span>
</div>

This is the full REST surface of the Gesture-Based Drone Control backend,
rendered here on the published documentation site. It is generated from the
version-controlled contract at
[`packages/api-contracts/openapi.yaml`](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/blob/dev/packages/api-contracts/openapi.yaml),
which CI validates against the running backend on every push — so what you see
below is the same surface the service actually serves.

!!! info "About **Try it out**"
    Browsing, searching, schemas and examples all work here with nothing
    installed. The **Try it out** button issues a real HTTP request against the
    server listed in the dropdown, which is the local development server
    (`http://127.0.0.1:3001`) — executing a request therefore only succeeds if
    you happen to be running the backend yourself. See the
    [API Reference](API_REFERENCE.md) for how to start it.

[:material-download: Download `openapi.yaml`](openapi.yaml){ .md-button #openapi-spec-link }
[:material-transit-connection-variant: WebSocket contract](ASYNCAPI.md){ .md-button }

<div id="swagger-ui" class="tx-api-viewer" data-api-viewer="swagger" data-spec-link="openapi-spec-link"></div>