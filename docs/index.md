---
hide:
  - toc
---

# Gesture-Based Drone Control

A real-time computer-vision system that eliminates the physical controller entirely. Hand gestures detected through a live camera feed, classified by a dual rule-based and ML engine, translated directly into drone flight commands — with safety fail-safes built in from the ground up.

[Get Started](SRS/){ .md-button .md-button--primary } &nbsp; [GitHub ↗](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control){ .md-button }

---

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