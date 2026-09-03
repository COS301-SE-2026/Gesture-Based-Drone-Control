"""
Evidence artefacts from CI tool output

Usage:
    python3 tests/nfr/maintainability/ci_evidence.py gitleaks gitleaks.json
    python3 tests/nfr/maintainability/ci_evidence.py imports importlinter.txt
    python3 tests/nfr/maintainability/ci_evidence.py coverage coverage.xml
"""

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tests.nfr._support.evidence import emit  # noqa: E402

COVERAGE_TARGET = 80.0


def from_gitleaks(path: Path) -> None:
	"""zero secrets commited to repo"""
	if not path.exists():
		raise SystemExit(f'{path} not found; run gitleaks beofre emitting evidence')
	findings = json.loads(path.read_text() or '[]')
	emit(
		'QR-05',
		'NFR2.2',
		'secrets detected in repo history',
		actual=len(findings),
		target='0',
		passed=len(findings) == 0,
		scanner='gitleaks (full history)',
		findings=[
			{'rule': f.get('RuleID'), 'file': f.get('File'), 'commit': f.get('Commit', '')[:7]}
			for f in findings
		],
	)


def from_import_linter(path: Path) -> None:
	"""no module imports across a declared interface boundary"""
	text = path.read_text() if path.exists() else ''
	broken = [line.strip() for line in text.splitlines() if 'BROKEN' in line.upper()]
	kept = [line.strip() for line in text.splitlines() if 'KEPT' in line.upper()]
	emit(
		'QR-10',
		'NFR4.1',
		'layered import contracts broken',
		actual=len(broken),
		target='0',
		passed=len(broken) == 0,
		contracts_kept=len(kept),
		broken_contracts=broken,
		tool='import-linter',
	)


def from_coverage(path: Path) -> None:
	"""every module holds at least 80% coverage"""
	root = ET.parse(path).getroot()
	overall = round(float(root.get('line-rate', 0)) * 100, 2)

	per_package: dict[str, float] = {}
	for pkg in root.iter('package'):
		name = pkg.get('name') or 'unknown'
		per_package[name] = round(float(pkg.get('line-rate', 0)) * 100, 2)

	below = {k: v for k, v in per_package.items() if v < COVERAGE_TARGET}
	emit(
		'QR-11',
		'NFR4.2',
		'line coverage (%), overall and per module',
		actual=overall,
		target=f'>= {COVERAGE_TARGET}',
		passed=overall >= COVERAGE_TARGET and not below,
		per_package=per_package,
		packages_below_target=below,
	)


HANDLERS = {'gitleaks': from_gitleaks, 'imports': from_import_linter, 'coverage': from_coverage}


def main() -> int:
	if len(sys.argv) != 3 or sys.argv[1] not in HANDLERS:
		print(f'usage: ci_evidence.py {{{"|".join(HANDLERS)}}} <file>', file=sys.stderr)
		return 2
	HANDLERS[sys.argv[1]](Path(sys.argv[2]))
	print(f'wrote evidence from {sys.argv[1]}')
	return 0


if __name__ == '__main__':
	raise SystemExit(main())
