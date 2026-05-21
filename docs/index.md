---
hide:
  - navigation
  - toc
---

<div class="tx-hero">
  <div class="tx-hero__eyebrow">Codex Merchants · COS 301 · 2026</div>
  <h1>Gesture-Based<br><em>Drone Control</em></h1>
  <p class="tx-hero__sub">
    A real-time computer-vision system that eliminates the physical controller entirely.
    Hand gestures detected through a live camera feed, classified by a dual rule-based and ML engine,
    translated directly into flight commands — with safety fail-safes built in from the ground up.
  </p>
  <div class="tx-badges">
    <span class="tx-status"><span class="tx-status__dot"></span>Demo 1 Delivered</span>
  </div>
  <div class="tx-hero__badges">
    [![Test](https://img.shields.io/github/actions/workflow/status/COS301-SE-2026/Gesture-Based-Drone-Control/test.yml?style=flat-square&logo=github-actions&logoColor=F5F3F4&label=TEST&color=A4161A&labelColor=161A1D)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/test.yml)
    [![Lint](https://img.shields.io/github/actions/workflow/status/COS301-SE-2026/Gesture-Based-Drone-Control/lint.yml?style=flat-square&logo=github-actions&logoColor=F5F3F4&label=LINT&color=BA181B&labelColor=161A1D)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/lint.yml)
    [![Docs](https://img.shields.io/github/actions/workflow/status/COS301-SE-2026/Gesture-Based-Drone-Control/docs.yml?style=flat-square&logo=readthedocs&logoColor=F5F3F4&label=DOCS&color=A4161A&labelColor=161A1D)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/docs.yml)
    [![Issues](https://img.shields.io/github/issues/COS301-SE-2026/Gesture-Based-Drone-Control?style=flat-square&logo=github&logoColor=F5F3F4&label=ISSUES&color=E5383B&labelColor=161A1D)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/issues)
    [![License](https://img.shields.io/badge/LICENSE-MIT-660708?style=flat-square&labelColor=161A1D)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/blob/main/LICENSE)
  </div>
  <div class="tx-hero__actions">
    <a href="SRS/" class="tx-btn tx-btn--primary">Read the SRS →</a>
    <a href="https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control" class="tx-btn tx-btn--secondary">GitHub ↗</a>
  </div>
</div>

<div class="tx-divider">
  <div class="tx-divider__line"></div>
  <div class="tx-divider__label">Core Capabilities</div>
  <div class="tx-divider__line"></div>
</div>

<div class="tx-grid tx-grid--3">
  <div class="tx-card">
    <div class="tx-card__icon">🧠</div>
    <div class="tx-card__label">Core Intelligence</div>
    <h3>Dual Recognition Engine</h3>
    <p>MediaPipe-driven 21-point landmark detection feeding a rule-based classifier and a TFLite ML model over an asyncio-bounded queue.</p>
    <a href="DESIGN/" class="tx-card__link">Architecture →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__icon">⚡</div>
    <div class="tx-card__label">Real-Time Pipeline</div>
    <h3>Millisecond Latency</h3>
    <p>Live camera feed → 21-point detection → gesture classification → command translation → drone. FastAPI WebSocket backend, React telemetry dashboard.</p>
    <a href="api/API_REFERENCE/" class="tx-card__link">API Reference →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__icon">🛡️</div>
    <div class="tx-card__label">Safety First</div>
    <h3>Built-In Fail-Safes</h3>
    <p>Hover on tracking loss, emergency stop gesture, idle detection auto-land, and a full telemetry observer chain — all active by default.</p>
    <a href="testing/TESTING/" class="tx-card__link">Testing strategy →</a>
  </div>
</div>

<div class="tx-divider">
  <div class="tx-divider__line"></div>
  <div class="tx-divider__label">Documentation</div>
  <div class="tx-divider__line"></div>
</div>

<div class="tx-grid">
  <div class="tx-card">
    <div class="tx-card__label">01 · Requirements</div>
    <h3>Software Requirements Specification</h3>
    <p>Functional requirements, use cases, domain model, and quality attributes for the full system.</p>
    <a href="SRS/" class="tx-card__link">Open SRS →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">02 · Architecture</div>
    <h3>Design & Wireframes</h3>
    <p>Brand style guide, component wireframes, architectural patterns, and system diagrams.</p>
    <a href="DESIGN/" class="tx-card__link">Open Design →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">03 · API</div>
    <h3>API Reference</h3>
    <p>REST and WebSocket contracts, request/response schemas, and annotated examples.</p>
    <a href="api/API_REFERENCE/" class="tx-card__link">Open API Docs →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">04 · Testing</div>
    <h3>Testing Strategy</h3>
    <p>Unit, integration, and E2E coverage approach — Pytest for backend, Jest for frontend.</p>
    <a href="testing/TESTING/" class="tx-card__link">Open Testing →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">05 · DevOps</div>
    <h3>CI/CD Pipeline</h3>
    <p>GitHub Actions workflows, quality gates, linting, and automated docs deployment.</p>
    <a href="CICD/" class="tx-card__link">Open CI/CD →</a>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">06 · Standards</div>
    <h3>Git Conventions</h3>
    <p>Branching strategy, commit format, PR rules, and feature-driven development workflow.</p>
    <a href="GIT/" class="tx-card__link">Open Git Conventions →</a>
  </div>
</div>

<div class="tx-divider">
  <div class="tx-divider__line"></div>
  <div class="tx-divider__label">The Team · Codex Merchants</div>
  <div class="tx-divider__line"></div>
</div>

<div class="tx-team">
  <div class="tx-member">
    <img src="https://github.com/Ayush-B99.png?size=120" alt="Ayush Beekum"/>
    <div class="tx-member__name">Ayush Beekum</div>
    <div class="tx-member__role">Team Lead · Full Stack</div>
    <div class="tx-member__id">u23596351</div>
    <div class="tx-member__links">
      <a href="https://github.com/Ayush-B99">GH</a>
      <a href="https://linkedin.com/in/ayush-beekum">LI</a>
    </div>
  </div>
  <div class="tx-member">
    <img src="https://github.com/ShavirV.png?size=120" alt="Shavir Vallabh"/>
    <div class="tx-member__name">Shavir Vallabh</div>
    <div class="tx-member__role">AI · Optimization · HPC</div>
    <div class="tx-member__id">u23718146</div>
    <div class="tx-member__links">
      <a href="https://github.com/ShavirV">GH</a>
      <a href="https://za.linkedin.com/in/shavir-vallabh">LI</a>
    </div>
  </div>
  <div class="tx-member">
    <img src="https://github.com/Wave2055.png?size=120" alt="Jaitin Moodally"/>
    <div class="tx-member__name">Jaitin Moodally</div>
    <div class="tx-member__role">Systems · DevOps · Low Level</div>
    <div class="tx-member__id">u23621372</div>
    <div class="tx-member__links">
      <a href="https://github.com/Wave2055">GH</a>
    </div>
  </div>
  <div class="tx-member">
    <img src="https://github.com/u23547747.png?size=120" alt="Team Member 4"/>
    <div class="tx-member__name">Team Member 4</div>
    <div class="tx-member__role">Role TBC</div>
    <div class="tx-member__id">u23547747</div>
    <div class="tx-member__links">
      <a href="https://github.com/COS301-SE-2026">GH</a>
    </div>
  </div>
  <div class="tx-member">
    <img src="https://github.com/u23547747.png?size=120" alt="Team Member 5"/>
    <div class="tx-member__name">Team Member 5</div>
    <div class="tx-member__role">Role TBC</div>
    <div class="tx-member__id">u2xxxxxxx</div>
    <div class="tx-member__links">
      <a href="https://github.com/COS301-SE-2026">GH</a>
    </div>
  </div>
</div>

!!! tip "Fill in the team details"
    Replace the placeholder members above with the actual names, student numbers, GitHub handles, and LinkedIn URLs from your README.

<div class="tx-divider">
  <div class="tx-divider__line"></div>
  <div class="tx-divider__label">In Partnership With</div>
  <div class="tx-divider__line"></div>
</div>

<div class="tx-partners">
  <div class="tx-partner">
    <a href="https://www.up.ac.za/">
      <img src="assets/up-logo.svg" alt="University of Pretoria"/>
    </a>
    <div class="tx-partner__type">Academic Host</div>
    <div class="tx-partner__desc">COS 301 Software Engineering · Faculty of EBIT</div>
  </div>
  <div class="tx-partner">
    <a href="https://www.epiuselabs.com/">
      <img src="assets/epiuse-logo.svg" alt="EPI-USE Labs"/>
    </a>
    <div class="tx-partner__type">Industry Sponsor & Client</div>
    <div class="tx-partner__desc">Project owner and mentorship</div>
  </div>
</div>