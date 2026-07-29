# Testing Manual

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Operational manual</span>
  <span class="tx-status">Backend / Services · pytest</span>
  <span class="tx-status">Frontend · Playwright</span>
</div>

!!! abstract "What this document covers"
    This is the **operational manual** for the GBDCS test suite —
    where the tests live, how to run them, and the patterns the team
    has settled on for writing new ones. It is the *how* counterpart
    to [`POLICY.md`](POLICY.md), which is the *what* and *why*.

    If you are wondering whether something *needs* a test, that's a
    POLICY question. If you are writing a test and want to know what
    it should look like, this is the document.

---

## 1. Where the Tests Live

The repository keeps tests next to the code they exercise, mirroring
the source layout under a `tests/` folder per sub-codebase.

```
apps/backend/tests/          # backend API, calibration, streaming, auth routes
services/tests/              # adapters, auth services, CV pipeline, database 
apps/frontend/tests/
├── unitTesting/             # Playwright component/page specs (*.spec.ts)
└── end_to_end/              # Playwright E2E journeys (auth, gestures)
tests/integration/           # cross-boundary pytest suites (auth, db manager, calibration/gestures)
```

### 1.1 Naming and discovery

| Codebase | File pattern | Discovery |
| --- | --- | --- |
| services / tests (unit tests) | `test_*.py` | pytest, no manual registration |
|  / tests (integration) | `test_*.py` | pytest, no manual registration |
| Frontend unit | `*.spec.ts` under `tests/unitTesting/` | Playwright discovers via `playwright.unit.config.ts` |
| Frontend E2E | specs under `tests/end_to_end/` | Playwright discovers via `playwright.e2e.config.ts` (must be single worker) |

A test that crosses one module boundary with the rest real belongs in `tests/integration/`, not inside a module's own test folder.

### 1.2 Pairing tests with reference docs

Most production modules have a companion reference doc under
`docs/services/` or `docs/frontend/`. Check the matching doc before writing a test; it usually states the contract you're verifying. Examples: the adapter tests in `services/tests/adapter_testing/` map to the `services/*_adapter.md` docs, and the component specs (`atoms.spec.ts`, `molecules.spec.ts`) map to `frontend/atoms.md` and `frontend/molecules.md`.

---

## 2. Running Tests Locally

Install the repo first, and make sure your `.env` has the ports set:

```bash
task install 
```

### 2.1 Backend (Python · pytest)

```bash
# pytest with coverage
task backend-unit-test
```
This runs pytest over `apps/backend/tests` and `services/tests` with coverage, writes `apps/backend/coverage.xml`, and **fails if line coverage drops below 80%**. The same command and gates run in CI.

What `task backend-unit-test` runs:

```bash
uv run pytest apps/backend/tests services/tests --cov=apps/backend/src --cov=services  --cov-report=xml:apps/backend/coverage.xml --cov-report=term-missing
```

### 2.2 Frontend (TypeScript · Playwright)

```bash
cd apps/frontend
yarn unit-test                        # component/page specs, playwright.unit.config.ts
yarn ue2e-test                        # E2E journeys, playwright.e2e.config.ts
```

Or from the repo root: `task frontend-unit-test` and `task e2e-test`.
E2E runs with a single worker to avoid port contention. In CI the browser binaries are cached; see [`CICD.md`](CICD.md).

### 2.3 Integration (Python · Pytest)
```bash
task integration-test
```
Runs all integration tests found at tests/ *and* displays 
to the terminal.

### 2.4 Running one file or one test

=== "Just one file"

    ```bash
    # Python
    uv run pytest tests/cv_pipeline_testing/test_rule_based.py -v

    # Playwright
    yarn test analytics.spec.ts
    ```

=== "Just one test"

    ```bash
    # Python — by name substring
    uv run pytest -k "test_emergency_stop"

    # Playwright — by title substring
    yarn test --grep "gesture detection heading"
    ```

=== "With debug output"

    ```bash
    # Python — show prints, log INFO+
    uv run pytest -v -s --log-cli-level=INFO

    # Playwright — headed mode + Playwright Inspector
    yarn test --headed --debug
    ```

### 2.5 Autofix lint while writing tests

```bash
task fix   # uv run ruff check --fix . && uv run ruff format .
```
Python is corrected via the ruff linter using its `format` and `check --fix` options
Typescript is corrected via EsLint and Prettier using `eslint .` and `prettier --check src/`

## 2.6 Everything at once

```bash
task test       # backend unit -> frontend unit -> integration -> e2e
```

---

## 3. Conventions the Team Has Settled On

These are patterns extracted from the existing suite. Stick to them
when you add a new test so the suite stays consistent.

### 3.1 Module layout

Every Python test file follows the same top-to-bottom shape.

A generic example template:

```python
# 1. Stdlib / third-party imports
import asyncio
import pytest

# 2. (If needed) sys.modules patching for in-function imports

# 3. (If needed) sys.path manipulation for cv_pipeline tests

# 4. Local imports
from services.commands.command import Command, CommandType

# 5. Helpers / factories
def make_blank_frame(): ...

# 6. Test classes / functions
class TestConstruction:
    def test_default_maxsize(self): ...
```

### 3.2 Pre-mocking heavy or unstable imports

Two libraries — **mediapipe** and **airsim** — are heavy or unstable
to import in a test environment. The team's convention is to replace
them in `sys.modules` *before* the code under test gets to its own
`import` statement.

test file snippet example from the repo:

```python
# MediaPipe: whole-module mock at the top of the file
import sys
from unittest.mock import MagicMock
 
sys.modules['mediapipe'] = MagicMock()
 
from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionPipeline
```
 
```python
# airsim: per-test, because the adapter lazy-imports it inside connect()
async def test_connect_success():
	adapter = AirSimAdapter()
	with patch.dict('sys.modules', {'airsim': MagicMock()}):
		result = await adapter.connect()
	assert result is True
```

### 3.3 Class-based grouping

Group related assertions with `class Test*` containers, one class per behaviour, one method per case. A flat function is fine for one-offs.

### 3.4 Helper factories

When the same setup recurs across many tests, define a top-level
helper rather than a fixture. The team's convention:

```python
def test_one_finger_index_only(self):
	hand = make_hand(index_up=True)
	result = recognizer.interpret_gesture(hand)
	assert result.gesture == Gesture.ONE_FINGER
```
 
Factories already in the suite include `make_hand(...)`,
`make_blank_frame(w, h)`, `make_feed(config)`,
`make_connected_adapter()` and `make_mock_handedness(label, score)`.

## Async tests

`pyproject.toml` sets `async_mode = "auto"`, so any `async def test_...` runs as an asyncio test without a marker. The team still adds `@pytest.mark.asyncio` explicity so a reviewer can see the async intent at a glance.

### 3.6 `AsyncMock` for drone-side methods

When code under tests await an adapter method, replace it with `AsyncMock` and assert with `assert_awaiting_once`. When the argument matters:

```python
drone.move.assert_awaited_once()
args = drone.move.await_args.args
assert args[0] == CommandType.MOVE_FORWARD
```

### 3.7 `caplog` for log-driven side effects

Some code paths *log* rather than *return* (e.g. unrecognised
commands, missing handlers). Verify them with pytest's `caplog`, and set the level explicitly if you need DEBUG or INFO; the default threshold is WARNING.

### 3.8 Bridging sync handlers and async drone methods

`InputAdapter._emit` is **synchronous** but the drone-side methods
are **asynchronous**. The bridge:

```python
adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))
adapter.handle_message({'key': 't', 'event': 'keydown'})
await asyncio.sleep(0.01)   # let the scheduled task drain
drone.takeoff.assert_awaited_once()
```

The 10 ms sleep is enough for the loop to run the task once. 

### 3.9 `conftest.py` — path shim only, no shared fixtures

`apps/backend/tests/conftest.py` is path shim that puts the repo root on `sys.path` so backend tests can import `services/`. The integration suites (`tests/integration/auth_testing/`, `tests/integration/db_manager_tests/`, `tests/integration/gestures/`) and the db manager model tests carry their own `conftest.py` with suite-local fixtures. Keep fixtures local to the suite that uses them; promote to shared conftest only once the same fake shows up in three or more files.

### 3.10 Backend — FastAPI `TestClient` + WebSocket

API tests mount router on a fresh app instance so they dont depend on production startup wiring. Keep status-code and body assertions in seperate tests so a failure tells you exactly which contract broke. WebSocket endpoints use the `websocket_connect` context manager.

Patch at the **import location**, not the definition location. If an `AsyncMock` is never awaited, this is almost always the mistake.

Mock payloads and expected-shape constants live at the top of the file in `UPPER_SNAKE_CASE`.

### 3.11 Playwirght specs

one `test.describe` per page with a `beforeEach` that navigates. Case-insensitive regex matchers so copy tweaks dont break tests. `waitForLoadState('domcontentloaded)`, never a sleep. `.first()` when text appears more than once.

---

## 4. Writing a New Test - Checklist

- [ ] File named `test_<unit>.py` (Python) or `<area>.spec.ts` (frontend), in the right directory.
- [ ] Imports follow `sys.modules` mutations above local imports
- [ ] Right bucket: unit isolates one thing, integration crosses a boundary with one real side, E2E has the user as input.
- [ ] One assertion focus per test.
- [ ] Names describe behaviour, not implementation.
- [ ] Reused an existing factory, or added one if the setup recurs.
- [ ] Mocked at the import site.
- [ ] Ran `task fix` before pushing.
- [ ] Coverage on the touched module still >= 80% in local output.
- [ ] CI green before pushing.

---

## 5. Debugging a Failing Test

| What | How |
| --- | --- |
| See what the test was doing | `pytest -v -s`, add `--log-cli-level=INFO` for log lines. |
| See what a mock was called with | `print(mock.mock_calls)` or `print(mock.await_args)`. |
| Pause inside a Python test | `breakpoint()`. |
| Pause inside a Playwright test | `await page.pause()` opens the Inspector. |
| Headed Playwright run | `yarn unit-test <file> --headed --debug`. |
| Import errors | Diff your file against a working test in the same folder |
| Passes locally, fails in CI | See [`CICD.md` §7](CICD.md#7-troubleshooting). Usually a missing dependency or local-only env var. E2E in CI also needs `GBDC_E2E_NO_CAMERA=1`. |

---

## 6.Known Limitations

The hardware the team works with is based strictly for work and running drone sim and the frontend application at the same time is very computationally expensive on our laptops, a goal for demo 3 is optmising to reduce latency further, increase FPS and reduce lag. 

---

## 9. References

- [`POLICY.md`](POLICY.md) — what the tests must achieve.
- [`CICD.md`](CICD.md) — how CI runs them.
- [`GIT.md`](GIT.md) — how a PR gets through the gates.
- [`CODING.md`](CODING.md) — the conventions the production code
  follows, which the tests verify.
- Per-module reference docs: under `docs/services/` and `docs/frontend/`.
- [pytest docs](https://docs.pytest.org/) — particularly
  `caplog`, `monkeypatch`, and `pytest-asyncio`.
- [Playwright docs](https://playwright.dev/docs/intro) —
  particularly locators, `expect`, and the Inspector.