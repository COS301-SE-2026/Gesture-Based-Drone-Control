# Coding Standards

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Demo 2 deliverable</span>
  <span class="tx-status">Python · Ruff (E·F·I·N)</span>
  <span class="tx-status">TS / React · ESLint + Prettier</span>
</div>

!!! abstract "What this document covers"
    The conventions, styles, and configurations that keep the
    Gesture-Based Drone Control System (GBDCS) codebase **uniform,
    clear, flexible, reliable, and efficient** across its three
    sub-codebases. The rules in this document are the ones actually
    enforced by the linters and formatters that run in CI — the
    configurations they reference are the **source of truth** and are
    cited verbatim in §3.

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
Gesture-Based-Drone-Control/
├── apps/
│   ├── backend/          # FastAPI app — REST + WebSocket gateway
│   ├── frontend/         # React + TypeScript operator dashboard
│   ├── desktop/          # Electron shell wrapping the frontend
│   └── mobile/           # Capacitor wrapper (PWA → iOS / Android)
├── services/             # CV pipeline, gesture recognisers, drone adapters
│   ├── cv_pipeline/      # Capture → preprocess → landmarks → classify
│   ├── drone_control/    # DroneAdapter implementations
│   ├── input/            # Input sources (camera, keyboard, dummy)
│   ├── commands/         # Command translation
│   ├── telemetry/        # TelemetryManager + storage
│   └── tests/            # Cross-service tests
├── packages/
│   ├── contracts/        # Shared types — Python ↔ TypeScript
│   │   ├── python/
│   │   └── typescript/
│   ├── domain/           # Domain models referenced by both sides
│   └── utils/
├── infrastructure/
│   ├── docker/           # Backend / frontend / AirSim Dockerfiles
│   └── scripts/          # One-off helpers
├── docs/                 # MkDocs site source
├── tests/integration/    # Cross-cutting integration tests
├── sandbox/              # Throwaway exploration scripts (lint-exempt per POLICY §10)
├── .github/workflows/    # lint.yml · test.yml · docs.yml
├── docker-compose.yml
├── mkdocs.yml
└── README.md
```

### 1.1 Why mono-repo

- One `git push` updates code + docs + CI together, so the
  cross-document traceability in SRS / SAS / PLAN never drifts from
  the code.
- The shared types in `packages/contracts/` are imported by *both*
  Python (backend, services) and TypeScript (frontend), so the WS
  envelope cannot be changed in one place without breaking the
  other at build time.
- A single CI configuration covers everything — see [`CICD.md`](CICD.md).

### 1.2 Where new code goes

| If you are writing… | Put it under… |
| --- | --- |
| A new REST endpoint or WebSocket handler | `apps/backend/app/` |
| A new React component or page | `apps/frontend/src/` |
| A new gesture recogniser strategy | `services/cv_pipeline/gestures/` |
| A new drone adapter | `services/drone_control/adapters/` |
| A new input source (camera, keyboard, joystick…) | `services/input/sources/` |
| A new shared type seen by both Python and TypeScript | `packages/contracts/` (and regenerate the bindings) |
| A throwaway experiment | `sandbox/` |
| Docs | `docs/` |

---

## 2. Cross-Language House Style

GBDCS deliberately uses **different surface conventions for Python
and TypeScript** so that each codebase looks idiomatic to readers
who come from its native ecosystem. The same rules are not stretched
across the divide — what is right in Python is not right in
TypeScript and vice-versa. The matrix below makes the split
explicit.

| Concern | Python | TypeScript / JS |
| --- | --- | --- |
| Quote style | **Single** (`'open_palm'`) | **Double** (`"open_palm"`) |
| Indentation | **Tab** | **2 spaces** |
| Line length | **100 chars** | Prettier default (80 chars) |
| Semicolons | Not applicable | **Omitted** (`semi: false`) |
| Trailing commas | Ruff default | **ES5-compatible** (arrays / objects only) |
| Naming | `snake_case` for fns/vars, `PascalCase` for classes (Ruff `N`) | `camelCase` for fns/vars, `PascalCase` for components/types |

If you write Python and your editor inserts double quotes or
spaces, **fix your editor — don't fight the formatter**. The same
applies in reverse when you cross into the frontend. The
configurations in §3 are the canonical source.

!!! warning "Don't `noqa` your way out"
    Per-line lint suppressions (`# noqa`, `// eslint-disable-next-line`)
    are reserved for cases where the lint rule is genuinely wrong —
    not as an escape hatch for inconvenient rules. Every suppression
    requires a one-line comment explaining why.

---

## 3. Language Configurations

The settings in this section are the **canonical, enforced** versions.
If this document and a config file ever disagree, the config file
wins and this document is the bug — open a PR to align it.

### 3.1 Python — Ruff (`pyproject.toml`)

The same Ruff configuration applies to both `apps/backend/` and
`services/`. The intent is *lint enough to catch real bugs, not
enough to opinionate on style*.

```toml
[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors — likely-broken code
    "F",   # pyflakes — logical errors, unused imports / vars
    "I",   # isort — import ordering
    "N",   # pep8-naming — Python naming conventions
]
ignore = ["E402"]   # module-level import not at top of file

[tool.ruff.format]
quote-style = "single"
indent-style = "tab"
```

**What you get:**

- **`E` + `F`** catch the bugs (undefined names, unused imports,
  syntax-likely-broken).
- **`I`** keeps the import block in a consistent shape — standard
  library, third-party, local — with one blank line between groups.
- **`N`** enforces `snake_case` / `PascalCase` / `UPPER_SNAKE_CASE`
  in the expected places.
- **`ignore = ["E402"]`** allows module-level imports to follow
  setup code where unavoidable (e.g. when `os.environ` must be set
  before importing a third-party library).
- **Tabs + single quotes** in `format` — the chosen house style.

**What you don't get** (by design): `B` (bugbear), `UP` (pyupgrade),
`S` (security). These were considered and rejected for Demo 2 to keep
the rule set small and uncontested; they may be revisited at the
Demo 2 retrospective.

**Local commands.** Both Python codebases expose the same Make
targets, so the workflow is identical wherever you are:

```bash
make install   # uv sync --all-groups
make lint      # ruff check (CI-format output)
make fix       # ruff check --fix && ruff format  (autofix + format)
make test      # pytest with coverage
```

### 3.2 Python — pytest (`pyproject.toml`)

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = [".", "../../services"]
```

- **`asyncio_mode = "auto"`** — every `async def test_…` is treated
  as an asyncio test automatically. No `@pytest.mark.asyncio`
  required.
- **`pythonpath`** — the backend can import `services.*` without
  installing them, which keeps inner-loop development fast.

The `services/` `pyproject.toml` adds two `filterwarnings` entries
to silence noise from `sre_parse` / `sre_constants` deprecations
upstream of us; new warning filters require justification in the
PR description.

### 3.3 Backend — FastAPI conventions

| Concern | Convention |
| --- | --- |
| Route modules | `apps/backend/app/routes/<area>.py` — one router per logical area (`auth`, `sessions`, `config`, …). |
| Route prefix | All REST under `/api/v1/`; all WebSocket under `/ws/`. See [`SAS.md` §4](SAS.md#4-api-contracts). |
| Path parameters | `snake_case` (`/sessions/{session_id}`). |
| Request / response models | Pydantic `BaseModel`, `PascalCase` class names, suffixed `Request` / `Response`. |
| Error envelope | Per [`SAS.md` §4.1](SAS.md#41-rest-api-apiv1) — `{error, cause, suggestion, request_id}` for every non-2xx response. |
| Dependency injection | FastAPI `Depends()` — never reach for module-level globals. |
| Async vs sync | Default to `async def` for routes; only use `def` if the handler genuinely never awaits. |

### 3.4 Services — adapter & strategy conventions

| Concern | Convention |
| --- | --- |
| Interface definition | Python `Protocol` from `typing`, defined in `services/<area>/__init__.py`. |
| Concrete implementations | One file per concrete class under `services/<area>/<area>_<flavour>.py` (e.g. `services/drone_control/adapters/tello_adapter.py`). |
| Selection | Concrete is selected at runtime by environment variable (`DRONE_ADAPTER=tello`); never by `if/elif` in the call site. |
| State enum | Adapters expose a `state` property returning one of `INIT / READY / FLYING / FAULT`; see the `DroneAdapter` Protocol in [`SAS.md` §4.3](SAS.md#43-droneadapter-interface). |
| Telemetry stream | `def telemetry(self) -> AsyncIterator[TelemetryFrame]` — yielded, never returned as a list. |

### 3.5 TypeScript — ESLint (`eslint.config.js`)

The frontend uses ESLint's **flat config** form. The active set is:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist', '**/*config*']),

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // …
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,   // type-aware checks
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error', { argsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
])
```

**What you get:**

- **`@eslint/js` recommended** — JavaScript correctness baseline.
- **`react-hooks` flat config recommended** — protects the rules of
  hooks (no conditional `useEffect`, exhaustive dependency arrays).
- **`react-refresh/vite`** — guards against hot-reload-breaking
  exports.
- **`typescript-eslint` recommended + `recommendedTypeChecked`** —
  type-aware lint passes (not just AST). Slower, but it catches
  bugs the AST-only set misses.
- **`no-explicit-any: 'warn'`** — `any` is allowed but flagged.
  Prefer `unknown` and narrow.
- **`no-unused-vars`** — unused args allowed only if prefixed `_`.

**What you don't get** (by design): an opinionated style preset
(Airbnb, Standard, etc.). Prettier (§3.6) handles all formatting.

**Local commands.**

```bash
yarn install --frozen-lockfile
yarn lint                  # eslint .
yarn format                # prettier --write src/
yarn format:check          # prettier --check src/
yarn test                  # playwright test
```

#### 3.5.1 Global ignore: `**/*config*`

The `globalIgnores` in the config excludes any file whose name
matches `*config*` from lint (e.g. `vite.config.ts`,
`playwright.config.ts`, `tailwind.config.js`). This is intentional:
build-tool configs use shapes ESLint cannot type-check against
their tool's runtime expectations.

**Caveat for contributors.** Don't name a production source file
something that contains `config` (e.g. `apiConfig.ts`) — it would be
silently exempt from lint. If a runtime module *must* be named that
way, opt it back in with a per-file override.

### 3.6 TypeScript — Prettier (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

- **`semi: false`** — no statement-terminating semicolons.
- **`singleQuote: false`** — use double quotes for string literals.
- **`tabWidth: 2`** — two-space indentation.
- **`trailingComma: "es5"`** — trailing commas in arrays/objects;
  not in function parameter lists (ES5 compatibility shape).

Prettier runs **after** ESLint via `eslint-config-prettier`, which
disables every ESLint stylistic rule that would conflict with
Prettier's formatting. There is no overlap by design — ESLint
catches bugs, Prettier handles shape.

### 3.7 TypeScript — `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "allowJs": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Notes for contributors:

- **`strict: true`** — every `strict*` flag is on. New `any` values
  become red squigglies in the editor.
- **`noUnusedLocals` / `noUnusedParameters`** — duplicates ESLint's
  rule at the compiler level so the build itself fails on dead code.
- **`@/*` path alias** — import from `@/components/Button` instead
  of `../../../components/Button`. Always prefer the alias when the
  relative path crosses two or more `..` segments.
- **`skipLibCheck: true`** — third-party `.d.ts` files are not
  re-checked; tradeoff is faster builds vs strict library-error
  surfacing.

The repo uses **TypeScript 6** — the last release written in
TypeScript itself, ahead of the Go-based 7.0. The team is not yet
adopting any TypeScript 7.0 preview features.

### 3.8 React / frontend conventions

| Concern | Convention |
| --- | --- |
| Component files | One component per file. `PascalCase.tsx` for components, `camelCase.ts` for hooks (`useGestureStream.ts`). |
| Exports | `export default` for the primary component; named exports for sibling utilities. |
| Hooks | All custom hooks live under `src/hooks/`; prefixed `use`. |
| State | Component-local state via `useState` / `useReducer`. Cross-component shared state goes through the existing context providers in `src/providers/` — not new globals. |
| Side effects | All `useEffect` calls must list every read dependency in the dependency array (enforced by `react-hooks` lint rule). |
| Forms | Validated client-side (`R16.3.1`) and re-validated server-side (`R16.3.2`). Use the existing `<FormField />` molecule rather than raw `<input>`. |
| Component composition | Atomic-design vocabulary already in use (`atoms/`, `molecules/`, `organisms/`). Components belong in the smallest layer that holds them. |
| Routing | `react-router-dom` v7. Route definitions live in `src/routes/` — see [`docs/frontend/routing.md`](frontend/routing.md). |

### 3.9 Tailwind — `tailwind.config.js`

The Tailwind theme is **extended**, not replaced. The extensions
mirror the design tokens in [`BRAND.md`](BRAND.md) §5 — colours,
spacing, radius, shadow, animations, backdrop-blur, opacity.

| Token in code | Source of truth |
| --- | --- |
| `bg-Red`, `bg-DarkRed`, `bg-LightRed`, `bg-OffWhite`, `bg-OffBlack`, `bg-Grey`, `bg-DarkGrey` | `tailwind.config.js → theme.extend.colors` ⇄ [`BRAND.md` §2.1](BRAND.md#21-core-palette) |
| `xs / sm / md / lg / xl` spacing | `theme.extend.spacing` ⇄ [`BRAND.md` §5.2](BRAND.md#52-spacing-scale) |
| `rounded-sm / md / lg / xl / 2xl / 3xl` | `theme.extend.borderRadius` ⇄ [`BRAND.md` §5.3](BRAND.md#53-radius) |
| `shadow-glass`, `shadow-glass-dark` | `theme.extend.boxShadow` ⇄ [`BRAND.md` §5.4](BRAND.md#54-shadow) |
| `backdrop-blur-md` etc. | `theme.extend.backdropBlur` |

**Dark mode** is class-based (`darkMode: 'class'`) — toggling theme
sets the `dark` class on `<html>`, not a media query. This honours
the persistence rule in `R16.2.2` (user choice over OS default).

**Fonts** in Tailwind: `font-sans` resolves to `Inter, Roboto`;
`font-display` resolves to `Geist, Inter, sans-serif`. Loading rules
are in [`BRAND.md` §3.1](BRAND.md#31-families).

---

## 4. General Naming &amp; Structure Rules

The rules below apply across both codebases unless stated otherwise.

### 4.1 Files and directories

- Names are lowercase with hyphens **only when the file represents a
  user-facing artefact** (a URL slug, a doc page). For source code,
  use the language's native convention (`snake_case.py`,
  `PascalCase.tsx`, `camelCase.ts`).
- One responsibility per file. If a file grows past ~300 lines, ask
  whether it has acquired a second responsibility.

### 4.2 Imports

- **Absolute imports first**, then relative imports, separated by a
  blank line. (Ruff's `I` rule + Prettier handle this automatically.)
- TypeScript: prefer `@/...` alias once a relative path crosses two
  or more `..` segments.
- No circular imports — the static import check in CI catches them.

### 4.3 Naming patterns

| Construct | Python | TypeScript |
| --- | --- | --- |
| Module / file | `snake_case.py` | `PascalCase.tsx` (component) / `camelCase.ts` (other) |
| Class / type | `PascalCase` | `PascalCase` |
| Function / variable | `snake_case` | `camelCase` |
| Constant | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| Boolean | Prefix with `is_` / `has_` / `should_` | Prefix with `is` / `has` / `should` |
| Private | Leading underscore (`_internal`) | Leading underscore (`_internal`) |

### 4.4 Comments

- Comments explain **why**, not what. The code already says what.
- Public functions / classes have a docstring (Python) or TSDoc
  block (TypeScript). One sentence is enough for most.
- Cite a requirement ID whenever the code implements one (`# R3.2.2:
  open-palm classifier confidence threshold`). This makes the
  traceability matrix in [`SRS.md` Appendix B](SRS.md#appendix-b--requirements-traceability-matrix)
  self-maintaining.

### 4.5 Error handling

- **Fail loudly during development, fail safely in production.**
  Domain errors raise typed exceptions in Python (`ValidationError`,
  `AdapterUnreachableError`) and discriminated unions in TypeScript.
- Don't swallow exceptions. If you must catch broadly, log the
  exception with context and re-raise — or follow the failsafe path
  defined in [`SRS.md` §3.2 R6](SRS.md#r6-failsafes--safety) (hover
  on uncertainty).
- Every user-visible error must include a `cause` and a `suggestion`
  per the envelope contract in [`SAS.md` §4.1](SAS.md#41-rest-api-apiv1)
  and the voice in [`BRAND.md` §9](BRAND.md#9-voice--tone).

### 4.6 Logging

- Use Python's `logging` module, not `print`.
- Log levels: `DEBUG` (verbose inner loop), `INFO` (lifecycle
  events), `WARNING` (recoverable anomaly), `ERROR` (failsafe trip
  or domain failure), `CRITICAL` (process is shutting down).
- Log lines are structured key-value where practical so the replay
  pipeline can grep them.

### 4.7 Configuration

- All configuration is loaded from environment variables (or
  `.env` for local dev).
- `.env.example` documents every required variable with a
  placeholder.
- **Never commit secrets** — see [`POLICY.md` §8](POLICY.md#8-test-data--privacy)
  and `R8.2`. A `gitleaks` scan is planned for Demo 2.

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

### 5.2 Commit messages

**Conventional Commits**, required by `R15.2`:

```
<type>(<scope>): <short summary>

<optional body>

Closes #<issue>
```

Types in use on this repo: `feat`, `fix`, `docs`, `test`, `ci`,
`revert`. Scopes match the codebase folders (`backend`, `frontend`,
`services`, `cv`, `recognizer`, `adapters`, `telemetry`, `docs`,
`ci`, `dependencies`).

Cite the requirement ID in the body whenever the commit clearly
implements one: `feat(recognizer): add open-palm gesture (R3.2.2)`.

### 5.3 Pull request title

The PR title is the Conventional-Commit subject of the merge commit
it will produce:

```
feat(recognizer): add open-palm gesture (R3.2.2)
```

The PR description follows the template in
[`GIT.md` §4.2](GIT.md#42-description-template). Lint must be green
before requesting review; tests must be green before merge.

### 5.4 Merge strategy

**Merge commit** (not squash, not rebase). Reasoning in
[`GIT.md` §4.4](GIT.md#44-merge-strategy). Intermediate
Conventional-Commit messages stay valuable in `git log`; the merge
commit itself is the integration boundary.

---

## 6. Definition of "Done" — How This Document Fits

A change is *done* when it satisfies every gate in
[`POLICY.md` §5](POLICY.md#5-acceptance-criteria) and
[`PLAN.md` §3](PLAN.md#3-definition-of-ready--definition-of-done).
The conventions in this document feed two of those gates directly:

| Gate | Where this doc helps |
| --- | --- |
| Lint passes | §3 — local commands match the CI commands exactly. Run them before you push. |
| Code review approval | §2 / §4 — reviewers check the change against the conventions here; if a rule is unclear they propose a change to this document. |

---

## 7. Updating This Document

This document is updated whenever a config in §3 changes, a
convention in §4 changes, or a reviewer raises the same point on
two PRs. The PR that changes the convention must also change the
documentation in the same commit — drift between them is a defect.

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0 | Demo 2 | Codex Merchants | Initial coding-standards document derived from the live `pyproject.toml`, `eslint.config.js`, `.prettierrc`, `tsconfig.json`, and `tailwind.config.js`. |