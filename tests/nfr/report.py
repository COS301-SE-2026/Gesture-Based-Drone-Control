"""
Regenerate the NFR traceability matrix and the evidence page from the evidence
JSON files. Never edit the outputs by hand; the numbers must come from a run.

Run after the suites:  python tests/nfr/report.py

Writes
  docs/nfr/MATRIX.md the traceability matrix (included in NFR.md)
  docs/nfr/EVIDENCE.md one section per requirement: method, numbers,
  distribution, chart, screenshots, findings, and links to the test source and raw data
  docs/nfr/evidence/charts/*.svg  charts drawn from docs/nfr/evidence/raw/*.csv
  $GITHUB_STEP_SUMMARY the matrix on the CI run page, when in Actions
"""

from __future__ import annotations

import csv
import html
import json
import math
import os
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS = REPO_ROOT / 'docs' / 'nfr'
EVIDENCE_DIR = DOCS / 'evidence'
RAW_DIR = EVIDENCE_DIR / 'raw'
CHART_DIR = EVIDENCE_DIR / 'charts'
MATRIX = DOCS / 'MATRIX.md'
EVIDENCE_PAGE = DOCS / 'EVIDENCE.md'

REPO_URL = 'https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control'
PY_TESTS = 'tests/nfr'
UI_TESTS = 'apps/frontend/tests/nfr'

# group -> id -> (SRS ref, quantified requirement, tactic, test file, informational?)
GROUPS: dict[str, dict[str, tuple[str, str, str, str, bool]]] = {
	'NFR1 Performance': {
		'QR-03': (
			'NFR1.1',
			'Recognition p95 < 50 ms (rule)',
			'Pure-geometry classifier',
			'test_latency.py',
			False,
		),
		'QR-25': (
			'NFR1.1',
			'Recognition p95 < 50 ms (ML)',
			'63-feature MLP',
			'test_latency.py',
			False,
		),
		'QR-26': (
			'NFR1.1',
			'Hand detection p95 <= 100 ms, live',
			'MediaPipe lite model',
			'test_realtime_performance.py',
			False,
		),
		'QR-27': (
			'NFR1.1',
			'Frame serialization p95 <= 20 ms',
			'Encode once, fan out',
			'test_latency.py',
			False,
		),
		'QR-28': (
			'NFR1.1',
			'Resolve + dispatch p95 <= 30 ms',
			'Dict command maps',
			'test_latency.py',
			False,
		),
		'QR-29': (
			'NFR1.1',
			'Frame -> drone command p95 <= 200 ms',
			'Bounded queue, one consumer',
			'test_realtime_performance.py',
			False,
		),
		'QR-30': (
			'NFR1.1',
			'Gesture onset -> command p95 <= 200 ms',
			'3-of-5 vote + 2-frame hold',
			'test_realtime_performance.py',
			False,
		),
		'QR-35': (
			'NFR1.1',
			'REST p95 <= 100 ms, 10 clients',
			'Async FastAPI',
			'test_backend_performance.py',
			False,
		),
		'QR-37': (
			'NFR1.1',
			'Command round trip p95 <= 100 ms',
			'Persistent WebSocket',
			'test_backend_performance.py',
			False,
		),
		'QR-38': (
			'NFR1.1',
			'Login p95 <= 1 s',
			'bcrypt cost 13',
			'test_backend_performance.py',
			False,
		),
		'QR-40': (
			'NFR1.1',
			'Analytics query p95 <= 250 ms',
			'Aggregates in SQL',
			'test_backend_performance.py',
			False,
		),
		'QR-41': (
			'NFR1.1',
			'Cold start <= 10 s, first frame <= 3 s',
			'Lazy camera start',
			'test_resources.py',
			False,
		),
		'QR-51': (
			'NFR1.1',
			'Every screen LCP <= 2.5 s',
			'Static production bundle',
			'performance.nfr.spec.ts',
			False,
		),
		'QR-52': (
			'NFR1.1',
			'Click -> command confirmed <= 200 ms',
			'WS ack + history',
			'performance.nfr.spec.ts',
			False,
		),
		'QR-18': (
			'NFR1.2',
			'Pipeline stays bounded under load',
			'Drop-oldest frame queue',
			'test_realtime_robustness.py',
			False,
		),
		'QR-31': (
			'NFR1.2',
			'Capacity >= 30 fps',
			'Camera thread + async consumer',
			'test_realtime_performance.py',
			False,
		),
		'QR-32': (
			'NFR1.2',
			'CPU <= 70 % at 30 fps',
			'Lite model, JPEG once',
			'test_realtime_performance.py',
			False,
		),
		'QR-33': (
			'NFR1.2',
			'Frames dropped <= 1 % at 30 fps',
			'Consumer keeps pace',
			'test_realtime_performance.py',
			False,
		),
		'QR-42': (
			'NFR1.2',
			'No per-frame memory growth',
			'Bounded buffers',
			'test_resources.py',
			False,
		),
		'QR-34': (
			'NFR1.3',
			'Every client >= 24 fps (+1 stalled)',
			'Per-client 1-slot queues',
			'test_realtime_performance.py',
			False,
		),
		'QR-36': (
			'NFR1.3',
			'Telemetry >= 9 Hz',
			'100 ms push loop',
			'test_backend_performance.py',
			False,
		),
		'QR-39': (
			'NFR1.3',
			'Telemetry write p95 <= 50 ms',
			'Write every 10th tick',
			'test_backend_performance.py',
			False,
		),
		'QR-50': (
			'NFR1.3',
			'Dashboard renders >= 24 fps',
			'Canvas + ImageBitmap',
			'performance.nfr.spec.ts',
			False,
		),
	},
	'NFR2 Security': {
		'QR-07': (
			'NFR2.1',
			'Session token <= 30 min',
			'Short-lived JWT',
			'test_security.py',
			False,
		),
		'QR-12': (
			'NFR2.1',
			'Invalid tokens rejected',
			'JWT exp/aud/iss/sig checks',
			'test_token_validation.py',
			False,
		),
		'QR-08': (
			'NFR2.2',
			'Password hash cost >= 12 rounds',
			'Configurable bcrypt rounds',
			'test_password_security.py',
			False,
		),
		'QR-09': (
			'NFR2.2',
			'Weak passwords rejected',
			'Strength policy regexes',
			'test_password_security.py',
			False,
		),
		'QR-10': (
			'NFR2.2',
			'Password hashes salted',
			'bcrypt gensalt',
			'test_password_security.py',
			False,
		),
	},
	'NFR3 Reliability': {
		'QR-01': (
			'NFR3.1',
			'Gesture accuracy >= 95% (ML)',
			'ML recognizer (MLP)',
			'test_accuracy.py',
			False,
		),
		'QR-02': (
			'NFR3.1',
			'Every gesture >= 95% (ML)',
			'ML recognizer (MLP)',
			'test_accuracy.py',
			False,
		),
		'QR-01-rule': (
			'NFR3.1',
			'Rule-based accuracy (informational)',
			'Rule-based ceiling',
			'test_accuracy.py',
			True,
		),
		'QR-06': (
			'NFR3.2',
			'Confidence gate >= 0.85',
			'MIN_CONFIDENCE filter',
			'test_command_mapping.py',
			False,
		),
		'QR-19': (
			'NFR3.2',
			'Single-frame noise suppressed',
			'GestureStabilizer voting',
			'test_realtime_robustness.py',
			False,
		),
		'QR-04': (
			'NFR3.2',
			'All single-hand gestures mapped',
			'SINGLE_HAND_MAP',
			'test_command_mapping.py',
			False,
		),
		'QR-05': (
			'NFR3.2',
			'All two-hand combos resolve',
			'Two-hand maps + _resolve',
			'test_command_mapping.py',
			False,
		),
		'QR-13': (
			'NFR3.3',
			'E-stop always critical priority',
			'Command priority elevation',
			'test_safety.py',
			False,
		),
		'QR-14': (
			'NFR3.3',
			'E-stop grounds the drone',
			'Adapter emergency_stop',
			'test_safety.py',
			False,
		),
	},
	'NFR5 Usability': {
		'QR-44': (
			'NFR5.1',
			'Predicted first flight <= 5 min (KLM)',
			'Keystroke-Level Model',
			'test_usability.py',
			False,
		),
		'QR-45': (
			'NFR5.1',
			'>= 80% fly within 5 min (study)',
			'Moderated usability study',
			'test_usability.py',
			False,
		),
		'QR-56': (
			'NFR5.1',
			'Basic flight <= 6 confirmed clicks',
			'On-screen flight pad',
			'usability.nfr.spec.ts',
			False,
		),
		'QR-46': (
			'NFR5.2',
			'Mean SUS >= 85, >= 5 external users',
			'System Usability Scale',
			'test_usability.py',
			False,
		),
		'QR-55': (
			'R1.1.2',
			'Gesture + command visible, no scrolling',
			'Dashboard layout',
			'usability.nfr.spec.ts',
			False,
		),
		'QR-49': (
			'R1.1.2',
			'One history entry per held gesture',
			'Transition-only event log',
			'test_usability.py',
			False,
		),
		'QR-48': (
			'R7 / US-A-02',
			'Keyboard + gamepad reach every command',
			'Shared Command vocabulary',
			'test_usability.py',
			False,
		),
		'QR-53': (
			'U3 / WCAG 4.1.2',
			'Every control has an accessible name',
			'Labelled controls',
			'usability.nfr.spec.ts',
			False,
		),
		'QR-54': (
			'U3 / WCAG 2.4.7',
			'Keyboard focus always visible',
			'Focus styles',
			'usability.nfr.spec.ts',
			False,
		),
	},
	'NFR6 Maintainability': {
		'QR-20': (
			'NFR6.1',
			'Drone adapters implement interface',
			'DroneAdapter ABC',
			'test_maintainabiility.py',
			False,
		),
		'QR-21': (
			'NFR6.1',
			'Input adapters implement interface',
			'InputAdapter ABC',
			'test_maintainabiility.py',
			False,
		),
		'QR-22': (
			'NFR6.2',
			'No function above complexity 15',
			'Small functions',
			'test_maintainabiility.py',
			False,
		),
	},
	'NFR7 Availability': {
		'QR-23': (
			'NFR7.1',
			'Every subsystem has a liveness probe',
			'/health per router',
			'test_availability.py',
			False,
		),
		'QR-24': (
			'NFR7.2',
			'Health probes need no auth',
			'Open health routes',
			'test_availability.py',
			False,
		),
	},
}

ICON = {
	'PASS': 'PASS',
	'FAIL': 'FAIL',
	'PENDING': 'PENDING',
	'INFO': 'INFO',
	'MISSING': 'MISSING',
}


def _load(qr_id: str) -> dict | None:
	path = EVIDENCE_DIR / f'{qr_id}.json'
	return json.loads(path.read_text()) if path.exists() else None


def _status(data: dict | None, informational: bool) -> str:
	if data is None:
		return 'MISSING'
	if data.get('status') == 'pending':
		return 'PENDING'
	if informational or data.get('status') == 'info':
		return 'INFO'
	return 'PASS' if data.get('pass') else 'FAIL'


def _cell(value) -> str:
	return str(value).replace('|', '\\|').replace('\n', ' ')


def _source_link(test: str, commit: str | None) -> str:
	folder = UI_TESTS if test.endswith('.ts') else PY_TESTS
	ref = commit if commit and commit != 'unknown' else 'HEAD'
	return f'{REPO_URL}/blob/{ref}/{folder}/{test}'


# --- charts -------------------------------------------------------------------

W, H = 640, 260
PAD_L, PAD_R, PAD_T, PAD_B = 66, 18, 18, 46
BAR, LINE, LIMIT, INK, GRID = '#b91c1c', '#b91c1c', '#1d4ed8', '#1f2937', '#e5e7eb'


def _num(value: str) -> float | None:
	try:
		out = float(value)
	except (TypeError, ValueError):
		return None
	return out if math.isfinite(out) else None


def _read_raw(qr_id: str) -> dict[str, list[str]]:
	path = RAW_DIR / f'{qr_id}.csv'
	if not path.exists():
		return {}
	with path.open(newline='') as fh:
		rows = list(csv.DictReader(fh))
	return {k: [r.get(k, '') for r in rows] for k in (rows[0].keys() if rows else [])}


def _svg(body: list[str], title: str) -> str:
	return (
		f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
		f'font-family="Inter, Segoe UI, Arial, sans-serif" font-size="11" role="img" '
		f'aria-label="{html.escape(title)}">'
		f'<rect width="{W}" height="{H}" rx="10" fill="#ffffff" stroke="{GRID}"/>'
		+ ''.join(body)
		+ '</svg>'
	)


def _tick(v: float) -> str:
	a = abs(v)
	if a >= 1000:
		return f'{v:,.0f}'
	if a >= 100:
		return f'{v:.0f}'
	if a >= 10:
		return f'{v:.1f}'
	return f'{v:.3g}'


def _axes(lo: float, hi: float, unit: str) -> tuple[list[str], callable]:
	span = (hi - lo) or 1.0
	plot_h = H - PAD_T - PAD_B

	def y(v: float) -> float:
		return PAD_T + plot_h - (v - lo) / span * plot_h

	body = []
	for i in range(5):
		v = lo + span * i / 4
		yy = y(v)
		body.append(
			f'<line x1="{PAD_L}" x2="{W - PAD_R}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{GRID}"/>'
		)
		body.append(
			f'<text x="{PAD_L - 6}" y="{yy + 4:.1f}" text-anchor="end" '
			f'fill="{INK}">{_tick(v)}</text>'
		)
	body.append(
		f'<text x="14" y="{PAD_T + plot_h / 2:.0f}" fill="{INK}" '
		f'transform="rotate(-90 14 {PAD_T + plot_h / 2:.0f})" text-anchor="middle">'
		f'{html.escape(unit)}</text>'
	)
	return body, y


def _limit_line(y, value, lo, hi, horizontal=True, x=None) -> list[str]:
	if value is None or not (lo <= value <= hi):
		return []
	if horizontal:
		yy = y(value)
		return [
			f'<line x1="{PAD_L}" x2="{W - PAD_R}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{LIMIT}" '
			f'stroke-width="2" stroke-dasharray="6 4"/>',
			f'<text x="{W - PAD_R - 4}" y="{yy - 5:.1f}" text-anchor="end" '
			f'fill="{LIMIT}">target {value:g}</text>',
		]
	xx = x(value)
	return [
		f'<line x1="{xx:.1f}" x2="{xx:.1f}" y1="{PAD_T}" y2="{H - PAD_B}" stroke="{LIMIT}" '
		f'stroke-width="2" stroke-dasharray="6 4"/>',
		f'<text x="{xx - 4:.1f}" y="{PAD_T + 12}" text-anchor="end" '
		f'fill="{LIMIT}">target {value:g}</text>',
	]


def _histogram(values: list[float], unit: str, threshold) -> list[str]:
	lo, hi = min(values), max(values)
	if threshold is not None and threshold > hi and threshold < hi * 3:
		hi = threshold
	hi = hi if hi > lo else lo + 1
	bins = 24
	counts = Counter(min(bins - 1, int((v - lo) / (hi - lo) * bins)) for v in values)
	top = max(counts.values())
	body, y = _axes(0, top, 'samples')
	plot_w = W - PAD_L - PAD_R

	def x(v):
		return PAD_L + (v - lo) / (hi - lo) * plot_w

	bw = plot_w / bins
	for b in range(bins):
		c = counts.get(b, 0)
		if c:
			body.append(
				f'<rect x="{PAD_L + b * bw + 1:.1f}" y="{y(c):.1f}" width="{bw - 2:.1f}" '
				f'height="{y(0) - y(c):.1f}" fill="{BAR}" opacity="0.85"/>'
			)
	for i in range(5):
		v = lo + (hi - lo) * i / 4
		body.append(
			f'<text x="{x(v):.1f}" y="{H - PAD_B + 16}" text-anchor="middle" '
			f'fill="{INK}">{_tick(v)}</text>'
		)
	body.append(
		f'<text x="{PAD_L + plot_w / 2:.0f}" y="{H - 10}" text-anchor="middle" '
		f'fill="{INK}">{html.escape(unit)}</text>'
	)
	body += _limit_line(y, threshold, lo, hi, horizontal=False, x=x)
	return body


def _series(values: list[float], unit: str, threshold) -> list[str]:
	lo = min(0.0, min(values))
	hi = max(values + ([threshold] if threshold is not None else []))
	hi = hi * 1.1 if hi > 0 else 1.0
	body, y = _axes(lo, hi, unit)
	plot_w = W - PAD_L - PAD_R
	n = max(1, len(values) - 1)
	pts = ' '.join(f'{PAD_L + i / n * plot_w:.1f},{y(v):.1f}' for i, v in enumerate(values))
	body.append(f'<polyline points="{pts}" fill="none" stroke="{LINE}" stroke-width="2"/>')
	body.append(f'<text x="{PAD_L}" y="{H - PAD_B + 16}" fill="{INK}">start</text>')
	body.append(
		f'<text x="{W - PAD_R}" y="{H - PAD_B + 16}" text-anchor="end" '
		f'fill="{INK}">end ({len(values)} samples)</text>'
	)
	body += _limit_line(y, threshold, lo, hi)
	return body


def _bars(labels: list[str], values: list[float], unit: str, threshold) -> list[str]:
	hi = max(values + ([threshold] if threshold is not None else [])) or 1.0
	hi *= 1.1
	body, y = _axes(0, hi, unit)
	plot_w = W - PAD_L - PAD_R
	bw = plot_w / max(1, len(values))
	for i, (label, v) in enumerate(zip(labels, values)):
		bx = PAD_L + i * bw
		body.append(
			f'<rect x="{bx + bw * 0.15:.1f}" y="{y(v):.1f}" width="{bw * 0.7:.1f}" '
			f'height="{y(0) - y(v):.1f}" fill="{BAR}" opacity="0.85"/>'
		)
		short = label if len(label) <= 14 else label[:13] + '…'
		body.append(
			f'<text x="{bx + bw / 2:.1f}" y="{H - PAD_B + 14}" text-anchor="middle" fill="{INK}" '
			f'font-size="{10 if len(values) > 6 else 11}">{html.escape(short)}</text>'
		)
	body += _limit_line(y, threshold, 0, hi)
	return body


def draw_chart(qr_id: str, spec: dict) -> str | None:
	raw = _read_raw(qr_id)
	column = spec.get('column')
	if not raw or column not in raw:
		return None
	pairs = [(i, _num(v)) for i, v in enumerate(raw[column])]
	pairs = [(i, v) for i, v in pairs if v is not None]
	if not pairs:
		return None
	values = [v for _, v in pairs]
	unit = spec.get('unit', '')
	threshold = spec.get('threshold')
	kind = spec.get('kind')
	if kind == 'histogram':
		body = _histogram(values, unit, threshold)
	elif kind == 'series':
		body = _series(values, unit, threshold)
	elif kind == 'bars':
		labels_col = raw.get(spec.get('label', ''), [str(i + 1) for i in range(len(raw[column]))])
		body = _bars([labels_col[i] for i, _ in pairs], values, unit, threshold)
	else:
		return None
	CHART_DIR.mkdir(parents=True, exist_ok=True)
	(CHART_DIR / f'{qr_id}.svg').write_text(_svg(body, f'{qr_id} {column}'))
	return f'evidence/charts/{qr_id}.svg'


# --- pages ---------------------------------------------------------------------


def _rows():
	for group, rows in GROUPS.items():
		for qr_id, (srs, req, tactic, test, info) in rows.items():
			data = _load(qr_id)
			yield group, qr_id, srs, req, tactic, test, data, _status(data, info)


def build_matrix() -> tuple[list[str], Counter]:
	counts: Counter = Counter()
	lines = [
		'# NFR Traceability Matrix',
		'',
		'Generated by `tests/nfr/report.py` from `docs/nfr/evidence/`. Do not edit by hand.',
		'Every row links to its full evidence (method, raw numbers, chart) on the '
		'[evidence page](EVIDENCE.md).',
		'',
	]
	current = None
	for group, qr_id, srs, req, tactic, test, data, status in _rows():
		if group != current:
			current = group
			lines += [
				'',
				f'### {group}',
				'',
				'| ID | Result | SRS | Requirement | Actual | Target | Tactic | Test |',
				'|----|--------|-----|-------------|--------|--------|--------|------|',
			]
		counts[status] += 1
		target = _cell(data.get('target', '-')) if data else '-'
		actual = _cell(data.get('actual', '-')) if data else 'not measured'
		anchor = qr_id.lower()
		lines.append(
			f'| [{qr_id}](EVIDENCE.md#{anchor}) | {ICON[status]} | {srs} | {req} | {actual} | '
			f'{target} | {tactic} | `{test}` |'
		)
	total = sum(counts.values())
	summary = (
		f'**{total} requirements: {counts["PASS"]} pass, {counts["FAIL"]} fail, '
		f'{counts["PENDING"]} pending, {counts["INFO"]} informational, '
		f'{counts["MISSING"]} not measured.**'
	)
	lines = lines[:5] + [summary, ''] + lines[5:] + ['']
	return lines, counts


def _stats_table(stats: dict) -> list[str]:
	keys = [k for k in ('n', 'min', 'mean', 'p50', 'p95', 'p99', 'max') if k in stats]
	if len(keys) < 3:
		return []
	return [
		'| ' + ' | '.join(keys) + ' |',
		'|' + '---|' * len(keys),
		'| ' + ' | '.join(str(stats[k]) for k in keys) + ' |',
		'',
	]


SKIP = {
	'id',
	'requirement',
	'metric',
	'actual',
	'target',
	'pass',
	'recorded_at',
	'machine',
	'python',
	'commit',
	'branch',
	'runner',
	'ci_run',
	'browser',
	'suite',
	'method',
	'stats',
	'chart',
	'finding',
	'screenshot',
	'screenshots',
	'status',
	'failing',
}


def _details(data: dict) -> list[str]:
	out = []
	for key, value in data.items():
		if key in SKIP or value in (None, [], {}):
			continue
		text = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
		if len(text) > 400:
			text = text[:400] + '…'
		out.append(f'| `{key}` | {_cell(text)} |')
	if not out:
		return []
	return ['| Detail | Value |', '|---|---|', *out, '']


def build_evidence(counts: Counter) -> list[str]:
	contexts = Counter()
	ci_runs = set()
	dates = []
	for *_, data, _status_ in _rows():
		if data:
			contexts[(data.get('machine'), data.get('commit'), data.get('runner'))] += 1
			dates.append(data.get('recorded_at', ''))
			if data.get('ci_run'):
				ci_runs.add(data['ci_run'])

	lines = [
		'# NFR Evidence',
		'',
		'<div class="tx-badges">',
		'  <span class="tx-status"><span class="tx-status__dot"></span>'
		'Generated from test runs</span>',
		'  <span class="tx-status">Performance · Usability · Security · Reliability</span>',
		'</div>',
		'',
		'!!! abstract "How to read this page"',
		'    Every section below was written by `tests/nfr/report.py` from the JSON a test '
		'produced. Nothing here is typed by hand. Each section shows **what was measured and '
		'how**, the **result against the target**, the **distribution** of the raw samples, a '
		'**chart** drawn from those samples, any **screenshots**, and links to the **test '
		'source** and the **raw data files**, so every number can be traced back to code '
		'without cloning the repository.',
		'',
		f'**Totals:** {counts["PASS"]} pass · {counts["FAIL"]} fail · {counts["PENDING"]} pending '
		f'(awaiting usability-study participants) · {counts["INFO"]} informational · '
		f'{counts["MISSING"]} not measured.',
		'',
		'## Where these numbers were measured',
		'',
		'| Machine | Commit | Runner | Requirements |',
		'|---|---|---|---|',
	]
	for (machine, commit, runner), n in contexts.most_common():
		link = (
			f'[`{commit}`]({REPO_URL}/commit/{commit})' if commit and commit != 'unknown' else '-'
		)
		lines.append(f'| {machine} | {link} | {runner} | {n} |')
	lines.append('')
	if dates:
		lines.append(f'Measurements recorded between **{min(dates)}** and **{max(dates)}** (UTC).')
		lines.append('')
	for run in sorted(ci_runs):
		lines.append(f'- CI run with downloadable artifacts: <{run}>')
	if ci_runs:
		lines.append('')
	lines += [
		'!!! note "Reference machine"',
		'    SRS NFR1.1 sets the reference machine as a 4-core x86_64 laptop with 8 GB RAM. '
		'Numbers measured on a slower machine than that are conservative; numbers from '
		'a faster machine should be re-confirmed on the reference laptop before a demo.',
		'',
	]

	current = None
	for group, qr_id, srs, req, tactic, test, data, status in _rows():
		if group != current:
			current = group
			lines += ['---', '', f'## {group}', '']
		lines += [
			f'### {qr_id}',
			'',
			f'**{req}** · SRS `{srs}` · tactic: {tactic} · **{ICON[status]}**',
			'',
		]
		if data is None:
			lines += [
				f'Not measured in the committed run. Test: [`{test}`]({_source_link(test, None)}).',
				'',
			]
			continue

		lines += [
			'| Metric | Target | Actual |',
			'|---|---|---|',
			f'| {_cell(data.get("metric", ""))} | {_cell(data.get("target", ""))} | '
			f'**{_cell(data.get("actual", ""))}** |',
			'',
		]
		if data.get('method'):
			lines += [f'**How it was measured.** {data["method"]}', '']
		if isinstance(data.get('stats'), dict):
			lines += _stats_table(data['stats'])
		chart = draw_chart(qr_id, data['chart']) if isinstance(data.get('chart'), dict) else None
		if chart:
			lines += [f'![{qr_id} chart]({chart})', '']
		if data.get('finding'):
			lines += ['!!! warning "Finding"', f'    {data["finding"]}', '']
		if data.get('failing'):
			lines += [
				'| Where | Shown text | Cause | Action | No internals |',
				'|---|---|---|---|---|',
			]
			for f in data['failing']:
				yes = {True: '✅', False: '❌'}
				lines.append(
					f'| `{_cell(f["where"])}` | {_cell(f["text"][:90])} | '
					f'{yes[f["states_cause"]]} | '
					f'{yes[f["suggests_action"]]} | {yes[not f["leaks_internals"]]} |'
				)
			lines.append('')
		shots = data.get('screenshots') or ([data['screenshot']] if data.get('screenshot') else [])
		for shot in shots:
			lines += [f'![{qr_id} screenshot](evidence/{shot}){{ loading=lazy }}', '']
		lines += _details(data)
		files = [f'[JSON](evidence/{qr_id}.json)']
		if (RAW_DIR / f'{qr_id}.csv').exists():
			files.append(f'[raw samples CSV](evidence/raw/{qr_id}.csv)')
		files.append(f'[test source]({_source_link(test, data.get("commit"))})')
		where = f'{data.get("machine", "?")}'
		if data.get('browser'):
			where += f', {data["browser"]}'
		run = f' · [CI run]({data["ci_run"]})' if data.get('ci_run') else ''
		lines += [
			f'<small>Recorded {data.get("recorded_at", "?")} on {where} · commit '
			f'`{data.get("commit", "?")}` ({data.get("runner", "?")}){run} · '
			+ ' · '.join(files)
			+ '</small>',
			'',
		]
	return lines


def write_ci_summary(matrix: list[str], counts: Counter) -> None:
	target = os.getenv('GITHUB_STEP_SUMMARY')
	if not target:
		return
	failing = []
	for _, qr_id, srs, req, _, _, data, status in _rows():
		if status == 'FAIL':
			failing.append(
				f'- **{qr_id}** ({srs}) {req}: actual `{data.get("actual")}`, '
				f'target `{data.get("target")}`'
			)
	head = [
		'## NFR evidence',
		'',
		f'✅ {counts["PASS"]} pass · ❌ {counts["FAIL"]} fail · ⏳ {counts["PENDING"]} pending · '
		f'ℹ️ {counts["INFO"]} info · ⚪ {counts["MISSING"]} not measured',
		'',
		'The full evidence (JSON, raw samples, charts, screenshots, EVIDENCE.md) is attached to '
		'this run as the **nfr-evidence** artifact.',
		'',
	]
	if failing:
		head += ['### Failing', '', *failing, '']
	with open(target, 'a', encoding='utf-8') as fh:
		fh.write(
			'\n'.join(
				head
				+ ['<details><summary>Full matrix</summary>', '']
				+ [line.replace('](EVIDENCE.md', '](#') for line in matrix[5:]]
				+ ['', '</details>', '']
			)
		)


def main() -> None:
	matrix, counts = build_matrix()
	MATRIX.write_text('\n'.join(matrix) + '\n')
	EVIDENCE_PAGE.write_text('\n'.join(build_evidence(counts)) + '\n')
	write_ci_summary(matrix, counts)
	print(
		f'wrote {MATRIX.relative_to(REPO_ROOT)} and {EVIDENCE_PAGE.relative_to(REPO_ROOT)}: '
		f'{counts["PASS"]} pass, {counts["FAIL"]} fail, {counts["PENDING"]} pending, '
		f'{counts["INFO"]} info, {counts["MISSING"]} missing'
	)


if __name__ == '__main__':
	main()
