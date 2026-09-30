# WebSocket Reference (AsyncAPI)

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Hosted — no clone required</span>
  <span class="tx-status">AsyncAPI 3.0</span>
  <span class="tx-status">Rendered from <code>asyncapi.yaml</code></span>
</div>

OpenAPI cannot describe a continuous stream, so the WebSocket channels — camera
frames, live telemetry, calibration progress and the command feed — are
specified separately in
[`packages/api-contracts/asyncapi.yaml`](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/blob/dev/packages/api-contracts/asyncapi.yaml)
and rendered below. Each channel declares its address and message payloads, and
each operation declares whether the server **sends** or **receives** on it.

These are the endpoints that appear as plain text in Swagger, because a
request–response UI cannot invoke them.

[:material-download: Download `asyncapi.yaml`](asyncapi.yaml){ .md-button #asyncapi-spec-link }
[:material-api: REST contract](SWAGGER.md){ .md-button }

<div id="asyncapi-ui" class="tx-api-viewer" data-api-viewer="asyncapi" data-spec-link="asyncapi-spec-link"></div>