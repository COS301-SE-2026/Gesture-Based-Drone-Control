"""
Shared helpers for NFR suite
"""

from __future__ import annotations

import csv
import json
import os
import platform
import statistics
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from services.cv_pipeline.hand_detection.mediapipe_detector import (
	DetectedHand,
	Handedness,
	HandLandmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = REPO_ROOT / 'docs' / 'nfr' / 'evidence'
RAW_DIR = EVIDENCE_DIR / 'raw'
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

MAX_RAW_ROWS = 5000


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


def mirrored_hand(features: list[float]) -> DetectedHand:
	"""Same pose shwon by other hand"""
	landmarks = [
		HandLandmark(x=1.0 - features[i * 3], y=features[i * 3 + 1], z=features[i * 3 + 2])
		for i in range(21)
	]
	return DetectedHand(handedness=Handedness.LEFT, landmarks=landmarks, confidence=0.95)


def _git(*args: str) -> str | None:
	try:
		out = subprocess.run(
			['git', *args], cwd=REPO_ROOT, capture_output=True, text=True, timeout=5
		)
	except (OSError, subprocess.SubprocessError):
		return None
	return out.stdout.strip() or None


def run_context() -> dict[str, Any]:
	"""Where and when a ,easuremnt was take, so a reader can jduge it"""
	ctx: dict[str, Any] = {
		'machine': f'{platform.system()} {platform.machine()}, {os.cpu_count()} cores',
		'python': platform.python_version(),
		'commit': (os.getenv('GITHUB_SHA') or _git('rev-parse', 'HEAD') or 'unknown')[:10],
		'branch': os.getenv('GITHUB_HEAD_REF')
		or os.getenv('GITHUB_REF_NAME')
		or _git('rev-parse', '--abbrev-ref', 'HEAD')
		or 'unknown',
	}
	if os.getenv('GITHUB_RUN_ID'):
		server = os.getenv('GITHUB_SERVER_URL', 'https://github.com')
		ctx['ci_run'] = (
			f'{server}/{os.getenv("GITHUB_REPOSITORY")}/actions/runs/{os.getenv("GITHUB_RUN_ID")}'
		)
		ctx['runner'] = 'github-actions'
	else:
		ctx['runner'] = 'local'
	return ctx


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
		**run_context(),
		**extra,
	}
	(EVIDENCE_DIR / f'{qr_id}.json').write_text(json.dumps(payload, indent=2) + '\n')


def write_samples(qr_id: str, columns: dict[str, Iterable[Any]]) -> None:
	"""Raw measurements as CSV"""
	RAW_DIR.mkdir(parents=True, exist_ok=True)
	names = list(columns)
	series = [list(v) for v in columns.values()]
	rows = max((len(s) for s in series), default=0)
	stride = max(1, -(-rows // MAX_RAW_ROWS))
	with (RAW_DIR / f'{qr_id}.csv').open('w', newline='') as fh:
		writer = csv.writer(fh, lineterminator='\n')
		writer.writerow(names)
		for i in range(0, rows, stride):
			writer.writerow([_fmt(s[i]) if i < len(s) else '' for s in series])


def _fmt(value: Any) -> Any:
	return round(value, 4) if isinstance(value, float) else value


def percentile(values: list[float], pct: float) -> float:
	"""Nearest rank percentile"""
	if not values:
		return 0.0
	ordered = sorted(values)
	idx = max(0, min(len(ordered) - 1, round(pct / 100 * len(ordered)) - 1))
	return ordered[idx]


def p95(values: list[float]) -> float:
	return percentile(values, 95)


def summarize(values: list[float], digits: int = 3) -> dict[str, float]:
	if not values:
		return {'n': 0}
	return {
		'n': len(values),
		'min': round(min(values), digits),
		'mean': round(statistics.fmean(values), digits),
		'p50': round(percentile(values, 50), digits),
		'p95': round(percentile(values, 95), digits),
		'p99': round(percentile(values, 99), digits),
		'max': round(max(values), digits),
	}
