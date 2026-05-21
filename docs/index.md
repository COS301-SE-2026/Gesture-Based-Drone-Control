---
hide:
  - navigation
  - toc
---

<div class="tx-hero">
  <div class="tx-hero__eyebrow">Codex Merchants · COS 301 · 2026</div>
  <h1>Gesture-Based<br><em>Drone Control</em></h1>
  <p class="tx-hero__sub">
    Hand gestures detected through a live camera feed, classified by a dual rule-based and ML engine,
    translated directly into drone flight commands — no physical controller required.
  </p>
  <div class="tx-hero__actions">
    <a href="SRS/" class="tx-btn tx-btn--primary">Get Started →</a>
    <a href="https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control" class="tx-btn tx-btn--secondary">GitHub ↗</a>
  </div>
</div>

<div class="tx-grid tx-grid--3">
  <div class="tx-card">
    <div class="tx-card__label">Core Intelligence</div>
    <h3>Dual Recognition Engine</h3>
    <p>MediaPipe 21-point landmark detection feeding a rule-based classifier and TFLite ML model.</p>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">Real-Time Pipeline</div>
    <h3>Millisecond Latency</h3>
    <p>Live camera → gesture classification → command translation → drone. FastAPI WebSocket backend.</p>
  </div>
  <div class="tx-card">
    <div class="tx-card__label">Safety First</div>
    <h3>Built-In Fail-Safes</h3>
    <p>Hover on tracking loss, emergency stop gesture, idle detection auto-land — active by default.</p>
  </div>
</div>