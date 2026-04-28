[![Lint Status](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/lint.yml/badge.svg)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/lint.yml)

[![Test Status](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/test.yml/badge.svg)](https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/actions/workflows/test.yml)
## Project Structure


``` bash
├── README.md
├── apps
│   ├── backend
│   │   ├── app
│   │   │   ├── api
│   │   │   ├── core
│   │   │   ├── dependencies
│   │   │   └── main.py
│   │   └── tests
│   ├── desktop
│   │   ├── main.js
│   │   ├── package.json
│   │   └── preload.js
│   ├── frontend
│   │   ├── package.json
│   │   ├── public
│   │   │   ├── manifest.json
│   │   │   └── service-worker.js
│   │   └── src
│   │       ├── components
│   │       ├── hooks
│   │       ├── pages
│   │       ├── services
│   │       └── state
│   └── mobile
│       ├── android
│       ├── capacitor.config.ts
│       └── ios
├── docker-compose.yml
├── docs
│   ├── api
│   ├── demo
│   ├── diagrams
│   └── reports
│       └── tender.pdf
├── infrastructure
│   ├── docker
│   │   ├── backend.Dockerfile
│   │   └── frontend.Dockerfile
│   └── scripts
├── packages
│   ├── api-contracts
│   ├── contracts
│   │   ├── python
│   │   │   └── schemas.py
│   │   └── typescript
│   │       └── types.ts
│   ├── domain
│   │   └── models
│   │       └── gesture.py
│   └── utils
├── services
│   ├── cv-pipeline
│   │   ├── camera
│   │   │   └── camera_feed.py
│   │   ├── gestures
│   │   │   ├── gesture_engine.py
│   │   │   └── recognizers
│   │   │       ├── gesture_recognizer.py
│   │   │       ├── ml_based.py
│   │   │       └── rule_based.py
│   │   ├── hand-detection
│   │   │   └── mediapipe_detector.py
│   │   └── processing
│   │       ├── async_queue.py
│   │       └── pipeline.py
│   ├── drone-control
│   │   ├── adapters
│   │   │   ├── airsim.py
│   │   │   ├── drone_adapter.py
│   │   │   ├── gazebo.py
│   │   │   └── xfly.py
│   │   ├── command
│   │   │   └── translator.py
│   │   └── controller.py
│   └── telemetry
│       ├── manager.py
│       ├── observer.py
│       └── storage
│           └── storage
│               ├── postgres_repo.py
│               └── sqlite_repo.py
└── tests
    └── integration

51 directories, 34 files
```
