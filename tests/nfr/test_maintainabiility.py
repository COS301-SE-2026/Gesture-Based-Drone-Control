"""
QR-14 / NFR6.1 -> every concrete adapter implements its interface completely
QR-15 / NFR6.2 -> code complexity stays within a maintainable bound
"""

from __future__ import annotations

import importlib
import inspect

import pytest

from services.drone_control.adapters.drone_adapter import DroneAdapter
from services.input.sources.input_adapter import InputAdapter
from tests.nfr._helpers import REPO_ROOT, emit

DRONE_ADAPTERS = [
	('services.drone_control.adapters.dummy_drone_adapter', 'DummyDroneAdapter'),
	('services.drone_control.adapters.airsim_adapter', 'AirSimAdapter'),
	('services.drone_control.adapters.project_airsim_adapter', 'ProjectAirSimAdapter'),
	('services.drone_control.adapters.tello_adapter', 'TelloAdapter'),
]
INPUT_ADAPTERS = [
	('services.input.sources.dummy_input_adapter', 'DummyInputAdapter'),
	('services.input.sources.gamepad_adapter', 'GamepadAdapter'),
	('services.input.sources.gesture_adapter', 'GestureAdapter'),
	('services.input.sources.keyboard_adapter', 'KeyboardAdapter'),
]

MAX_COMPLEXITY = 15


def _load(specs):
	"""import each module, class; return loaded/skipped with reason"""
	loaded, skipped = [], {}
	for module_path, class_name in specs:
		try:
			module = importlib.import_module(module_path)
			loaded.append(getattr(module, class_name))
		except Exception as exc:
			skipped[class_name] = f'{type(exc).__name__}: {exc}'
	return loaded, skipped


def _check_adapters(specs, base, qr_id):
	loaded, skipped = _load(specs)
	required = sorted(
		name
		for name, value in inspect.getmembers(base, predicate=inspect.isfunction)
		if getattr(value, '__isabstractmethod__', False)
	)
	incomplete = {
		cls.__name__: sorted(cls.__abstractmethods__) for cls in loaded if cls.__abstractmethods__
	}

	emit(
		qr_id,
		'NFR6.1',
		f'{base.__name__} adapters fully implementing the interface',
		actual=f'{len(loaded) - len(incomplete)}/{len(loaded)} loaded',
		target='all loaded adapters complete',
		passed=not incomplete,
		interface_methods=required,
		incomplete=incomplete,
		skipped_optional=skipped,
	)

	assert not incomplete, f'{base.__name__} adapters missing methods: {incomplete}'


def test_drone_adapters_implement_interface():
	_check_adapters(DRONE_ADAPTERS, DroneAdapter, 'QR-14')


def test_input_adapters_implement_interface():
	_check_adapters(INPUT_ADAPTERS, InputAdapter, 'QR-15')


def test_no_function_exceeds_complexity_budget():
	radon_cc = pytest.importorskip('radon.complexity')

	offenders = []
	for py_file in (REPO_ROOT / 'services').rglob('*.py'):
		if 'test' in py_file.parts or 'ml_training' in py_file.parts:
			continue
		try:
			blocks = radon_cc.cc_visit(py_file.read_text())
		except SyntaxError:
			continue
		for block in blocks:
			if block.complexity > MAX_COMPLEXITY:
				rel = py_file.relative_to(REPO_ROOT)
				offenders.append(f'{rel}:{block.lineno} {block.name} (CC={block.complexity})')

	emit(
		'QR-16',
		'NFR6.2',
		f'functions above cyclomatic complexity {MAX_COMPLEXITY}',
		actual=len(offenders),
		target='0',
		passed=not offenders,
		offenders=sorted(offenders)[:20],
	)

	assert not offenders, f'functions over complexity budget: {offenders}'
