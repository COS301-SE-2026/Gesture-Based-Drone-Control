# Testing Policy

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Demo 3 deliverable</span>
  <span class="tx-status">Coverage gate · ≥ 80 % (enforced in CI)/span>
  <span class="tx-status">Severity · Critical / High / Medium / Low</span>
</div>

!!! abstract "What this document covers"
    The Testing Policy for the Gesture-Based Drone Control System (GBDCS): the contract the team commits to on quality. The companion [`TESTING.md](testing/TESTING.md) is the operational manual for actually writing and running the tests this policy mandates. The policy is binding on every contributor and is enforced through the CI gates in [`CICD.md`](CICD.md) and th pull-request rules in [`GIT.md`](GIT.md).

---

## 1. Purpose &amp; Scope

### 1.1 Purpose

Tis document defines the standards, procedures and responsibilities for testing on GBDCS. It exists so the team has one clear answer to "is this change accepted?", so mentors can review the testing apporach without reading the codebase to see if it up to standard and no shorcuts taken so that clean, quality and. efficient code is produced and broken code does not make it to dev and main.

### 1.2 Scope

The policy covers all production source code, the documentaion that ships with it, the CI/CD pipeline, and the deployed artifacts. 

### 1.3 Relationship to other documents

| Document | Role |
| --- | --- |
| [`SRS.md`](SRS.md) | Source of the quality requirements the testing strategy verifies. |
| [`SAS.md`](SAS.md) | Source of the architectural decisions that the test types target. |
| [`PLAN.md`](PLAN.md) | Definition of Done that depends on this policy being satisfied. |
| [`CICD.md`](CICD.md) | The automated enforcement of this policy. |
| [`GIT.md`](GIT.md) | The pull-request workflow this policy gates. |
| [`TESTING.md`](testing/TESTING.md) | The operational manual — how to satisfy this policy in practice. |

---

## 2. Testing Objectives

Testing on GBDCS exists to verify five concrete things, each tied
back to a quantified quality requirement in the SRS.

| Objective | Verifies | Policy bar |
| --- | --- | --- |
| **Behavioural correctness** | Functional requirements | Every functional requirement has at least one automated test exercising it. |
| **Performance** | gesture-to-command latency, FPS, dashboard render | FPS and latency issues are optimised before pushed to main and released. |
| **Security** | Auth flow, secret hygiene, schema validatiion | No secrets in any commit (gitleaks-gated). REST endpoints validated via Pydantic shcemas and covered by tests. |
| **Reliability** | classification accuracy, pipeline crash isolation | Recogniser behaviour pinned by rule-based test suite; failure paths covered by adapter and stream tests. |
| **Maintainability** | module coverage | ≥ 80 % line coverage on the python codebase, enforced by `--cov-fail-under-80` in CI. |
| **Usability** | first-flight time, error messages | Manual UX audits and accessibility scans run before each demo. |

---

## 3. Testing Types

The team runs six classes of test. Each has a different owner, a
different runner, and a different gate.

### 3.1 Unit testing

| Property | Value |
| --- | --- |
| **Owner** | The author of the code under test. |
| **Runner** | `pytest` for Python (`apps/backend/tests`, `services/tests`); Playwright for the frontend (`apps/frontend/tests/unitTesting/`). |
| **Scope** | Functions and classes in insolation, mocked collaborators. No real network, disk or drone. |
| **Gate** | Required on every PR to `dev`, `main`, or `Use-Case*`. |
| **Coverage target** | ≥ 80 % line coverage on Python code, enforced in CI. |
| **Naming** | `test_<unit>.py` or `<area>.test.ts`. One assertion focus per test. |

### 3.2 Integration testing

| Property | Value |
| --- | --- |
| **Owner** | The author of the integration surface |
| **Runner** | `pytest` over `tests/integration/`, with a real component on one side and a controlled fake on the other. |
| **Scope** | Backend <-> db manager, auth flow end to end, calibration REST + WebSocket, gesture stream. |
| **Gate** | Required on every PR to `dev` and `main`; runs after both unit jobs pass. |

### 3.3 End-to-end (E2E) testing

| Property | Value |
| --- | --- |
| **Owner** | Authors of UI-touching changes contribute the scenarios. |
| **Runner** | Playwright (`playwright.e2e.config.ts`, single worker) against a real backend. In CI the job runs with `GBDC_E2E_NO_CAMERA=1` because runners have no webcam. |
| **Scope** | Whole-user journeys: auth and gesture flows under `apps/frontend/tests/end_to_end/`. |
| **Gate** | Required on every PR to `dev` or `main` |

### 3.4 Performance testing

Owned by the CV/ML side of the team (Shavir, Ayush, Jaitin). Latency and FPS are measured manually against the running pipeline before each demo. 

### 3.5 Accessibility testing

Owned by the frontend leads (Chinmayi, Diya). Lighthouse and axe runs against the dashbaord and landing page before each demo, targeting WCAG 2.2 AA per [`BRAND.md`](BRAND.md).

### 3.6 Manual exploratory testing

Everyone contributes one session per demo, note for demo 2 only ProjectAirSim can be tested as issues with the real drone caused a serious roadblock. Edge cases are tested automated testing cant reach; poor lighting, occluded hands, link loss, 3 hands in a frame. Demos do not ship with an open Critical defect.

---

## 4. Tools and Environments

### 4.1 Tools

| Concern | Tool | Configured in |
| --- | --- | --- |
| Python lint + format | **Ruff** | `pyproject.toml` |
| Python tests | **pytest** + `pytest-cov` + `pytest-asyncio` | `pyproject.toml` |
| TypeScript/JS lint | **ESLint** | `eslint.config.js` |
| Format | **Prettier** | `.prettierrc` |
| Frontend unit + E2E | **Playwright** | `playwright.config.ts`, `playwright.e2e.config.ts` |
| Coverage reporting | **CodeCov** | generated reported in `task test` and in CI |
| Static analysis| **SonarQube** | runs in CI |
| Accessibility | **Lighthouse / axe** | manual, pre-demo |
| Coverage reporting | `pytest-cov` + `c8` (TS) | `pyproject.toml`, `package.json` |
| CI runner | **GitHub Actions** | `.github/workflows/` |

### 4.2 Environments

| Environment | What runs there | Test gating |
| --- | --- | --- |
| **Local developer machine** | Full stack via `Task dev` | Author runs relevant suites before making a PR. |
| **CI (GitHub Actions)** | Lint and test workflows per [`CICD.md`](CICD.md). | All required checks must pass before merge to a protected branch. |

| **Packaged releases** | Windows and Linux desktop builds, published as GitHub Releases on every push to `main`. | Push to `main` is itself gated by the full test workflow. |

---

## 5. Acceptance Criteria

A change is *accepted* into a protected branch only when all of the following hold. Failing any one blocks the merge.

1. **All automated tests pass** in CI on the merge commit — lint
   (Ruff, ESLint, Prettier), unit, integration, and (where applicable)
   E2E.
2. **Coverage gate is green** — ≥ 80 % line coverage on Python code; CI fails
   the PR otherwise.
3. **No new Critical or High defects** are open against the touched
   area.
4. **Code review approval** is in place per [`GIT.md`](GIT.md).

Failing any single item blocks the merge.

---

## 6. Defect Management

### 6.1 Where defects live

Every defect is a **GitHub Issue** on the project repository, with the
`bug` label and a severity label (`severity:critical` / `severity:high`
/ `severity:medium` / `severity:low`). Blocking defects go straight onto the projects board.

### 6.2 Severity scale

| Severity | Description | Examples on GBDCS |
| --- | --- | --- |
| **Critical** | System unstable or unsafe; demo cannot proceed. | Camera fails to open in the executable file and WebSockets are all failing. |
| **High** | A primary use case is broken or substantially degraded. | A documented gesture is not recognised. Telemetry stops updating. AirSim is not responding. |
| **Medium** | A non-primary feature is broken, or a primary feature works but is wrong in detail. | Light/dark theme toggle does not persist. Latency or FPS issues. |
| **Low** | Cosmetic or minor edge-case issue. | Misaligned icon. Typo in an error message. |

### 6.3 Service-level expectations

These are the team's targets — not contractual SLAs, but the cadence
the team commits to in front of mentors.

| Severity | Acknowledge | Triage | Fix target |
| --- | --- | --- | --- |
| Critical | Same day | Same day | Hotfix branch off `main`; deployed before the next demo. |
| High | Within 1 working day | At the next stand-up | Inside the current sprint. |
| Medium | Within 2 working days | At the next backlog refinement | Inside the current or next sprint. |
| Low | Logged | At the next backlog refinement | Whenever the relevant area is next touched. |

### 6.4 Workflow

```mermaid
flowchart LR
    REP([Defect raised]) --> TRIAGE{Triage}
    TRIAGE -->|critical| HOT[Hotfix branch off main]
    TRIAGE -->|high| SPR[Add to current sprint]
    TRIAGE -->|medium/low| BKL[Add to product backlog]
    HOT --> FIX[Fix &amp; PR]
    SPR --> FIX
    BKL --> FIX
    FIX --> REV[Code review + tests]
    REV --> MERGE([Merged &amp; deployed])
    MERGE --> VER[Verify in environment]
    VER -->|pass| CLOSE([Issue closed])
    VER -->|fail| REOPEN[Re-open + escalate severity]
    REOPEN --> TRIAGE
```

*Figure 6.1 — Defect lifecycle. Every defect ends with explicit
verification before the issue is closed.*

### 6.5 Regression protection

Every Critical or High defect, once fixed, **must** ship with at least
one new automated test that fails against the broken code and passes
against the fix. This protects against the same defect ever returning.

---

## 7. Roles &amp; Responsibilities

Every team member carries both **development** and **testing** duties
— there are no testing-only or development-only roles. The
distribution below shows where each member leads in addition to their
default share of unit / integration testing for their own code.

## 8. Test Data &amp; Privacy

- **No production data is used in testing.** Test fixtures are
- **No live webcam capture is committed** to the repository for any
  purpose. CI runs the E2E suite in no-camera mode.
- **Secrets** required for tests (e.g. test-only JWT signing keys) are
  injected as environment variables in CI, never comitted.

---

## 9. Release Readiness

Before any demo, the team runs the **Release Readiness Checklist**
below.

- [ ] CI is green on the demo tag.
- [ ] No open Critical defect; no open High defect against a demo
      feature.
- [ ] Coverage gate passing.
- [ ] FPS and latency is reviewed.
- [ ] Every team member has completed one exploratory testing session
      against the demo build and logged any findings.
- [ ] A backup demo recording exists.

---

## 10. Policy Review

This policy is reviewed at the **retrospective** of every demo
sprint. Material changes (new tools, new gates, role changes) require
the team's consensus and an update to this document in the same PR.

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0 | Demo 2 | Codex Merchants | Initial policy for the Demo 2 deliverable. |
| 1.1 | Demo 2 | Codex Merchants | Huge refactor to match with the current state of the system policies nearing the end of demo 2. |
