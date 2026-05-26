# Project Plan

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Demo 2 sprint in flight</span>
  <span class="tx-status">Methodology · Agile (Scrum)</span>
  <span class="tx-status">Sprint cadence · 2 weeks</span>
</div>

!!! abstract "Document overview"
    This document captures *how* the Gesture-Based Drone Control System
    (GBDCS) is being delivered. It is built around **Agile** as the
    methodology and **Scrum** as the framework.

    The plan is the bridge between the [SRS](SRS.md) (*what* we are
    building) and the [Design](DESIGN.md) (*how* it is structured) — it
    answers *when* and *in what order*.

---

## 1. Methodology

### 1.1 Why Agile

The team adopts **Agile** because the problem is wicked in the 
sense: gesture recognition accuracy, drone-SDK behaviour, and operator
expectations cannot be fully specified up front and will be discovered
iteratively. The four values of the **Agile Manifesto** are
adopted verbatim — the team values the items on the left more than the
items on the right.

| We value | … over |
| --- | --- |
| Individuals and interactions | Processes and tools |
| Working software | Comprehensive documentation |
| Customer collaboration | Contract negotiation |
| Responding to change | Following a plan |

### 1.2 Why Scrum on top of Agile

Within Agile, the team uses **Scrum** as the operating framework — fixed
roles, fixed ceremonies, two-week time-boxes — because the project has
hard, externally-imposed milestones (the four COS 301 demos) that benefit
from short, predictable iterations.

### 1.3 Scrum values

The five Scrum values guide every decision the framework
itself does not cover:

<div class="tx-grid tx-grid--3" markdown>
<div class="tx-card" markdown>
**Commitment.** The team personally commits to the goals of each sprint and to the demo it leads to.
</div>
<div class="tx-card" markdown>
**Focus.** Each sprint locks scope. Mid-sprint additions go to the backlog, never to the sprint board.
</div>
<div class="tx-card" markdown>
**Openness.** Blockers, doubts, and unknowns are surfaced in standup the day they appear.
</div>
<div class="tx-card" markdown>
**Respect.** Every team member is treated as capable and independent. No silent rewrites of someone else's work.
</div>
<div class="tx-card" markdown>
**Courage.** The team raises hard problems early, including telling the mentor when a target will slip.
</div>
</div>

---

## 2. Scrum Setup

### 2.1 Roles

Three roles must be filled. The team's assignment:

| Role | Member | Why |
| --- | --- | --- |
| **Product Owner** | *TBD — rotates demo-to-demo, primary contact with EPI-USE mentor* | Owns the backlog and priorities; agrees Definition of Done with the team. |
| **Scrum Master and Dev** | Ayush Beekum | Strongest integration / cross-cutting experience; removes impediments and coaches the team on the process. |
| **Dev Team — Frontend lead** | Chinmayi Santhosh | UI / UX, PWA, Playwright / Jest / Vitest experience. |
| **Dev Team — Frontend + QA** | Diya Narotam | UI engineering and React/Tailwind background. |
| **Dev Team — DevOps & CV** | Shavir Vallabh | TechTeam at UP, DevOps and HPC experience; owns deployment, containerisation, and adapter integration with hardware.|
| **Dev Team — Infrastructure** | Jaitin Moodally | Homelab / multi-OS / low-level background;  owns the CI/CD pipeline and the CV/ML stack  |

Role boundaries are intentionally permeable — every dev contributes across
the stack and to testing 

### 2.2 Ceremonies

The team runs the full Scrum ceremony set on a two-week cadence.

```mermaid
flowchart LR
    P[Sprint Planning<br/>~2&nbsp;hrs · Mon&nbsp;Wk1] --> S1[Daily Standup<br/>15&nbsp;min · every&nbsp;day]
    S1 --> BR[Backlog Refinement<br/>~1&nbsp;hr · Wed&nbsp;Wk1]
    BR --> S2[Daily Standup<br/>continues]
    S2 --> SR[Sprint Review<br/>~45&nbsp;min · Fri&nbsp;Wk2]
    SR --> RETRO[Retrospective<br/>~45&nbsp;min · Fri&nbsp;Wk2]
    RETRO -.->|next sprint| P
```

*Figure 2.1 — The two-week Scrum cadence applied to GBDCS.*

| Ceremony | Length | Cadence | Purpose |
| --- | --- | --- | --- |
| Sprint Planning | ~2 hrs | Monday, Week 1 | Agree the sprint goal and pull stories from the product backlog into the sprint backlog. |
| Daily Standup | 15 min | Every weekday | "Yesterday / today / blockers." Asynchronous on Discord when the team can't meet live. |
| Backlog Refinement | ~1 hr | Wednesday, Week 1 | Clarify, size, and split upcoming PBIs before the next planning session. |
| Sprint Review | ~45 min | Friday, Week 2 | Demo the increment to the EPI-USE and academic mentors. |
| Retrospective | ~45 min | Friday, Week 2 | What worked, what didn't, what we commit to changing next sprint. |

### 2.3 Artifacts

Three artifacts are maintained.

- **Product Backlog** — the master list of every PBI for GBDCS
  (see [§4](#4-product-backlog)). Lives in the GitHub Project board.
- **Sprint Backlog** — the PBIs the team has pulled into the current
  sprint. Tracked as GitHub Issues with the `sprint-N` label.
- **Burndown Chart** — the open story-point total per day of the sprint
  (see [§7](#7-burndown--velocity)).

---

## 3. Definition of Ready &amp; Definition of Done

The Definition of Done is *agreed between the team and
the PO, realistic, within the team's control, short (5–8 items), well
understood, and visible*. Both DoR and DoD are pinned to the
GitHub Project board.

=== "Definition of Ready (DoR)"

    A backlog item is *Ready* to be pulled into a sprint when:

    1. It is written in the user-story format (As a … I want … so that …).
    2. It cites at least one requirement ID from the [SRS](SRS.md).
    3. It has at least one Given / When / Then acceptance criterion.
    4. It has been sized by the team (story-point estimate agreed).
    5. Its dependencies on other PBIs are listed.
    6. The team agrees it is small enough to complete inside one sprint
       (INVEST — *Small*).

=== "Definition of Done (DoD)"

    A backlog item is *Done* when:

    1. All acceptance criteria pass (manual + automated).
    2. Unit tests cover the new code at ≥ 80 % line coverage
       (per `R12.2`).
    3. Code has been reviewed and merged into `dev` via a pull request
       conforming to [`GIT.md`](GIT.md).
    4. CI is green on the merge commit (lint, type-check, test).
    5. The documentation site has been updated for any user-facing change.
    6. The PO (or mentor proxy) has accepted the change in the sprint
       review.

---

## 4. Product Backlog

Per L16 slide 4, the product backlog is the flat, prioritised list of
every PBI for the system. PBIs are derived directly from the SRS — each
maps to one or more `R` identifiers.

| # | PBI | Maps to | First targeted demo |
| --- | --- | --- | --- |
| PBI-01 | Hand tracking pipeline | `R3.1.*`, `R3.2.1` | Demo 1 |
| PBI-02 | Telemetry dashboard | `R1.1.3`, `R5.1.2` | Demo 1 |
| PBI-03 | AirSim simulator adapter | `R2.2`, `R8.2` | Demo 1 |
| PBI-04 | Base features (login, themes, form validation) | `R16.*` | Demo 1 |
| PBI-05 | Rule-based gesture recognition | `R3.2.2`, `R3.2.3`, `R8.3` | Demo 1 |
| PBI-06 | Gesture → command translation | `R4.*` | Demo 2 |
| PBI-07 | Real-drone adapter (Tello / xFly) | `R2.2`, `R5.*`, `R8.2` | Demo 2 |
| PBI-08 | Safety layer (idle, link loss, low battery, emergency stop) | `R5.2.*`, `R6.*` | Demo 2 |
| PBI-09 | Gesture overlay on dashboard feed | `R1.1.1`, `R1.1.2` | Demo 2 |
| PBI-10 | Command + telemetry persistence | `R6.3` | Demo 2 |

PBIs targeted at Demo 3 and Demo 4 will be added to the backlog as the
team approaches them. Per the Scrum value of **Focus** (L15 slide 4), the
team is not pre-planning work beyond the next demo.

---

## 5. Epics &amp; User Stories

The active backlog (PBI-05 through PBI-10) is broken down into epics
following the L16 slide 5 pattern, then into user stories using the
template from L15 slide 12 with Given / When / Then acceptance criteria.

### 5.1 Epic — Gesture Recognition (PBI-05, PBI-06)

!!! example "US-1 — Recognise the *Open Palm* gesture"
    **Story.**
    *As an operator, I want the system to recognise an open-palm gesture
    so that I can command the drone to hover.*

    **Value:** 40 &middot; **Size:** Medium &middot; **Maps to:** `R3.2.2`, `R4.1`

    **Acceptance criteria.**

    - **Given** the operator holds an open palm in view of the camera
      for ≥ 250 ms,
      **when** the pipeline classifies the frame,
      **then** the recognised gesture shall be `OPEN_PALM`.
    - **Given** the operator holds an ambiguous hand shape,
      **when** the classifier cannot meet the confidence threshold,
      **then** no command shall be issued (`R3.2.3`).
    - **Given** the lighting is below 200 lux,
      **when** the operator holds an open palm,
      **then** the dashboard shall surface a "low-light" warning
      (`R14.3`).

!!! example "US-2 — Recognise directional pointer gestures"
    **Story.**
    *As an operator, I want the system to distinguish pointer-left from
    pointer-right so that I can steer the drone horizontally.*

    **Value:** 30 &middot; **Size:** Medium &middot; **Maps to:** `R3.2.2`, `R4.1`

    **Acceptance criteria.**

    - **Given** the operator points the index finger left,
      **when** the pipeline classifies the frame,
      **then** the recognised gesture shall be `POINTER_LEFT`.
    - **Given** the operator points the index finger right,
      **then** the recognised gesture shall be `POINTER_RIGHT`.
    - **Given** the operator holds a fist (no extended finger),
      **then** neither pointer gesture shall be reported.

### 5.2 Epic — Command Translation (PBI-06)

!!! example "US-3 — Dispatch commands within latency budget"
    **Story.**
    *As an operator, I want my recognised gesture to translate into a
    drone command within 200 ms so that the drone feels responsive.*

    **Value:** 40 &middot; **Size:** Medium &middot; **Maps to:** `R4.3`, `R7.1`

    **Acceptance criteria.**

    - **Given** a gesture is recognised at time `t`,
      **when** the command translator dispatches the command,
      **then** the dispatch shall occur at `t + ≤ 200 ms` at the
      95th percentile.
    - **Given** a gesture maps to the same command as the previous frame,
      **when** the translator runs,
      **then** a duplicate command shall not be re-dispatched.

### 5.3 Epic — Real-Drone Adapter (PBI-07)

!!! example "US-4 — Plug a real drone in behind the existing interface"
    **Story.**
    *As a maintainer, I want the real-drone adapter to satisfy the same
    `DroneAdapter` interface as the simulator adapter so that the rest
    of the system requires no changes.*

    **Value:** 50 &middot; **Size:** Large &middot; **Maps to:** `R2.2`, `R8.2`

    **Acceptance criteria.**

    - **Given** the active adapter is switched from `airsim` to
      `tello` via the environment variable,
      **when** the system is launched,
      **then** the pipeline shall connect to the physical drone with no
      change to any non-adapter source file.
    - **Given** the physical drone is unreachable,
      **when** the adapter attempts to connect,
      **then** an error shall be surfaced on the dashboard and take-off
      shall be refused (`R6.2.2`, `R14.3`).

### 5.4 Epic — Safety Layer (PBI-08)

!!! example "US-5 — Hover on idle"
    **Story.**
    *As an operator, I want the drone to hover whenever I stop gesturing
    so that it never drifts on its own.*

    **Value:** 50 &middot; **Size:** Small &middot; **Maps to:** `R6.1.1`

    **Acceptance criteria.**

    - **Given** the drone is airborne,
      **when** no gesture is detected for more than 3 s,
      **then** the system shall issue `HOVER`.
    - **Given** the system has issued `HOVER` for idle,
      **when** the dashboard receives the event,
      **then** an *"Idle — hovering"* indicator shall be shown
      (`R6.1.2`).

!!! example "US-6 — Auto-land on low battery"
    **Story.**
    *As an operator, I want the drone to land itself when the battery
    drops below 15 % so that I do not have to react to it.*

    **Value:** 50 &middot; **Size:** Small &middot; **Maps to:** `R6.2.1`

    **Acceptance criteria.**

    - **Given** the drone reports battery < 15 %,
      **when** the telemetry frame is received,
      **then** an auto-land sequence shall be initiated and a critical
      alert raised on the dashboard (`R1.2.1`).

!!! example "US-7 — Heartbeat / link-loss hover"
    **Story.**
    *As an operator, I want the drone to hover automatically if the
    link drops so that it does not fly off uncontrolled.*

    **Value:** 40 &middot; **Size:** Small &middot; **Maps to:** `R5.2.1`, `R5.2.2`

    **Acceptance criteria.**

    - **Given** the drone adapter has sent no telemetry for > 2 s,
      **when** the heartbeat check runs,
      **then** the system shall command `HOVER` and surface a banner
      alert.

### 5.5 Epic — Dashboard Live View (PBI-09, PBI-10)

!!! example "US-8 — Live gesture overlay"
    **Story.**
    *As an operator, I want to see the MediaPipe skeleton drawn on the
    live feed so that I can tell whether the system is tracking my hand
    correctly.*

    **Value:** 20 &middot; **Size:** Small &middot; **Maps to:** `R1.1.1`

    **Acceptance criteria.**

    - **Given** the operator's hand is in frame,
      **when** the dashboard renders the feed,
      **then** the 21 landmark points and their connecting bones shall
      be drawn at no less than 24 FPS.

!!! example "US-9 — Persist a session for replay"
    **Story.**
    *As a reviewer, I want every command and telemetry frame to be
    logged so that I can replay a session afterwards.*

    **Value:** 25 &middot; **Size:** Medium &middot; **Maps to:** `R6.3`

    **Acceptance criteria.**

    - **Given** a session is active,
      **when** any command or telemetry frame is produced,
      **then** it shall be written to SQLite with an ISO-8601
      timestamp.

---

## 6. Demo Plan

### 6.1 Demo 1 — Foundations &nbsp;<small> Delivered</small>

| Goal | Demonstrate the system skeleton: tracking + telemetry + simulator adapter + base features. |
| --- | --- |
| **PBIs delivered** | PBI-01, PBI-02, PBI-03, PBI-04 |
| **Requirements satisfied** | `R3.1.*`, `R3.2.1`, `R1.1.3`, `R5.1.2`, `R2.2`, `R8.2`, `R16.*` |
| **Outcome** | Hand tracking, dashboard telemetry, AirSim adapter, and login/theme/validation features were all demonstrated. Mentor feedback called out documentation formatting — addressed in this round of rewrites. |

### 6.2 Demo 2 — Recognition, Real Drone, Safety &nbsp;<small> In flight</small>

| Goal | Close the loop: recognise gestures, send commands to a real drone through the existing adapter interface, and arm the safety layer. |
| --- | --- |
| **Sprint goal** | A live gesture demo on real hardware with the failsafes proven on stage. |
| **PBIs in scope** | PBI-05, PBI-06, PBI-07, PBI-08, PBI-09, PBI-10 |
| **Requirements newly satisfied** | `R3.2.2`, `R3.2.3`, `R4.*`, `R5.*`, `R6.*`, `R1.1.1`, `R1.1.2`, `R1.2.*`, `R8.3` |
| **Definition of Done (demo-level)** | Drone takes off, executes at least four distinct commands from gestures, hovers on idle, hovers on link loss, lands on low battery, and the session is reviewable in replay. |

### 6.3 Demos 3 &amp; 4 &nbsp;<small>To be planned</small>

Per the Scrum value of **Focus**, the team is not pre-planning these.
Backlog refinement at the end of the Demo 2 sprints will surface the
Demo 3 PBIs from the SRS requirements that are not yet satisfied (chiefly
the `R7.*` performance bar and the `R9.*` reliability bar). Demo 4 will
be planned at the close of Demo 3 in the same way.

---

## 7. Burndown &amp; Velocity

Two charts are tracked across the project, both per L15 slide 6 (artifacts).

### 7.1 Sprint burndown (Demo 2 sprint, current)

```mermaid
xychart-beta
    title "Demo 2 sprint — burndown"
    x-axis ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"]
    y-axis "Open story points" 0 --> 50
    line [50, 45, 45, 40, 36, 30, 26, 20, 12, 0]
```

*Figure 7.1 — Burndown for the current Demo 2 sprint. The straight line
from 50 → 0 over 10 working days is the ideal trajectory; the team's
actual line is plotted against it. Updated daily at standup.*

### 7.2 Velocity (story points per sprint)

```mermaid
xychart-beta
    title "Velocity per sprint"
    x-axis ["Sprint 1<br/>(Demo 1)","Sprint 2<br/>(Demo 2 wk 1-2)"]
    y-axis "Story points delivered" 0 --> 60
    bar [42, 0]
```

*Figure 7.2 — Velocity after Sprint 1 (Demo 1). Sprint 2 closes at the
end of the current cadence; the bar will be filled at the sprint review.
Velocity will guide commitment in subsequent sprints — the team will not
pull more story points into a sprint than the rolling average.*

!!! note "Live updates"
    These charts are illustrative snapshots committed to the repo. The
    live burndown and velocity for each sprint are tracked on the
    GitHub Project board and updated at every standup and sprint
    review.

---

## 8. Blockers &amp; Mitigations

| # | Blocker | Status | Mitigation |
| --- | --- | --- | --- |
| B1 | Real-drone SDK behaviour (xFly / Tello) differs from AirSim | Tracking | Adapter parity tests; vendor support thread open; `DummyDroneAdapter` covers offline development. |
| B2 | Telemetry-format divergence between AirSim and physical drone | Tracking | Shared `TelemetryFrame` schema in `packages/contracts`; per-adapter translators map vendor payloads to the schema. |
| B3 | Latency variability under load | Tracking | Bounded-queue pipeline (Design §4.4); CPU profile in CI; latency harness planned for Demo 3. |
| B4 | Time zone of EPI-USE mentor relative to academic mentor for joint reviews | Resolved | Sprint Review scheduled in a window that suits both. |

The Scrum Master logs every new impediment in the project board as it
surfaces in standup.

---

## 9. Buzzword Reference (GBDCS-specific)

A short reference of the terms used in this document, mapped to L15
slide 11 and to how they apply on GBDCS.

| Term | Slide-15 definition | What it looks like on GBDCS |
| --- | --- | --- |
| **PBI** | Product Backlog Item | A row in [§4](#4-product-backlog). |
| **Epic** | A large PBI broken into smaller stories | Each subsection of [§5](#5-epics--user-stories). |
| **User Story** | "As a … I want … so that …" | The `!!! example` blocks in §5. |
| **AC** | Given / When / Then conditions | The bullets inside each user story. |
| **DoR / DoD** | Definition of Ready / Definition of Done | [§3](#3-definition-of-ready--definition-of-done). |
| **Sprint** | Fixed 2-week time-box | The cadence in [§2.2](#22-ceremonies). |
| **Velocity** | Story points completed per sprint | [§7.2](#72-velocity-story-points-per-sprint). |
| **Story Points** | Relative effort estimate | The "Size" field on each user story (Small / Medium / Large). |
| **Impediment** | Anything blocking team progress | An entry in [§8](#8-blockers--mitigations). |
| **MVP** | Smallest thing that delivers real value | Demo 1 — hand tracking + telemetry + simulator. |
| **INVEST** | Independent · Negotiable · Valuable · Estimable · Small · Testable | Each story in §5 is checked against this before becoming Ready. |

---
