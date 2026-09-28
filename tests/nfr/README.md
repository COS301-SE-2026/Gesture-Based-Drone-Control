# NFR tests

Non-functional requirement tests. Each writes a JSON artefact to
`docs/nfr/evidence/` (plus raw samples in `evidence/raw/`); `report.py` turns
those into `docs/nfr/MATRIX.md`, the evidence page `docs/nfr/EVIDENCE.md` and
the charts in `evidence/charts/`. The full write-up is `docs/nfr/NFR.md`.

These tests are **add-only**: they import and run the real recognizers,
pipeline, broadcast, adapters, backend app and database, and change no product
code. The only stand-ins are the ones a CI runner cannot provide (webcam, a
real hand, a drone); see `_perf.py` and NFR.md section 4.

## Run

```
task nfr-test          # backend + frontend, then the report
task nfr-backend       # this folder only
task nfr-soak          # the 10-minute runs (marked slow)
task nfr-report        # rebuild the pages from recorded evidence
```

Or directly: `uv run --with radon pytest tests/nfr -q -m "not slow"` then
`uv run python tests/nfr/report.py`. The browser half lives in
`apps/frontend/tests/nfr/` (`yarn nfr-test`).

## What each file covers

| File | Requirements | How |
|------|--------------|-----|
| `test_latency.py` | QR-03, QR-25, QR-27, QR-28 | Stage latency budget: recognition (rule + ML), serialization, dispatch |
| `test_realtime_performance.py` | QR-26, QR-29 to QR-34 | Full live system at 30 fps (and 90 fps for capacity): end-to-end and gesture-onset latency, CPU, dropped frames, 10 clients + 1 stalled |
| `test_backend_performance.py` | QR-35 to QR-40 | Real FastAPI app: REST under load, telemetry and command WebSockets, login, database |
| `test_resources.py` | QR-41, QR-42 | Backend cold start, first gesture frame, memory growth |
| `test_soak.py` | QR-43 | 10-minute steady state (`slow`) |
| `test_usability.py` | QR-44 to QR-49 | KLM time to first flight, usability-study scoring, error-message audit, input parity, history feedback |
| `test_accuracy.py` | QR-01, QR-02 | Real recognizer over the committed landmark dataset |
| `test_command_mapping.py` | QR-04 to QR-06 | Real gesture->command tables and `_resolve` |
| `test_realtime_robustness.py` | QR-18, QR-19 | Bounded queue, stabilizer noise rejection |
| `test_safety.py` | QR-13, QR-14 | Emergency-stop priority and grounding |
| `test_security.py`, `test_token_validation.py`, `test_password_security.py` | QR-07 to QR-10, QR-12 | Tokens and credentials |
| `test_maintainabiility.py` | QR-20 to QR-22 | Adapter interfaces, complexity (needs `radon`; the task pulls it in) |
| `test_availability.py` | QR-23, QR-24 | Health probes |

Helpers: `_helpers.py` (emit, stats, raw samples), `_perf.py` (paced video
camera, scripted landmarks, CPU meter), `conftest.py` (throwaway database,
import paths).

## IDs

QR-14 and QR-18 used to be written by two tests each, so one overwrote the
other's evidence. Maintainability now uses QR-20 to QR-22 and availability
QR-23/QR-24, matching NFR.md.

## Pending rows

QR-45 and QR-46 need the usability study (`docs/nfr/usability/PROTOCOL.md`).
Until `docs/nfr/usability/sessions.csv` has five external participants they
are skipped and reported as PENDING. Never put placeholder rows in that file.
