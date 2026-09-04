"""
Shared helpers for NFR suite
"""

from __future__ import annotations

import csv
import json
import os
import platform
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.cv_pipeline.hand_detection.mediapipe_detector import (
	DetectedHand,
	Handedness,
	HandLandmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = REPO_ROOT / 'docs' / 'nfr' / 'evidence'
DATASET = (
	REPO_ROOT
	/ 'services'
	/ 'cv_pipeline'
	/ 'gestures'
	/ 'ml_training'
	/ 'data'
	/ 'gesture_samples.csv'
)

VOCABULARY = ('FIST', 'OPEN_PALM', 'ONE_FINGER', 'TWO_FINGERS', 'THREE_FINGERS', 'FOUR_FINGERS')


def load_dataset() -> tuple[list[list[float]], list[str]]:
	features: list[list[float]] = []
	labels: list[str] = []
	with DATASET.open(newline='') as fh:
		for row in csv.DictReader(fh):
			features.append([float(row[f'f{i}']) for i in range(63)])
			labels.append(row['label'].strip().upper())
	return features, labels


def hand(features: list[float], handedness: Handedness = Handedness.RIGHT) -> DetectedHand:
	landmarks = [
		HandLandmark(x=features[i * 3], y=features[i * 3 + 1], z=features[i * 3 + 2])
		for i in range(21)
	]
	return DetectedHand(handedness=handedness, landmarks=landmarks, confidence=0.95)


def emit(
	qr_id: str, requirement: str, metric: str, actual: Any, target: Any, passed: bool, **extra
):
	EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
	payload = {
		'id': qr_id,
		'requirement': requirement,
		'metric': metric,
		'actual': actual,
		'target': target,
		'pass': passed,
		'recorded_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
		'machine': f'{platform.system()} {platform.machine()}, {os.cpu_count()} cores',
		**extra,
	}
	(EVIDENCE_DIR / f'{qr_id}.json').write_text(json.dumps(payload, indent=2) + '\n')


def p95(values: list[float]) -> float:
	ordered = sorted(values)
	idx = max(0, min(len(ordered) - 1, round(0.95 * len(ordered)) - 1))
	return ordered[idx]
