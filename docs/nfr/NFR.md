# NFR Verification

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Evidence-backed</span>
  <span class="tx-status">Services · pytest</span>
  <span class="tx-status">Auto-generated matrix</span>
</div>

!!! abstract "What this document covers"
    This page documents the **non-functional requirement (NFR) test
    suite** — a self-contained set of pytest checks that measure the
    quantified quality requirements from
    [`SRS.md` §3.3](../SRS.md) against the **real** recognizer, mapping
    tables, auth settings, drone adapter and pipeline code.

    Each test writes a machine-generated JSON artefact to
    `docs/nfr/evidence/`, and [`report.py`](#4-regenerating-the-matrix)
    turns those artefacts into the [traceability matrix](#5-traceability-matrix)
    at the bottom of this page. The **Actual** column is never typed by
    hand — it comes straight from a measured run.

---

## 1. Design Principles

The suite is deliberately narrow and cheap so it can run on every CI
job without a camera, a simulator, a FastAPI app or a database.

- **Add-only.** The tests import the real production symbols
  (`RuleBasedRecognizer`, `GestureAdapter`, `TokenService`,
  `DummyDroneAdapter`, `BoundedFrameQueue`, …) but change no existing
  code. They verify behaviour; they do not alter it.
- **Pure Python.** No webcam, no ASGI app, no background tasks — so the
  suite is fast and CI-safe on a headless runner.
- **Evidence over assertion.** Every test emits a JSON artefact with the
  measured value, the target, the machine it ran on and a UTC timestamp.
  The pass/fail in the matrix is derived from that artefact, so the
  document can never drift from the code.

---

## 2. What Each Requirement Covers

The suite maps to five SRS quality-requirement groups. Requirement IDs
(`QR-nn`) are the test-suite's own identifiers; the **SRS** column ties
each back to the quantified requirement in
[`SRS.md` §3.3](../SRS.md).

| Group | Covered by | Focus |
| --- | --- | --- |
| **NFR1 Performance** | `test_latency.py`, `test_realtime_robustness.py` | Recognition latency, bounded-queue back-pressure |
| **NFR2 Security** | `test_security.py`, `test_token_validation.py`, `test_password_security.py` | Token lifetime, token rejection, credential handling |
| **NFR3 Reliability** | `test_accuracy.py`, `test_command_mapping.py`, `test_realtime_robustness.py`, `test_safety.py` | Accuracy, confidence-gated mapping, noise suppression, fail-safe |

### 2.1 Performance

- **QR-03 → NFR1.1** — times single-frame recognition over the committed
  landmark dataset and reports the p95. The SRS bounds the full
  frame-to-dispatch path at 200&nbsp;ms; this isolates the recognition
  stage and holds it to a tighter internal budget, leaving headroom for
  detection and I/O in the end-to-end measurement (deferred to Demo 3).
- **QR-18 → NFR1.2** — pushes 100 frames through `BoundedFrameQueue`
  (size 2) and asserts the queue never exceeds its bound and drops the
  oldest frame under load, rather than blocking or growing without limit.

### 2.2 Security

- **QR-07 → NFR2.1** — reads the real access-token lifetime and asserts
  it is within the 30-minute bound.
- **QR-12 → NFR2.1** — behavioural companion to QR-07: mints tokens with
  `TokenService` and asserts that expired, wrong-signature,
  wrong-audience and wrong-issuer tokens are all rejected, while a
  legitimate token validates. Proves the token is *enforced*, not just
  short-lived.
- **QR-08 / QR-09 / QR-10 → NFR2.2** — credential handling: the bcrypt
  work factor is at or above the configured floor, the password-strength
  policy rejects every weak-password class, and identical passwords hash
  to distinct salted digests.

### 2.3 Reliability

- **QR-01 / QR-02 → NFR3.1** — runs the **ML recognizer** over the
  labelled dataset and reports overall and lowest per-gesture accuracy
  against the 95&nbsp;% target. The rule-based recognizer's accuracy is
  recorded alongside as an informational row (`QR-01-rule`) — see the
  note below.
- **QR-04 / QR-05 / QR-06 → NFR3.2** — every single-hand gesture and
  two-hand combination resolves to the expected command, and the
  confidence gate sits at or above 0.85 (false-positive suppression).
- **QR-19 → NFR3.2** — the `GestureStabilizer` rejects a single spurious
  frame but still switches once a new gesture is held long enough.
- **QR-13 / QR-14 → NFR3.3** — fail-safe: `EMERGENCY_STOP` is always
  elevated to critical priority (and nothing else is), and
  `emergency_stop()` clears the flying state on the adapter.

!!! note "Two recognizers, one gated"
    The system ships two recognizers behind the same interface. The
    **rule-based** recognizer is deterministic and zero-latency but has a
    known accuracy ceiling (~56&nbsp;% on this dataset) — it is not
    expected to meet the 95&nbsp;% target, and that is by design. The
    **ML** recognizer is the engine responsible for accuracy and clears
    the target comfortably (~99&nbsp;%). Accordingly, **QR-01/QR-02 gate
    on the ML recognizer**, while the rule-based number is recorded as an
    informational row (`QR-01-rule`, always `PASS`) so the matrix
    documents the contrast that motivates the ML path. No row in the
    suite fails by design.

---

## 3. Running the Suite

From the repository root:

```bash
task nfr-test
```

That runs the NFR tests and regenerates the matrix. It is also included
in the full `task test` run. To invoke the steps directly:

```bash
uv run pytest tests/nfr -q
uv run python tests/nfr/report.py
```

!!! tip "The suite is a real gate"
    Every row is expected to pass, so `task nfr-test` exits non-zero only
    on a genuine regression — which makes it safe to run as a merge gate
    in CI. The matrix is regenerated on the same run, so a passing build
    always publishes an up-to-date matrix.

---

## 4. Regenerating the Matrix

`tests/nfr/report.py` reads every `docs/nfr/evidence/*.json` artefact and
writes `docs/nfr/MATRIX.md`. The **Actual** column is generated here,
never edited by hand. The table below is that generated file, included
verbatim so this page always reflects the last measured run.

---

## 5. Traceability Matrix

--8<-- "docs/nfr/MATRIX.md"

---

## 6. References

- [`SRS.md` §3.3](../SRS.md) — the quantified quality requirements these
  tests verify.
- [`POLICY.md`](../POLICY.md) — what the tests must achieve.
- [`testing/TESTING.md`](../testing/TESTING.md) — how the wider suite is
  run and structured.
- [`SAS.md`](../SAS.md) — the architectural decisions that realise each
  quality requirement.