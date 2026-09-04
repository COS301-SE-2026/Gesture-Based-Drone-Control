# Coding Standards

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Demo 3 deliverable</span>
  <span class="tx-status">Python · Ruff (E·F·I·N)</span>
  <span class="tx-status">TS / React · ESLint + Prettier</span>
</div>

!!! abstract "What this document covers"
    The conventions, styles, and configurations that keep the
    Gesture-Based Drone Control System (GBDCS) codebase **uniform,
    clear, flexible, reliable, and efficient** across its three
    sub-codebases. The rules in this document are the ones actually
    enforced by the linters and formatters that run in CI — the
    configurations they reference are the **source of truth**.

    For the human-side process around code (branching, commits, pull
    requests, merge strategy) see [`GIT.md`](GIT.md); for the
    automated enforcement see [`CICD.md`](CICD.md); for the testing
    bar see [`POLICY.md`](POLICY.md).

---

## 1. Repository Layout

GBDCS is a **mono-repo**. Everything ships from one git history,
which keeps refactors atomic and makes the contracts between
sub-systems checkable at PR time.

```
├── apps/
│   ├── backend/            # FastAPI app - REST + WebSocket gateway
│   │   ├── app/api/        # routers: auth, drone, input, gestures, calibration, analytics
│   │   ├── app/cv/         # calibration, serialization, camera stream
│   │   └── tests/
│   ├── frontend/           # React (Vite) operator dashboard + Electron shell
│   │   ├── src/components/ # atoms / molecules / organisms / layouts / ui
│   │   ├── electron/
│   │   └── tests/          # Playwright: unitTesting/ + end_to_end/
│   ├── desktop/            # desktop packaging scaffolding
│   └── mobile/             # mobile wrapper scaffolding (android / ios)
├── services/               # CV pipeline, recognisers, adapters, auth, DB, telemetry
│   ├── cv_pipeline/        # camera → hand detection → gestures → processing
│   ├── drone_control/      # DroneAdapter implementations
│   ├── input/              # InputAdapter sources (keyboard, gamepad, gesture, dummy)
│   ├── commands/           # Command dataclass + CommandType
│   ├── auth/               # auth manager, tokens, cookies, password service
│   ├── database_manager/   # SQLAlchemy async engine, models, managers
│   ├── telemetry/          # telemetry manager + observer + storage
│   └── tests/
├── packages/               # shared contracts / domain / utils
├── landing_page/           # marketing site, deployed to Pages root
├── infrastructure/         # scripts
├── init-db/                # init scripts 
├── vendors/                # vendored projectairsim (lint-exempt)
├── tests/integration/      # cross-cutting integration tests
├── sandbox/                
├── .github/workflows/      # lint.yml · test.yml · docs.yml · release.yml
├── docker-compose.yml      
├── Taskfile.yml            # canonical dev commands
├── pyproject.toml          # single Python project config (uv-managed)
└── mkdocs.yml
```

### 1.1 Why mono-repo

- One `git push` updates code + docs + CI together, so the
  cross-document traceability in SRS / SAS / PLAN never drifts from
  the code.
- A single CI configuration covers everything; see [`CICD.md`](CICD.md).

### 1.2 Where new code goes

| If you are writing… | Put it under… |
| --- | --- |
| A new REST endpoint or WebSocket handler | `apps/backend/app/api` |
| A new React component or page | `apps/frontend/src/components` |
| A new gesture recogniser strategy | `services/cv_pipeline/gestures/recognizers/` |
| A new drone adapter | `services/drone_control/adapters/` |
| A new input source (camera, keyboard, joystick…) | `services/input/sources/` |
| A new shared type seen by both Python and TypeScript | `packages/` |
| Docs | `docs/` |

---

## 2. Cross-Language House Style

GBDCS deliberately uses **different surface conventions for Python
and TypeScript** so that each codebase looks idiomatic to readers
who come from its native ecosystem. The same rules are not stretched
across the divide — what is right in Python is not right in
TypeScript and vice-versa. The matrix below makes the split
explicit.

| Concern | Python | TS / JS / React |
| --- | --- | --- |
| Quote style | **Single** (`'open_palm'`) | **Double** (`"open_palm"`) |
| Indentation | **Tab** | **2 spaces** |
| Line length | **100 chars** | Prettier default |
| Semicolons | Not applicable | **Omitted** (`semi: false`) |
| Trailing commas | Ruff default | **ES5-compatible** |
| Naming | `snake_case` for fns/vars, `PascalCase` for classes (Ruff `N`) | `camelCase` for fns/vars, `PascalCase` for components/types |

If you write Python and your editor inserts double quotes or
spaces, **fix your editor — don't fight the formatter**. The same
applies in reverse when you cross into the frontend.

!!! warning "Don't `noqa` your way out"
    Per-line lint suppressions (`# noqa`, `// eslint-disable-next-line`)
    are reserved for cases where the lint rule is genuinely wrong —
    not as an escape hatch for inconvenient rules. Every suppression
    requires a one-line comment explaining why.

---

## 3. Language Configurations

The settings in this section are the **canonical, enforced** versions.
If this document and a config file ever disagree, the config file
wins and this document is the bug; open a PR to align it.

### 3.1 Python — Ruff (`pyproject.toml`)

The same Ruff configuration applies to both `apps/backend/` and
`services/`. The intent is *lint enough to catch real bugs, not
enough to opinionate on style*.

```toml
[tool.ruff]
exclude = ["vendors"]
target-version = "py311"
line-length = 100
 
[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "F",   # pyflakes - logical errors, unused imports/vars
    "I",   # isort - import ordering
    "N",   # pep8-naming
]
ignore = ["E402"]
 
[tool.ruff.format]
quote-style = "single"
indent-style = "tab"
```

**Local commands.** Both Python codebases expose the same Make
targets, so the workflow is identical wherever you are:

```bash
task install   # uv venv + uv sync + yarn install
task lint      # ruff check + eslint + prettier --check
task fix       # ruff check + ruff check --fix + prettier --write
task test      # all test suites
```

### 3.2 Python — pytest (`pyproject.toml`)

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["."]
```

- **`asyncio_mode = "auto"`** — every `async def test_…` is treated
  as an asyncio test automatically. No `@pytest.mark.asyncio`
  required.
- **`pythonpath = [".]`** — lets tests import `app` and `servies` from the repo root. Coverage omits `vendors/` and test files, and the backedn unit target enforces `--cov-fail-undder=80`

### 3.3 Backend — FastAPI conventions

| Concern | Convention |
| --- | --- |
| Routee | One router per resource `app/api/`, each with its own `prefix` and `tags`, all mounted under the top-level `/api` router. |
| Schemas | Pydantic models for every request and response body. Validation errors surface as 4xx, never 500. |
| Dependencies | Injected via `Depends` (state, DB session). Dont reach for module-level globals. |
| WebSockets | Live streams (telemetry, commands, gesture, calibration) are WS endpoints on the same routers as their REST siblings. |
| Docstrings | Every endpoint has `summary`/`description` or docstring: FastAPI serves them at `/docs`. |
| Async | Endpoint handlers and adapter calls are async end to end. Blocking work goes to an executor. |

### 3.4 Frontend - EsLint (`eslint.config.js`)

Flat config. `dist` and config files are ignored. Electron code lints with Node globals; app code extends the JS recommended set plus `react-hooks`; `.ts`/`.tsx`/`.jsx` files additionally get typescript-eslint's type-cehcked rules, with `no-explicit-any` as a warning and unused vars as an error. The Prettier config is applied last so formatting never conflicts with lint.

### 3.5 Frontend - Prettier ('.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "endOfLine": "lf"
}
```

`yarn format` writes, `yarn format:check` verifies (this is what CI runs through `task lint`).

### 3.6 TypeScript — Prettier (`.prettierrc`)

 Concern | Convention |
| --- | --- |
| Component files | One component per file. `PascalCase.jsx` Application components are JSX; TS is used for the Playwright test suites and the shadcn `ui/` primitives. |
| Composition | Atomix design: `atoms/` -> `molecules/` -> `organisms/`, plus `layouts/` (`RootLayout`) and `ui/`. Components belong in the samllest layer that holds them. Each layer re-exports through its `index.js`. |
| Hooks | All custom hooks live under `src/hooks/`; prefixed `use`. Every `useEffect` lists its dependencies. |
| State | Local state via `useState`/`useReducer`; cross-component state through the providers in `src/context/`. No new globals. |
| Routing | `react-router-dom` v7, Route definitions live in `src/App.jsx`. |
| Forms | Validated client-side (see the login/signup forms) and re-validated server-side by the Pydantic schemas. |

### 3.7 Tailwind (`tailwind.config.js`)

The theme is extended, not replaced, and mirrors the design tokens in [`BRAND.md`](BRAND.md): the colour set (`Red`, `DarkRed`, `LightRed`, `Grey`, `DarkGrey`, `OffWhite`, `OffBlack`), the `xs`-`xl` spacing scale, radius scale, glass shadows, and the dont stacks (`font-sans` -> Inter/Roboto,`font-display` -> Geist). Dark mode is class-based (`darkMode: 'class'`), toggled by setting `dark` on the root element, so the users choice wins over the OS default.

---

## 4. General Naming &amp; Structure Rules

### 4.1 Files and directories

Use the languages native convention: `snake_case.py`, `PascalCase.jsx`, `camelCase.ts`. 

### 4.2 Imports

Standard library, third-party, then local, seperated by blank lines (Ruff `I` handles this). No circular imports.

### 4.3 Naming patterns

| Construct | Python | TypeScript |
| --- | --- | --- |
| Module / file | `snake_case.py` | `PascalCase.tsx` (component) / `camelCase.ts` |
| Class / type | `PascalCase` | `PascalCase` |
| Function / variable | `snake_case` | `camelCase` |
| Constant | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| Boolean | Prefix with `is_` / `has_` / `should_` | Prefix with `is` / `has` / `should` |
| Private | Leading underscore (`_internal`) | Leading underscore (`_internal`) |

### 4.4 Comments

- Comments explain **why**, not what. The code already says what.
- Public functions / classes have a docstring (Python) or TSDoc
  block (TypeScript).

### 4.5 Error handling

Fail loudly during development, fail safely in production. Don't swallow exceptions. If you must catch broadly, log the exception with context and re-raise or follow the failsafe path. Every user-visible error must include a `cause` and a `suggestion`.

### 4.6 Logging

- Use Python's `logging` module, not `print`.
- Log levels: `DEBUG` (verbose inner loop), `INFO` (lifecycle
  events), `WARNING` (recoverable anomaly), `ERROR` (failsafe trip
  or domain failure), `CRITICAL` (process is shutting down).
- Log lines are structured key-value where practical so the replay
  pipeline can grep them.

### 4.7 Configuration

- All configuration is loaded from environment variables (or
  `.env` for local dev, loaded by the Taskfile).
- `.env.example` documents every required variable with a
  placeholder.
- **Never commit secrets** — these live in GitHub Actions Secrets.
---

## 5. Git, Commits &amp; Pull Requests

The full branching strategy, commit-message form, and review rules
live in [`GIT.md`](GIT.md). The short version, included here so
contributors do not have to context-switch documents to start:

### 5.1 Branches

```
main
└── dev
      └── Use-Case<n>
            └── feature/UC<n>/<short-name>
```

See [`GIT.md` §1](GIT.md#1-branch-flow) for the full lifetime
table and rationale.

## 6. Definition of "Done" — How This Document Fits

A change is *done* when it satisfies every gate in
[`POLICY.md`](POLICY.md#5-acceptance-criteria) and
[`PLAN.md`](PLAN.md#3-definition-of-ready--definition-of-done).

---

## 7. Updating This Document

This document is updated whenever a config in §3 changes, a
convention in §4 changes, or a reviewer raises the same point on
two PRs. The PR that changes the convention must also change the
documentation in the same commit — drift between them is a defect.

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0 | Demo 2 | Codex Merchants | Initial coding-standards document derived from the live `pyproject.toml`, `eslint.config.js`, `.prettierrc`, `tsconfig.json`, and `tailwind.config.js`. |
| 1.1 | Demo 2 | Codex Merchants | Huge refactor to relate more to the root reason for the document and updated the information to match exactly to the current state of the system. |