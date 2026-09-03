"""
A green PR must reach production within 30 minutes

Usage:
    GITHUB_TOKEN=ghp_xxx run python tests/nfr/maintainability/qr12_deply_lead_time.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from tests.nfr._support.evidence import emit, percentiles  # noqa: E402

REPO = 'COS301-SE-2026/Gesture-Based-Drone-Control'
WORKFLOW = 'release.yml'
BRANCH = 'main'
TARGET_MINUTES = 30.0


def api(path: str, token: str) -> dict:
	req = Request(
		f'https://api.github.com{path}',
		headers={
			'Accept': 'application/vnd.github+json',
			'Authorization': f'Bearer {token}',
			'X-GitHub-Api-Version': '2022-11-28',
		},
	)
	with urlopen(req, timeout=30) as resp:
		return json.load(resp)


def parse(ts: str) -> datetime:
	return datetime.fromisoformat(ts.replace('Z', '+00:00'))


def main() -> int:
	ap = argparse.ArgumentParser()
	ap.add_argument('--runs', type=int, default=20)
	args = ap.parse_args()

	token = os.environ.get('GITHUB_TOKEN')
	if not token:
		print('GITHUB_TOKEN is required (repo:read scope)', file=sys.stderr)
		return 2

	data = api(
		f'/repos/{REPO}/actions/workflows/{WORKFLOW}/runs'
		f'?branch={BRANCH}&status=success&per_page={args.runs}',
		token,
	)

	durations: list[float] = []
	rows: list[dict] = []
	for run in data.get('workflow_runs', []):
		commit = api(f'/repos/{REPO}/commits/{run["head_sha"]}', token)
		merged_at = parse(commit['commit']['committer']['date'])
		deployed_at = parse(run['updated_at'])
		minutes = (deployed_at - merged_at).total_seconds() / 60
		if minutes < 0:
			continue
		durations.append(minutes)
		rows.append(
			{
				'sha': run['head_sha'][:7],
				'merged_at': merged_at.isoformat(),
				'deployed_at': deployed_at.isoformat(),
				'lead_time_min': round(minutes, 1),
			}
		)

	if not durations:
		print('no successful release runs found on main', file=sys.stderr)
		return 1

	pct = percentiles(durations)
	passed = pct['p95'] <= TARGET_MINUTES

	emit(
		'QR-12',
		'NFR4.3',
		'merge-to-deploy lead time, p95 (min)',
		actual=pct['p95'],
		target=f'<= {TARGET_MINUTES}',
		passed=passed,
		runs_sampled=len(durations),
		percentiles_min=pct,
		runs=rows,
	)

	print(f'p50 {pct["p50"]} min | p95 {pct["p95"]} min | n={len(durations)}')
	return 0 if passed else 1


if __name__ == '__main__':
	raise SystemExit(main())
