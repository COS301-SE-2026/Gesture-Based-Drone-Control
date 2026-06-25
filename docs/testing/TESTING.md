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
apps/backend/tests/

services/tests/

apps/frontend/tests/

tests/
```

### 1.1 Naming and discovery

| Codebase | File pattern | Discovery |
| --- | --- | --- |
| Backend / services | `test_*.py` | pytest discovers on import — no manual registration |
| Frontend | `*.spec.ts` | Playwright discovers via `playwright.config.ts` |

Tests are colocated with the *codebase* they exercise, not the file.
A pipeline test exercising multiple modules sits at the top of
`services/tests/` rather than tucked inside one module's folder.

### 1.2 Pairing tests with reference docs

Most production modules have a companion reference doc under
`docs/services/` or `docs/frontend/`. When you write a test, check
the matching doc — it usually states the contract you are verifying.

| Test file | Subject under test | Reference doc |
| --- | --- | --- |
| `test_api.py` | Backend REST + WS routes | (this document, §3.11) |
| `test_command.py` | `Command` dataclass | [`services/command.md`](services/command.md) |
| `test_input_adapter_abc.py` | `InputAdapter` ABC | [`services/input_adapter.md`](services/input_adapter.md) |
| `test_keyboard_adapter.py` | `KeyboardAdapter` | [`services/keyboard_adapter.md`](services/keyboard_adapter.md) |
| `test_dummy_input_adapter.py` | `DummyInputAdapter` | [`services/dummy_input_adapter.md`](services/dummy_input_adapter.md) |
| `test_airsim_adapter.py` | `AirSimAdapter` (legacy) | [`services/airsim_adapter.md`](services/airsim_adapter.md) |
| `test_project_airsim_adapter.py` | `ProjectAirSimAdapter` (UE5) | [`services/project_airsim_adapter.md`](services/project_airsim_adapter.md) |
| `test_keyboard_to_dummy_drone.py` | Cross-adapter integration | [`services/drone_adapter.md`](services/drone_adapter.md) + [`services/dummy_drone_adapter.md`](services/dummy_drone_adapter.md) |
| `atoms.spec.ts` | Atom components (`Button`, `Card`, `NavItem`, `StatusDot`, `Toggle`, etc.) | [`frontend/atoms.md`](frontend/atoms.md) |
| `molecules.spec.ts` | Molecule components (`DroneInfoCard`, `Compass`, `GestureCalibration`, etc.) | [`frontend/molecules.md`](frontend/molecules.md) |
| `dashboard.spec.ts` / `gestures.spec.ts` / `analytics.spec.ts` | Page organisms | [`frontend/organisms.md`](frontend/organisms.md) + [`frontend/routing.md`](frontend/routing.md) |

---

## 2. Running Tests Locally
In order to run tests locally the repository needs to be correctly cloned and installed with 

```bash
task install 
```
An env also needs to be created with the appropriate ports

### 2.1 Backend (Python · pytest)

```bash
# pytest with coverage
task backend-unit-test
```
generates an xml coverage report at apps/backend/coverage.xml

What `task backend-unit-test` runs:

```bash
uv run pytest apps/backend/tests services/tests --cov=apps/backend/src --cov=services  --cov-report=xml:apps/backend/coverage.xml --cov-report=term-missing
```

Two things to notice:

- Coverage is reported to the terminal *and* written to `coverage.xml`
  for the CI coverage gate ([`POLICY.md` §5](POLICY.md#5-acceptance-criteria)).

### 2.2 Frontend (TypeScript · Playwright)

```bash
cd apps/frontend
yarn test                        # playwright test
```

`yarn test` runs the full Playwright suite headlessly. In CI the
browser binaries are cached - see [`CICD.md` §3.1](CICD.md#31-playwright-browser-caching).

### 2.3 Integration (Python · Pytest)
```bash
task integration-test
```
`task integration-test` runs all integration tests found at tests/ *and* writes 
to `coverage.xml` for the CI coverage gate ([`POLICY.md` §5](POLICY.md#5-acceptance-criteria)).

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

---

## 3. Conventions the Team Has Settled On

These are patterns extracted from the existing suite. Stick to them
when you add a new test so the suite stays consistent.

### 3.1 Module layout

Every Python test file follows the same top-to-bottom shape:

```python
# 1. Stdlib / third-party imports
import asyncio
import pytest

# 2. (If needed) sys.modules patching for in-function imports
#    — see §3.3

# 3. (If needed) sys.path manipulation for cv_pipeline tests
#    — see §3.2

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

=== "MediaPipe (whole-module mock at top of test file)"

    Used in `test_mediapipe_detector.py`, `test_pipeline.py`, etc.

    ```python
    import sys
    from unittest.mock import MagicMock

    # Mock mediapipe BEFORE importing anything that pulls it in
    _mock_mp = MagicMock()
    sys.modules['mediapipe'] = _mock_mp

    # Now safe to import
    from cv_pipeline.hand_detection.mediapipe_detector import HandDetectionPipeline
    ```

=== "AirSim (per-test, via patch.dict)"

    Used in `test_airsim_adapter.py` because airsim is imported
    *inside* the adapter's connect method (a deliberate lazy import).

    ```python
    @pytest.mark.asyncio
    async def test_connect_success():
        adapter = AirSimAdapter()

        with patch.dict('sys.modules', {'airsim': MagicMock()}):
            result = await adapter.connect()

        assert result is True
    ```

### 3.3 Class-based grouping

Pytest auto-discovers `class Test*` containers without needing
`unittest.TestCase`. The team uses these to group related
assertions — one class per behaviour, one method per case.

```python
class TestConstruction:
    def test_default_maxsize(self):
        q = BoundedFrameQueue[int]()
        assert q.maxsize == 2

    def test_zero_maxsize_rejected(self):
        with pytest.raises(ValueError, match='maxsize must be >= 1'):
            BoundedFrameQueue[int](maxsize=0)


class TestDropCount:
    def test_drop_count_starts_at_zero(self):
        ...
```

Use a class when you have more than two related tests; a flat
function is fine for one-off cases.

### 3.4 Helper factories

When the same setup recurs across many tests, define a top-level
helper rather than a fixture. The team's convention:

```python
def make_hand(
    thumb_up: bool = False,
    index_up: bool = False,
    middle_up: bool = False,
    ring_up: bool = False,
    pinky_up: bool = False,
    handedness: Handedness = Handedness.RIGHT,
    confidence: float = 0.95,
) -> DetectedHand:
    """Build a DetectedHand with landmark positions for the desired
    finger states."""
    landmarks = [HandLandmark(x=0.5, y=0.5, z=0.0) for _ in range(NUM_LANDMARKS)]
    # … set up landmarks per kwargs …
    return DetectedHand(handedness=handedness, landmarks=landmarks, confidence=confidence)
```

The factory's keyword arguments name *what about this hand matters*.
A test reads cleanly without re-explaining landmark indices:

```python
def test_one_finger_index_only(self):
    hand = make_hand(index_up=True)
    result = recognizer.interpret_gesture(hand)
    assert result.gesture == Gesture.ONE_FINGER
```

Other factories already in the suite:

- `make_blank_frame(w, h)` — `test_camera_feed.py`
- `make_feed(config)` — `test_camera_feed.py`
- `make_connected_adapter()` returning `(adapter, mock_drone, mock_client)` — `test_project_airsim_adapter.py`
- `make_mock_handedness(label, score)` — `test_mediapipe_detector.py`

### 3.5 Async tests

Both `pyproject.toml` files set `asyncio_mode = "auto"`, so any
`async def test_…` is treated as an asyncio test automatically — no
`@pytest.mark.asyncio` decoration required *unless* you also want
the marker explicit for readers.

The team has been adding the marker explicitly even though the auto
mode would pick the test up either way:

```python
@pytest.mark.asyncio
async def test_connect_success():
    adapter = AirSimAdapter()
    with patch.dict('sys.modules', {'airsim': MagicMock()}):
        result = await adapter.connect()
    assert result is True
```

Keep this explicit-marker style for new tests — it makes the async
intent obvious to a reviewer scanning the file.

### 3.6 `AsyncMock` for drone-side methods

When testing code that *awaits* a drone adapter method, replace the
method with `AsyncMock` and assert against `assert_awaited_once`:

```python
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_keyboard_takeoff_to_dummy_drone():
    drone = DummyDroneAdapter()
    await drone.connect()

    drone.takeoff = AsyncMock()       # replace the real method

    # … fire the keyboard event …

    drone.takeoff.assert_awaited_once()
```

For movement commands where the *argument* matters too:

```python
drone.move.assert_awaited_once()
args = drone.move.await_args.args
assert args[0] == CommandType.MOVE_FORWARD
```

The decorator form (`@patch(..., new_callable=AsyncMock)`) is also
used at the backend boundary — see §3.11.

### 3.7 `caplog` for log-driven side effects

Some code paths *log* rather than *return* (e.g. unrecognised
commands, missing handlers). Verify them with pytest's `caplog`:

```python
def test_emit_without_handler_logs_warning(caplog):
    adapter = ConcreteInputAdapter()
    adapter._emit(Command(type=CommandType.TAKEOFF))
    assert 'no handler' in caplog.text.lower()


@pytest.mark.asyncio
async def test_keyboard_adapter_start_noop(caplog):
    adapter = KeyboardAdapter()
    caplog.set_level(logging.INFO)
    await adapter.start()
    assert 'ready' in caplog.text.lower()
```

Set the level explicitly if you need DEBUG / INFO; the default
threshold is WARNING.

### 3.8 Bridging sync handlers and async drone methods

`InputAdapter._emit` is **synchronous** but the drone-side methods
are **asynchronous**. The team has converged on this bridge pattern
when wiring an input source to a drone in tests:

```python
import asyncio

async def handler(cmd):
    await drone.execute(cmd)

# sync wrapper because _emit() is synchronous
adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

adapter.handle_message({'key': 't', 'event': 'keydown'})

# Let the scheduled task drain before we assert
await asyncio.sleep(0.01)

drone.takeoff.assert_awaited_once()
```

The 10 ms sleep is empirical — long enough for the event loop to
run the task once, short enough not to slow the suite. Don't make
it longer "just to be safe".

### 3.9 `conftest.py` — path shim only, no shared fixtures

There is exactly one `conftest.py` in the suite — at
`apps/backend/tests/conftest.py`:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
```

Its only job is to put the repo root on `sys.path` so backend tests
can import from `services/` (which sits beside `apps/`, not inside
it). It registers **no fixtures**.

The deliberate absence of shared fixtures is the team's current
position:

- Test files are small (most ≤ 300 lines), so the inline setup is
  visible at a glance — no jumping to a separate file.
- Each test file owns its own fakes (`_FakeCamera`, `FakeClient`,
  `ConcreteInputAdapter`), which keeps the contract between the
  test and its subject explicit.
- The helper factories in §3.5 are module-local, so they already
  serve the role a fixture would for now.

This may be revisited at the Demo 2 retrospective. If the same fake
starts appearing in three or more files, it is a candidate for
promotion to a shared fixture. The likely first three:

1. `DummyDroneAdapter` setup (currently inlined into every adapter
   integration test).
2. A blank `CapturedFrame` factory.
3. `make_connected_adapter()` for ProjectAirSim.

### 3.10 Backend — FastAPI `TestClient` + WebSocket

`test_api.py` exercises the backend over the wire using FastAPI's
`TestClient`. This is its own pattern, distinct from the
adapter-level tests in §3.7.

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)
```

The router is mounted on a *fresh* app instance so the test doesn't
depend on the production-app startup wiring.

#### 3.10.1 REST endpoints

```python
def test_health_returns_200():
    response = client.get('/health')
    assert response.status_code == 200


def test_health_returns_ok():
    response = client.get('/health')
    assert response.json() == {'status': 'ok'}
```

Two short tests — one for the status code, one for the body. The
team's convention: don't bundle status-code + body assertions in a
single test, so when one fails you know exactly which contract
broke.

#### 3.10.2 WebSocket endpoints

WebSocket tests use the `websocket_connect` context manager:

```python
@patch('app.api.api.get_drone_telemetry', new_callable=AsyncMock)
def test_drone_telemetry_sends_correct_json(mock_get):
    mock_get.return_value = MOCK_DRONE_TELEMETRY
    with client.websocket_connect('/drone/telemetry') as ws:
        data = ws.receive_json()
    assert data == MOCK_DRONE_TELEMETRY
```

Two things to notice:

- The async telemetry getter is patched at its **import location**
  (`app.api.api.get_drone_telemetry`), not its definition location.
- `new_callable=AsyncMock` is the decorator-form equivalent of the
  inline `AsyncMock()` in §3.7.

#### 3.11.3 Mock payload constants at module top

Mock telemetry and expected-shape constants live at the top of the
file, named in `UPPER_SNAKE_CASE`:

```python
MOCK_DRONE_TELEMETRY = {
    'battery': 100,
    'altitude': 20,
    'heading': 180,
    'speed': 12.3,
    'mode': 'GUIDED',
}

EXPECTED_KEYS = {'flight_id', 'time', 'max_altitude', 'average_speed'}
FLIGHT_IDS = list(range(1, 9))
```

These are *contracts* the backend is currently being held to — the
backend still serves canned data for some endpoints (the
flight-summary endpoints in particular), and the tests pin that
canned contract so any future change is explicit. See §8 for the
honest discussion of where this is appropriate vs. provisional.

---

## 4. Fakes &amp; Test Data

The test suite uses three kinds of stand-ins. Knowing which one to
reach for is half the battle when writing a new test.

### 4.1 `DummyDroneAdapter` — the canonical drone fake

`DummyDroneAdapter` is the team's reference fake for any test that
needs *a* drone but doesn't care which one. It implements the
`DroneAdapter` interface and is the only adapter that runs in CI —
AirSim and the physical Tello are not available there.

Use it whenever the test is about the *integration surface* (the
keyboard → command path; the pipeline → adapter handshake) and not
about a specific SDK's behaviour:

```python
from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter

@pytest.mark.asyncio
async def test_keyboard_to_dummy_drone():
    drone = DummyDroneAdapter()
    await drone.connect()

    drone.takeoff = AsyncMock()   # spy on the call
    # …
```

#### 4.1.1 Quirks worth knowing

The DummyDroneAdapter has three intentional quirks documented in
[`services/dummy_drone_adapter.md`](services/dummy_drone_adapter.md):

- **`battery_pct = 300.0`** in its fixed telemetry — an intentionally
  invalid value, used by edge-case tests to verify that callers
  validate range rather than trust the value.
- **`hover()` is a no-op.** Any test of the *hover-on-idle* failsafe
  (`R6.1.1`) using DummyDroneAdapter will assert that `hover` was
  *called*, not that anything happened. For end-to-end safety-layer
  verification, ProjectAirSim or a real drone is required.
- **`emergency_stop()` is a no-op.** Same caveat as `hover()`. Tests
  using `AsyncMock` on `emergency_stop` (as in
  `test_keyboard_to_dummy_drone.py`) are exercising the *routing*
  through `execute(Command(EMERGENCY_STOP))`, not the safety
  behaviour itself.

These limitations are appropriate for unit and integration tests of
the *plumbing*. They make DummyDroneAdapter unsuitable for testing
the failsafe behaviours themselves — that's a job for the manual
exploratory testing pass in [`POLICY.md` §3.6](POLICY.md#36-manual-exploratory-testing).

### 4.2 `MagicMock` / `AsyncMock` — for SDK boundaries

When the test *is* about a specific adapter (AirSim, ProjectAirSim,
Tello once it lands), the SDK itself is mocked. Four flavours in use:

| Use | Class | Example test |
| --- | --- | --- |
| Replace a whole SDK module before import | `MagicMock` + `sys.modules` | `test_mediapipe_detector.py` |
| Replace the SDK at the call site | `MagicMock` + `patch.dict('sys.modules', …)` | `test_airsim_adapter.py` |
| Replace one async method on a real object (inline) | `AsyncMock` | `test_keyboard_to_dummy_drone.py` |
| Replace one async method on a real object (decorator) | `@patch(..., new_callable=AsyncMock)` | `test_api.py` |
| Replace one sync method on a real object | `MagicMock` | `test_project_airsim_adapter.py` |

The repo has named fake classes — `FakeClient`, `FakeState`,
`_FakeCamera`, `_FakeDetector`, `_FakeEngine` — when a `MagicMock`
would be too noisy. Use a named class when the test reads better
with a real method signature, e.g. when you need a fake that yields
from a method.

### 4.3 Synthetic frames and landmarks

For CV-pipeline tests, the input is a numpy array. Two helpers
generate them:

```python
def make_blank_frame(w=640, h=480):
    """Returns a blank BGR frame of the given dimensions."""
    return np.zeros((h, w, 3), dtype=np.uint8)


def make_mock_hand_landmarks(num=NUM_LANDMARKS):
    """Returns a mock mediapipe hand_landmarks object with 21 landmarks."""
    mock = MagicMock()
    mock.landmark = [
        make_mock_landmark(x=i * 0.01, y=i * 0.01, z=0.0)
        for i in range(num)
    ]
    return mock
```

Pre-recorded webcam frames are **not** committed to the repo. If a
test genuinely needs a real frame, generate one synthetically — a
blank frame with three landmarks at known coordinates is usually
enough.

### 4.4 In-memory SQLite *(planned)*

The current suite does not yet have a storage-layer test fixture
because the storage layer is being implemented during the Demo 2
sprint. The intended pattern (once the storage layer lands) is to
construct `StorageManager` with the SQLite URL `sqlite:///:memory:`,
which gives every test its own ephemeral database. Update this
section when that lands.

### 4.5 Mock-payload constants

Backend tests pin canned-data contracts using module-top constants
(`MOCK_DRONE_TELEMETRY`, `MOCK_SIM_TELEMETRY`, `FLIGHT_IDS`,
`EXPECTED_KEYS`). This is appropriate when:

- The backend endpoint currently serves canned data (true today for
  `/drone/flight-summary` and `/sim/flight-summary`).
- The test is explicitly pinning the *current contract* so a change
  to the canned data is a visible, reviewable diff.

It becomes a smell when the endpoint is wired to real data — at
that point, the constants should be replaced with a fixture that
calls the real path and the assertions should describe *shape and
range* rather than exact values. See §8 for the list of endpoints
that need this transition.

### 4.6 No production data, ever

Per [`POLICY.md` §8](POLICY.md#8-test-data--privacy):

- No real webcam recordings, no real telemetry logs, no production
  credentials in test fixtures.
- The labelled gesture dataset (when added, for the
  recogniser-accuracy benchmark in `R9.1`) will be team-contributed
  and PII-free.
- Test JWT keys are generated at test-runtime, never committed.

---

## 5. Worked Examples

The patterns above in action. Each example is a near-verbatim
extract from the suite with the key choice annotated.

### 5.1 A pure unit test (no mocking)

`test_command.py` — testing a dataclass's behaviour:

```python
from services.commands.command import (
    PRIORITY_CRITICAL, PRIORITY_NORMAL, Command, CommandType,
)

def test_emergency_stop_priority_escalation():
    cmd = Command(type=CommandType.EMERGENCY_STOP)
    assert cmd.priority == PRIORITY_CRITICAL


def test_non_escalation():
    cmd = Command(type=CommandType.HOVER)
    assert cmd.priority == PRIORITY_NORMAL
```

When the unit has no collaborators, the test has no mocks. Resist
the urge to over-engineer.

### 5.2 A unit test with class-based grouping

`test_async_queue.py` — testing a queue's construction and behaviour:

```python
class TestConstruction:
    def test_default_maxsize(self):
        q = BoundedFrameQueue[int]()
        assert q.maxsize == 2

    def test_zero_maxsize_rejected(self):
        with pytest.raises(ValueError, match='maxsize must be >= 1'):
            BoundedFrameQueue[int](maxsize=0)


class TestDropCount:
    @pytest.mark.asyncio
    async def test_drop_count_accumulates(self):
        q = BoundedFrameQueue[int](maxsize=1)
        q.try_put_nowait(1)
        q.try_put_nowait(2)  # +1 drop
        q.try_put_nowait(3)  # +1 drop
        assert q.drop_count == 2
```

One class per behaviour. The class names ("Construction",
"DropCount") read as section headings in test output.

### 5.3 An adapter unit test with SDK mocking

`test_airsim_adapter.py` — testing an adapter against a mocked SDK:

```python
class FakeClient:
    def __init__(self):
        self.takeoffAsync = MagicMock(return_value=self)
        self.landAsync = MagicMock(return_value=self)
        # … other methods …

    def join(self):
        return None


@pytest.mark.asyncio
async def test_connect_success():
    adapter = AirSimAdapter()

    # airsim is imported inside connect(), so we patch sys.modules
    with patch.dict('sys.modules', {'airsim': MagicMock()}):
        result = await adapter.connect()

    assert result is True
    assert adapter._connected is True


@pytest.mark.asyncio
async def test_move_forward_executes():
    adapter = AirSimAdapter()
    adapter._connected = True
    adapter._client = FakeClient()       # named fake — cleaner than MagicMock

    await adapter.move(CommandType.MOVE_FORWARD)

    assert adapter._client.moveByVelocityAsync.called
    assert adapter._client.hoverAsync.called
```

The named `FakeClient` is preferred over a raw `MagicMock` when the
fake has several methods that are all hit in the same test — a
`MagicMock` would silently absorb typos.

### 5.4 An integration test with `AsyncMock`

`test_keyboard_to_dummy_drone.py` — testing keyboard → drone:

```python
@pytest.mark.asyncio
async def test_keyboard_move_forward_to_dummy_drone():
    drone = DummyDroneAdapter()
    await drone.connect()

    drone.move = AsyncMock()             # spy

    adapter = KeyboardAdapter()

    async def handler(cmd):
        await drone.execute(cmd)

    # _emit is sync → wrap in create_task
    adapter.set_handler(lambda cmd: asyncio.create_task(handler(cmd)))

    adapter.handle_message({'key': 'ArrowUp', 'event': 'keydown'})

    await asyncio.sleep(0.01)            # let the task drain

    drone.move.assert_awaited_once()
    args = drone.move.await_args.args
    assert args[0] == CommandType.MOVE_FORWARD
```

Three patterns here, all from §3:

- `AsyncMock` for the drone-side method (§3.7).
- The sync-to-async bridge (§3.9).
- The 10 ms drain sleep (§3.9).

### 5.5 A FastAPI WebSocket test

`test_api.py` — testing a WebSocket endpoint with a patched async
getter:

```python
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

MOCK_DRONE_TELEMETRY = {
    'battery': 100, 'altitude': 20, 'heading': 180,
    'speed': 12.3, 'mode': 'GUIDED',
}


@patch('app.api.api.get_drone_telemetry', new_callable=AsyncMock)
def test_drone_telemetry_sends_correct_json(mock_get):
    mock_get.return_value = MOCK_DRONE_TELEMETRY
    with client.websocket_connect('/drone/telemetry') as ws:
        data = ws.receive_json()
    assert data == MOCK_DRONE_TELEMETRY
```

The patch target is the **import location** (`app.api.api.get_drone_telemetry`)
not the definition location. Patch where the symbol is *used*, not
where it is *defined*.

### 5.6 A Playwright E2E test

`gestures.spec.ts` — testing the gestures page:

```typescript
import { test, expect } from '@playwright/test'

test.describe('gesture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gestures')
    await page.waitForLoadState('domcontentloaded')
  })

  test('gesture detection heading', async ({ page }) => {
    await expect(page.getByText(/gesture detection/i)).toBeVisible()
  })

  test('command history entries', async ({ page }) => {
    await expect(page.getByText(/swipe up - move up/i)).toBeVisible()
    await expect(page.getByText(/swipe down - move down/i)).toBeVisible()
  })
})
```

The conventions visible here:

- One `test.describe` per page, with `beforeEach` to navigate.
- Case-insensitive regex matchers (`/gesture detection/i`) so
  copy-tweaks don't break tests.
- `waitForLoadState('domcontentloaded')` — never a `sleep`.
- `.first()` when the text appears more than once on the page.

---

## 6. Writing a New Test — Checklist

Before opening the PR, walk this list.

- [ ] **File named** `test_<unit>.py` (Python) or
      `<area>.spec.ts` (frontend), in the matching directory under
      §1.
- [ ] **Reference doc consulted** — see §1.2. The contract is in
      the doc; the test verifies it.
- [ ] **Imports follow the layout** in §3.1; `sys.path` and
      `sys.modules` mutations go above the local imports.
- [ ] **Test is in the right bucket** — see
      [`POLICY.md` §3](POLICY.md#3-testing-types). Unit if it
      isolates one thing; integration if it crosses a module
      boundary with one real side; E2E if the user is the input.
- [ ] **One assertion focus per test.** If a test asserts five
      unrelated things, it's actually five tests.
- [ ] **Names describe behaviour**, not implementation:
      `test_drop_count_accumulates` (good),
      `test_drop_count_method` (bad).
- [ ] **Used the existing helper factory** if one fits, or added
      one if the new setup recurs.
- [ ] **Marker on async tests** — `@pytest.mark.asyncio` even though
      auto-mode would catch it. Readers can scan for the marker.
- [ ] **Mock at the import site**, not the definition site, when
      patching external collaborators.
- [ ] **Ran `make fix`** (Python) or `yarn lint && yarn format`
      (frontend) before pushing.
- [ ] **Coverage on the touched module is still ≥ 80 %** in the
      local `make test` output.
- [ ] **CI is green** on the PR before requesting review.

---

## 7. Debugging a Failing Test

In rough order of usefulness:

| What | How |
| --- | --- |
| See what the test was actually doing | `pytest -v -s` (show prints + stdout), `--log-cli-level=INFO` (show log lines). |
| See what a mock was called with | `print(mock.mock_calls)` or `print(mock.await_args)`. |
| Pause inside a Python test | `breakpoint()` — pytest leaves stdin attached. |
| Pause inside a Playwright test | Add `await page.pause()` — opens the Inspector. |
| Run one Playwright test in headed mode | `yarn test gestures.spec.ts --headed --debug`. |
| Track down "imports are wrong" errors | The `sys.path` and `sys.modules` patterns in §3.2 and §3.3 are subtle — diff your file against a working test in the same folder. |
| "Test passes locally, fails in CI" | See [`CICD.md` §7](CICD.md#7-troubleshooting) — usually a missing dependency in `pyproject.toml` / `package.json` or a local-only env var. |
| "AsyncMock isn't being awaited" | You probably patched the definition site instead of the import site. See §5.5. |

---

## 8. Known Limitations &amp; Things to Tidy

A short, honest list of where the suite is today.

- **Several endpoints serve canned data, and the tests pin the
  canned contract.** The flight-summary endpoints (`/drone/flight-summary`,
  `/sim/flight-summary`) currently return fixed lists; the
  telemetry endpoints currently return `MOCK_DRONE_TELEMETRY` /
  `MOCK_SIM_TELEMETRY`. This is appropriate for Demo 2 — the
  contract is real, the data is not — but each of these is a
  candidate for re-testing against real data once the
  telemetry-and-storage layer lands.
- **Frontend specs assert on hardcoded UI values.** The dashboard
  spec checks for `56%`, `71%`, `5.6 km/h`, `72m`, `Phantom 4` —
  these will break the moment real telemetry replaces the mock
  data. Treat them as snapshot tests of the current mock state, to
  be rewritten once the WebSocket feed is wired up.
- **No auth-flow tests yet.** The route table in
  [`frontend/routing.md`](frontend/routing.md) includes
  `/login`, `/signup`, `/terms`, and `/settings`, but the
  Playwright suite only covers `/dashboard`, `/gestures`, and
  `/analytics`. Auth coverage is a planned addition.
- **No coverage gate is enforced yet.** Both backend and services
  Makefiles have `--cov-fail-under=80` commented out. CI runs
  coverage but does not fail on a drop; the policy in
  [`POLICY.md` §5](POLICY.md#5-acceptance-criteria) is the
  intended bar.
- **`hover()` and `emergency_stop()` on `DummyDroneAdapter` are
  no-ops.** Tests using the dummy adapter verify the *routing* of
  these commands, not the behaviour. The behaviour itself can only
  be verified against ProjectAirSim or a real drone — manual
  exploratory testing covers this.
- **`AirSimAdapter` uses `.join()` inside an executor** —
  [`services/airsim_adapter.md`](services/airsim_adapter.md) flags
  this as a known issue to refactor. Once refactored, the
  `test_airsim_adapter.py` tests should be reviewed against the
  new control flow.
- **`conftest.py` is path-shim only** — see §3.10. Promotion of
  shared fixtures is a Demo 2 retro candidate.
- **Performance and accessibility harnesses are not in the suite
  yet** — see [`POLICY.md` §3.4 / §3.5](POLICY.md#3-testing-types)
  for what's planned.

---

## 9. References

- [`POLICY.md`](POLICY.md) — what the tests must achieve.
- [`CICD.md`](CICD.md) — how CI runs them.
- [`GIT.md`](GIT.md) — how a PR gets through the gates.
- [`CODING.md`](CODING.md) — the conventions the production code
  follows, which the tests verify.
- Per-module reference docs:
  [`services/command.md`](services/command.md),
  [`services/drone_adapter.md`](services/drone_adapter.md),
  [`services/dummy_drone_adapter.md`](services/dummy_drone_adapter.md),
  [`services/airsim_adapter.md`](services/airsim_adapter.md),
  [`services/project_airsim_adapter.md`](services/project_airsim_adapter.md),
  [`services/input_adapter.md`](services/input_adapter.md),
  [`services/dummy_input_adapter.md`](services/dummy_input_adapter.md),
  [`services/keyboard_adapter.md`](services/keyboard_adapter.md),
  [`frontend/atoms.md`](frontend/atoms.md),
  [`frontend/molecules.md`](frontend/molecules.md),
  [`frontend/organisms.md`](frontend/organisms.md),
  [`frontend/routing.md`](frontend/routing.md).
- [pytest docs](https://docs.pytest.org/) — particularly
  `caplog`, `monkeypatch`, and `pytest-asyncio`.
- [Playwright docs](https://playwright.dev/docs/intro) —
  particularly locators, `expect`, and the Inspector.