"""
Tracebility matrix maker instead of manually doing it, it can
update with live data instead

Every NFR harness write one JSON only file into ``docs/nfr/evidence/``, ``tests/nfr/report.py``
reads them all back and regenerates the tracebility matrix, so the actaul column in
the SAS is made and not manually
"""

from __future__ import annotations

import json
import os
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
EVIDENCE_DIR = REPO_ROOT / 'docs' / 'nfr' / 'evidence'


def machine_fingerprint() -> dict[str, Any]:
	"""
	Capture host spec, latency number without hardware attached proves nothing
	"""
	try:
		import psutil

		ram_gb = round(psutil.virtual_memory().total / 1024**3, 1)
	except Exception:
		ram_gb = None

	return {
		'os': f'{platform.system()} {platform.release()}',
		'arch': platform.machine(),
		'python': platform.python_version(),
		'logical_cores': os.cpu_count(),
		'ram_gb': ram_gb,
		'ci': bool(os.environ.get('CI')),
	}


def git_sha() -> str:
	try:
		out = subprocess.run(
			['git', 'rev-parse', '--short', 'HEAD'],
			capture_output=True,
			text=True,
			cwd=REPO_ROOT,
			check=True,
		)
		return out.stdout.strip()
	except Exception:
		return 'unknown'


def emit(
	qr_id: str,
	requirement: str,
	metric: str,
	actual: Any,
	target: Any,
	passed: bool,
	**extra: Any,
) -> Path:
	"""
	Write one evidence artefact and return its path
	"""
	EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
	payload = {
		'id': qr_id,
		'requirement': requirement,
		'metric': metric,
		'actual': actual,
		'target': target,
		'pass': passed,
		'recorded_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
		'commit': git_sha(),
		'machine': machine_fingerprint(),
		**extra,
	}
	path = EVIDENCE_DIR / f'{qr_id}.json'
	path.write_text(json.dumps(payload, indent=2) + '\n')
	return path


def percentiles(samples: list[float]) -> dict[str, float]:
	"""p50/p95/p99 from an unsorted list, nearest rank"""
	if not samples:
		raise ValueError('no samples')
	ordered = sorted(samples)

	def at(q: float) -> float:
		idx = min(len(ordered) - 1, int(round(q * len(ordered))) - 1)
		return round(ordered[max(idx, 0)], 3)

	return {
		'min': round(ordered[0], 3),
		'p50': at(0.50),
		'p95': at(0.95),
		'p99': at(0.99),
		'max': round(ordered[-1], 3),
	}
