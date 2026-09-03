# NFR tests

Self-contained non-functional requirement tests. Each writes a JSON artefact to
`docs/nfr/evidence/`; `report.py` turns those into `docs/nfr/MATRIX.md`.

These tests are **add-only**: they import the real recognizer, mapping tables,
and auth settings, but change no existing code. They run pure Python -- no
camera, no FastAPI app, no background tasks -- so they are fast and CI-safe.

## Run

```
uv run pytest tests/nfr -q
uv run python tests/nfr/report.py
```

## What each covers

| File | Requirements | How |
|------|--------------|-----|
| `test_accuracy.py` | QR-01, QR-02 | Real recognizer over the committed landmark dataset |
| `test_latency.py` | QR-03 | Times single-frame recognition, reports p95 |
| `test_command_mapping.py` | QR-04-06 | Real gesture->command tables and `_resolve` |
| `test_security.py` | QR-07 | Reads the real access-token lifetime |

## Known failure

`test_accuracy.py` fails at ~56% against the 95% target. That is a real defect
in `RuleBasedRecognizer._is_thumb_up` (thumb reads as extended when curled,
shifting finger counts up by one), not a test bug. The evidence JSON and the
confusion breakdown point straight at it. The test goes green when the
recognizer is fixed.