# NFR fixtures

These files are **not** committed as placeholders — generate them from real
landmark captures before Demo 3, then commit the `.npz` files so the suite is
reproducible on any machine and on CI.

```
uv run python tests/nfr/_support/make_fixtures.py --raw data/landmarks_raw.csv
```

| File | Used by | Requirement |
|---|---|---|
| `bench_landmarks.npz` | QR-01, QR-02, QR-09 | Ordered frame stream for timing and fault injection |
| `labelled.npz` | QR-07 | ≥ 300 held-out labelled samples |
| `negatives.npz` | QR-08 | Transitional / no-hand frames that must yield no command |

## Collecting the raw data

Extend `collect_landmarks.py` to write a label column, then capture:

- **≥ 60 frames per gesture** across all six in `VOCABULARY`, from at least
  three different people and two lighting conditions. A dataset captured by one
  person under one lamp will report 99 % accuracy and mean nothing.
- **A negative class.** Record hands moving *between* gestures, hands partly out
  of frame, and an empty frame, all labelled `UNKNOWN`. Without these, NFR3.2 is
  unmeasurable — you cannot count false positives with no negatives.

Keep the capture session out of the training data for the ML recognizer. Scoring
a model on frames it trained on is the single easiest way to fail this section.
