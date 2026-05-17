<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0ea5e9&height=200&section=header&text=Gesture-Based%20Drone%20Control&fontSize=36&fontColor=ffffff&fontAlignY=38&desc=Codex%20Merchants%20%C2%B7%20COS%20301%20%C2%B7%20EPI-USE%20%C2%B7%202026&descAlignY=58&descSize=14" width="100%"/>

<br/>

[![Build](https://img.shields.io/github/actions/workflow/status/codex-merchants/gesture-drone-control/ci.yml?style=for-the-badge&logo=github-actions&logoColor=white&label=BUILD&color=0ea5e9&labelColor=0d1117)](https://github.com/codex-merchants/gesture-drone-control/actions)
[![Coverage](https://img.shields.io/coveralls/github/codex-merchants/gesture-drone-control?style=for-the-badge&logo=coveralls&logoColor=white&label=COVERAGE&color=22d3a5&labelColor=0d1117)](https://coveralls.io)
[![Issues](https://img.shields.io/github/issues/codex-merchants/gesture-drone-control?style=for-the-badge&logo=github&logoColor=white&label=ISSUES&color=f43f5e&labelColor=0d1117)](https://github.com/codex-merchants/gesture-drone-control/issues)
[![Uptime](https://img.shields.io/uptimerobot/status/m000000000-xxxxxxxxxxxx?style=for-the-badge&logo=statuspage&logoColor=white&label=UPTIME&color=22d3a5&labelColor=0d1117)](https://uptimerobot.com)

<br/>

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white&labelColor=0d1117)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=0d1117)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0d1117)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white&labelColor=0d1117)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white&labelColor=0d1117)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square&labelColor=0d1117)](LICENSE)

</div>

<br/>

> A real-time computer vision system that eliminates the physical drone controller entirely. Hand gestures are detected through a live camera feed, classified by a dual rule-based and ML recognition engine, and translated directly into drone flight commands — with safety fail-safes built in.

<br/>

---

## ◈ Documentation

| Document | Link |
|---|---|
| ‣ Software Requirements Specification (SRS) | [View SRS →](docs/SRS.md) |
| ‣ Architecture & Design | [View Design →](docs/DESIGN.md) |
| ‣ API Reference | [View API →](docs/api/API_REFERENCE.md) |
| ‣ Testing Strategy | [View Testing →](docs/testing/TESTING.md) |
| ‣ CI/CD Pipeline | [View CI/CD →](docs/CICD.md) |
| ‣ Git Conventions | [View Git Guide →](docs/GIT.md) |
| ‣ GitHub Project Board | [View Board →](../../projects) |

---

## ◈ Team — Codex Merchants

<div align="center">

| Name | Student Number | GitHub | LinkedIn |
|:---|:---|:---:|:---:|
| Ayush Beekum | u23596351 | [![GitHub](https://img.shields.io/badge/Ayush--B99-0d1117?style=flat-square&logo=github)](https://github.com/Ayush-B99) | [![LinkedIn](https://img.shields.io/badge/Profile-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/ayush-beekum) |
| Jaitin Moodally | u23621372 | [![GitHub](https://img.shields.io/badge/Wave2055-0d1117?style=flat-square&logo=github)](https://github.com/Wave2055) | — |
| Shavir Vallabh | u23718146 | [![GitHub](https://img.shields.io/badge/ShavirV-0d1117?style=flat-square&logo=github)](https://github.com/ShavirV) | [![LinkedIn](https://img.shields.io/badge/Profile-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://za.linkedin.com/in/shavir-vallabh) |
| Diya Narotam | u23533596 | [![GitHub](https://img.shields.io/badge/deexglitch-0d1117?style=flat-square&logo=github)](https://github.com/deexglitch) | — |
| Chinmayi Santhosh | u24585671 | [![GitHub](https://img.shields.io/badge/ChinmayiSanthosh-0d1117?style=flat-square&logo=github)](https://github.com/ChinmayiSanthosh) | — |

✉ **Team Email:** [codexmerchants@gmail.com](mailto:codexmerchants@gmail.com)

</div>

---

## ◈ System Architecture

The system is structured across six integrated tiers, from raw hardware input through to deployed application and CI/CD automation.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tier 1  ·  Hardware Input                                          │
│           OpenCV  ·  xFly SDK  ·  DJI Tello SDK  ·  AirSim         │
├─────────────────────────────────────────────────────────────────────┤
│  Tier 2  ·  CV & Gesture Pipeline          [ Core Intelligence ]    │
│           MediaPipe Hands  ·  NumPy  ·  TFLite  ·  Asyncio          │
├─────────────────────────────────────────────────────────────────────┤
│  Tier 3  ·  Backend API                    [ Orchestration ]        │
│                   FastAPI  ·  SQLite  ·  Pytest                     │
├─────────────────────────────────────────────────────────────────────┤
│  Tier 4  ·  Frontend Dashboard             [ Command & Control ]    │
│               React + TypeScript  ·  Recharts  ·  Jest              │
├─────────────────────────────────────────────────────────────────────┤
│  Tier 5  ·  Application Deployment                                  │
│            Electron  ·  PWA / Capacitor  ·  Docker                  │
├─────────────────────────────────────────────────────────────────────┤
│  Tier 6  ·  DevOps & Docs                                           │
│            Git  ·  GitHub Actions  ·  SwaggerDocs  ·  Overleaf      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ◈ Repository Structure

```
gesture-drone-control/

 apps/ # Deployable application targets
 backend/ # FastAPI backend (REST + WebSocket)
 app/
 api/ # Route handlers & WebSocket gateway
 core/ # Config, startup, app factory
 dependencies/ # Dependency injection (auth, db, etc.)
 tests/ # Backend unit & integration tests (Pytest)

 desktop/ # Electron desktop wrapper (Win/Linux/macOS)

 frontend/ # React + TypeScript dashboard
 public/ # Static assets (favicon, icons)
 src/ # App source (components, pages, hooks)
 tests/ # Frontend E2E tests (Playwright)

 mobile/ # Capacitor mobile shell (iOS + Android)
 android/
 ios/

 services/ # Core Python service layer (shared logic)
 cv_pipeline/ # Computer vision & gesture recognition
 camera/ # Camera feed capture (OpenCV)
 gestures/ # Gesture engine & recognizers
 recognizers/ # Rule-based & ML-based recognizers
 hand-detection/ # MediaPipe hand landmark detection
 processing/ # Async queue & pipeline orchestration

 drone_control/ # Drone adapter & flight controller
 adapters/ # AirSim, Gazebo, xFly adapters

 input/ # Input source abstraction
 sources/ # Gesture, keyboard & generic adapters

 commands/ # Command model & dispatch logic

 telemetry/ # Telemetry observer, manager & storage
 storage/ # SQLite & PostgreSQL repositories

 tests/ # Service-layer tests
 cv_pipeline_testing/

 packages/ # Shared code across apps & services
 contracts/ # Shared schema definitions
 python/ # Pydantic schemas (schemas.py)
 typescript/ # TypeScript type definitions (types.ts)
 domain/ # Domain models (e.g. gesture.py)
 utils/ # Shared utility helpers

 infrastructure/ # Infrastructure & deployment config
 docker/ # Per-service Dockerfiles
 airsim/
 backend.Dockerfile
 frontend.Dockerfile
 scripts/ # Setup & utility shell scripts

 docs/ # All project documentation
 api/ # API reference docs
 assets/ # Diagrams, UI mockups, sequence diagrams
 Sequence Diagrams/
 UC Diagrams/
 UI/
 demo/ # Deployment & demo guides
 diagrams/ # DrawIO architecture diagrams
 reports/ # Tender & formal reports
 testing/ # Testing strategy documentation

 sandbox/ # Throwaway scripts & manual testing tools

 tests/ # Top-level integration tests
 integration/

 docker-compose.yml # Full-stack local orchestration
 makefile # Top-level dev shortcuts
 README.md
```

---

## ◈ Technology Stack

<details>
<summary><b>▸ Computer Vision & ML Backend</b></summary>
<br/>

| Technology | Purpose | Version |
|:---|:---|:---:|
| ![Python](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white) | Primary language — CV, ML, drone SDK | `3.11.x` |
| ![OpenCV](https://img.shields.io/badge/-OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white) | Live camera feed & image preprocessing | `4.8+` |
| ![MediaPipe](https://img.shields.io/badge/-MediaPipe-0097A7?style=flat-square&logo=google&logoColor=white) | Real-time hand landmark detection & tracking | `0.10+` |
| ![NumPy](https://img.shields.io/badge/-NumPy-013243?style=flat-square&logo=numpy&logoColor=white) | Vector math — angles, distances, gesture ID | `1.26+` |
| ![TFLite](https://img.shields.io/badge/-TensorFlow_Lite-FF6F00?style=flat-square&logo=tensorflow&logoColor=white) | ML-based gesture recognition (secondary) | `2.x` |
| Rule-Based Engine | Deterministic, zero-latency gesture mapping | Custom |
| Asyncio + Bounded Queue | Non-blocking real-time pipeline | Built-in |

</details>

<details>
<summary><b>▸ Drone Integration</b></summary>
<br/>

| Technology | Purpose | Version |
|:---|:---|:---:|
| xFly SDK | Primary physical drone communication | Latest |
| DJI Tello SDK | Alternative drone hardware interface | Latest |
| AirSim | Primary simulation environment (lightweight) | Latest |
| Gazebo + ArduPilot | High-fidelity physics simulation | `4.x` |

</details>

<details>
<summary><b>▸ Backend & Database</b></summary>
<br/>

| Technology | Purpose | Version |
|:---|:---|:---:|
| ![FastAPI](https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | REST + WebSocket API (ASGI) | `0.110+` |
| ![SQLite](https://img.shields.io/badge/-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) | Gesture logs, telemetry, command history | `3.x` |
| ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) | Scale-out alternative database | `15+` |
| ![Pytest](https://img.shields.io/badge/-Pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white) | Backend unit, integration & API testing | Latest |

</details>

<details>
<summary><b>▸ Frontend</b></summary>
<br/>

| Technology | Purpose | Version |
|:---|:---|:---:|
| ![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black) | Component-based UI framework | `18` |
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) | Static typing across the frontend | `5.x` |
| Recharts | Real-time telemetry & data visualisation | `2.x` |
| ![Jest](https://img.shields.io/badge/-Jest-C21325?style=flat-square&logo=jest&logoColor=white) | Frontend unit & component testing | Latest |
| Playwright | End-to-end browser testing | Latest |

</details>

<details>
<summary><b>▸ Deployment</b></summary>
<br/>

| Technology | Purpose | Version |
|:---|:---|:---:|
| ![Electron](https://img.shields.io/badge/-Electron-47848F?style=flat-square&logo=electron&logoColor=white) | Native desktop packaging (Win/Linux/macOS) | Latest |
| PWA + Capacitor | Cross-platform mobile delivery (iOS/Android) | Latest |
| ![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Containerisation — consistent environments | Latest |

</details>

<details>
<summary><b>▸ DevOps & Documentation</b></summary>
<br/>

| Technology | Purpose |
|:---|:---|
| ![GitHub Actions](https://img.shields.io/badge/-GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white) | CI/CD — automated testing, linting, quality gates |
| ![Git](https://img.shields.io/badge/-Git-F05032?style=flat-square&logo=git&logoColor=white) | Version control — trunk-based, `main / dev / feature/*` |
| SwaggerDocs | Auto-generated interactive API documentation |
| Overleaf | Formal written documentation (LaTeX) |

</details>

---

## ◈ Use Cases

| # | Use Case | Status |
|:---:|:---|:---:|
| UC-01 | User Registration & Login | ◆ Core |
| UC-02 | Live Hand Gesture Detection & Tracking | ◆ Core |
| UC-03 | Gesture → Drone Command Mapping | ◆ Core |
| UC-04 | Real-Time Dashboard (telemetry, status, feed) | ◆ Core |
| UC-05 | Safety Logic (hover on tracking loss, emergency stop) | ◆ Core |
| UC-06 | Manual Override (gesture → keyboard/controller) | ◇ Optional |
| UC-07 | Gesture Recording & Automated Playback | ◇ Optional |
| UC-08 | Idle Detection Auto-Land | ◇ Optional |
| UC-09 | Gesture-Activated Follow Mode | ◇ Optional |

---

## ◈ Getting Started

**Prerequisites**

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-optional-2496ED?style=flat-square&logo=docker&logoColor=white)

**Clone & install**

```bash
git clone https://github.com/codex-merchants/gesture-drone-control.git
cd gesture-drone-control

# Backend
cd apps/backend && pip install -r requirements.txt

# Services layer
cd ../../services && pip install -e .

# Frontend
cd ../apps/frontend && yarn install
```

**Run locally**

```bash
# Terminal A — backend API
cd apps/backend && uvicorn app.main:app --reload

# Terminal B — frontend dashboard
cd apps/frontend && yarn dev
```

**Or with Docker (recommended)**

```bash
docker-compose up --build
```

**Run tests**

```bash
# Backend (from apps/backend)
pytest

# Services layer (from services/)
pytest

# Frontend (from apps/frontend)
yarn test # Jest unit tests
yarn playwright # E2E tests
```

---

## ◈ Branching Strategy

Trunk-based development. The `main` branch must always be in a deployable state — all merges happen before each demo.

| Branch | Purpose |
|:---|:---|
| `main` | Production. Protected. Merged into before every demo. |
| `dev` | Integration. Completed features land here before main. |
| `feature/<name>` | Short-lived. One branch per feature or fix, branched from `dev`. |

> [!IMPORTANT]
> **All commits must use system-installed Git via the CLI.** Graphical clients (GitHub Desktop, GitKraken) are not permitted under COS 301 regulations — they can break commit tracking. Untracked contributions are non-recoverable.
>
> ```bash
> git config --global user.name "your-github-username"
> git config --global user.email "your@email.com"
> ```

---

## ◈ CI/CD & Code Quality

| Tool | Badge |
|:---|:---|
| Build (GitHub Actions) | [![Build](https://img.shields.io/github/actions/workflow/status/codex-merchants/gesture-drone-control/ci.yml?style=flat-square&logo=github-actions&logoColor=white&labelColor=0d1117)](https://github.com/codex-merchants/gesture-drone-control/actions) |
| Code Coverage (Coveralls) | [![Coverage](https://img.shields.io/coveralls/github/codex-merchants/gesture-drone-control?style=flat-square&logo=coveralls&labelColor=0d1117)](https://coveralls.io) |
| Issues | [![Issues](https://img.shields.io/github/issues/codex-merchants/gesture-drone-control?style=flat-square&logo=github&labelColor=0d1117)](https://github.com/codex-merchants/gesture-drone-control/issues) |
| Uptime | [![Uptime](https://img.shields.io/uptimerobot/status/m000000000-xxxxxxxxxxxx?style=flat-square&labelColor=0d1117)](https://uptimerobot.com) |

---

## ◈ AI Usage Policy

All contributors must have the **COS301 VibeCheck** tool active during development. This monitors AI-assisted code generation to ensure transparency.

> [!WARNING]
> **Vibe coding is strictly prohibited.** Generating large portions of code using AI without clear understanding, validation, or meaningful contribution results in **zero marks** for the affected work. Every team member must be able to explain, justify, and maintain any code they submit.

---

## ◈ Constraints

| Constraint | Detail |
|:---|:---|
| ▸ Single-User Operation | One operator tracked at a time — reduces tracking complexity |
| ▸ Indoor Only | Designed and tested for indoor, controlled-lighting environments |
| ▸ Fixed Gesture Set | Predefined commands only (take-off, land, move, hover) |

---

## ◈ Contact

| Role | Name | Email |
|:---|:---|:---|
| ▸ Project Owner | Bryan Janse Van Vuuren | [bryan.janse.van.vuuren@epiuse.com](mailto:bryan.janse.van.vuuren@epiuse.com) |
| ▸ Project Mentor | Cameron Taberer | [cameron.taberer@epiuse.com](mailto:cameron.taberer@epiuse.com) |
| ▸ Team | Codex Merchants | [codexmerchants@gmail.com](mailto:codexmerchants@gmail.com) |

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0ea5e9&height=100&section=footer" width="100%"/>

*COS 301 Software Engineering · University of Pretoria · 2026 · EPI-USE*

</div>
