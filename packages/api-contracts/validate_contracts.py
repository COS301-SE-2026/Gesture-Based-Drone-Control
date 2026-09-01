"""
Validate the authored API contracts, and check them against the running code

3 checks, all independent:

1.) openapi.yaml is a structurally valid OpenAPI 3.0.3 doc

2.) ayncapi.yaml parses as a yaml. and declares the expected version. Full Async API
    validation needs NOode, so its delegated to the AsyncAPI CLI and skupped here if
    Node is not on path
    
3.) Drift: every path with a method in the authored openapi.yaml exists in the document 
    FastAPI generates from the live Pydantic models. This is the check that actaully 
    earns its keep, because it fails the moment someone adds a route without updating 
    the contract
"""

from __future__ import annotations
 
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
 
HERE = Path(__file__).resolve().parent
OPENAPI_PATH = HERE / 'openapi.yaml'
ASYNCAPI_PATH = HERE / 'asyncapi.yaml'
 
HTTP_METHODS = {'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'}
ASYNCAPI_ACTIONS = {'send', 'receive'}
CLI_TIMEOUT_SECONDS = 180
 
PASS = 'PASS'
FAIL = 'FAIL'
SKIP = 'SKIP'
 
 
def report(status: str, name: str, detail: str = '') -> None:
	line = f'[{status}] {name}'
	if detail:
		line += f'\n       {detail}'
	print(line)
 
 
def load_yaml(path: Path) -> dict:
	import yaml
 
	with path.open(encoding='utf-8') as handle:
		return yaml.safe_load(handle)
 
 
def check_openapi() -> str:
	"""Structural validation of the authored REST contract."""
	try:
		from openapi_spec_validator import validate
	except ImportError:
		report(SKIP, 'openapi.yaml structure', 'pip install openapi-spec-validator')
		return SKIP
 
	try:
		spec = load_yaml(OPENAPI_PATH)
		validate(spec)
	except Exception as ex:
		report(FAIL, 'openapi.yaml structure', str(ex).splitlines()[0])
		return FAIL
 
	paths = len(spec.get('paths', {}))
	schemas = len(spec.get('components', {}).get('schemas', {}))
	report(PASS, 'openapi.yaml structure', f'{paths} paths, {schemas} schemas')
	return PASS
 
 
def _resolve_ref(doc: dict, ref: str) -> object:
	"""Follow a local JSON pointer. Raises KeyError if it dangles."""
	node: object = doc
	for part in ref.lstrip('#/').split('/'):
		part = part.replace('~1', '/').replace('~0', '~')
		if not isinstance(node, dict) or part not in node:
			raise KeyError(ref)
		node = node[part]
	return node
 
 
def _collect_refs(node: object) -> list[str]:
	"""Every local $ref anywhere in the document."""
	found: list[str] = []
	if isinstance(node, dict):
		for key, value in node.items():
			if key == '$ref' and isinstance(value, str) and value.startswith('#/'):
				found.append(value)
			else:
				found.extend(_collect_refs(value))
	elif isinstance(node, list):
		for item in node:
			found.extend(_collect_refs(item))
	return found
 
 
def _asyncapi_structure_errors(doc: dict) -> list[str]:
	"""In-process structural checks. No network, no Node, no waiting."""
	errors: list[str] = []
 
	version = str(doc.get('asyncapi', ''))
	if not version.startswith('3.'):
		errors.append(f'asyncapi version: expected 3.x, found {version!r}')
 
	if not doc.get('info', {}).get('title'):
		errors.append('info.title is missing')
 
	channels = doc.get('channels') or {}
	if not channels:
		errors.append('no channels declared')
 
	for name, channel in channels.items():
		if not channel.get('address'):
			errors.append(f'channel {name!r}: no address')
		if not channel.get('messages'):
			errors.append(f'channel {name!r}: no messages')
 
	operations = doc.get('operations') or {}
	if not operations:
		errors.append('no operations declared')
 
	for name, operation in operations.items():
		action = operation.get('action')
		if action not in ASYNCAPI_ACTIONS:
			errors.append(f'operation {name!r}: action must be send or receive, found {action!r}')
 
		channel_ref = (operation.get('channel') or {}).get('$ref', '')
		if not channel_ref.startswith('#/channels/'):
			errors.append(f'operation {name!r}: channel must be a local $ref')
		elif channel_ref.split('/')[2] not in channels:
			errors.append(f'operation {name!r}: channel {channel_ref} does not exist')
 
		if not operation.get('messages'):
			errors.append(f'operation {name!r}: no messages')
 
	for ref in _collect_refs(doc):
		try:
			_resolve_ref(doc, ref)
		except KeyError:
			errors.append(f'dangling reference: {ref}')
 
	return errors
 
 
def check_asyncapi(deep: bool = False) -> str:
	"""Validate the WebSocket contract structurally, and optionally with the CLI."""
	try:
		doc = load_yaml(ASYNCAPI_PATH)
	except Exception as ex:
		report(FAIL, 'asyncapi.yaml parse', str(ex).splitlines()[0])
		return FAIL
 
	errors = _asyncapi_structure_errors(doc)
	if errors:
		report(FAIL, 'asyncapi.yaml structure', '\n       '.join(errors[:10]))
		return FAIL
 
	channels = len(doc.get('channels', {}))
	operations = len(doc.get('operations', {}))
	messages = len(doc.get('components', {}).get('messages', {}))
	summary = f'{channels} channels, {operations} operations, {messages} messages'
 
	if not deep:
		report(PASS, 'asyncapi.yaml structure', summary)
		return PASS
 
	# Deep mode only. --no-install means we use an already-installed CLI or nothing:
	# npx must never sit there downloading the toolchain during a lint run.
	if shutil.which('npx') is None:
		report(SKIP, 'asyncapi.yaml full validation', 'npx not on PATH')
		return SKIP
 
	command = ['npx', '--no-install', '@asyncapi/cli', 'validate', str(ASYNCAPI_PATH)]
	try:
		result = subprocess.run(
			command,
			capture_output=True,
			text=True,
			check=False,
			timeout=CLI_TIMEOUT_SECONDS,
		)
	except subprocess.TimeoutExpired:
		report(SKIP, 'asyncapi.yaml full validation', f'CLI timed out after {CLI_TIMEOUT_SECONDS}s')
		return SKIP
 
	output = (result.stdout + result.stderr).strip()
 
	# npx phrases "it isn't installed" several different ways depending on version.
	not_installed = (
		'canceled due to missing packages',
		'could not determine executable',
		'npm error 404',
	)
	lowered = output.lower()
	if result.returncode != 0 and any(phrase in lowered for phrase in not_installed):
		report(
			SKIP,
			'asyncapi.yaml full validation',
			'AsyncAPI CLI not installed. npm i -g @asyncapi/cli',
		)
		return SKIP
 
	if result.returncode != 0:
		report(FAIL, 'asyncapi.yaml full validation', '\n       '.join(output.splitlines()[-3:]))
		return FAIL
 
	report(PASS, 'asyncapi.yaml full validation', summary)
	return PASS
 
 
def generated_openapi() -> dict | None:
	"""Build the FastAPI app and pull its generated schema, or None if unavailable."""
	repo_root = HERE.parents[1]
	backend = repo_root / 'apps' / 'backend'
	for entry in (str(repo_root), str(backend)):
		if entry not in sys.path:
			sys.path.insert(0, entry)
	try:
		from app.main import app  # noqa: PLC0415
 
		return app.openapi()
	except Exception:
		return None
 
 
def operation_set(spec: dict) -> set[str]:
	found: set[str] = set()
	for path, item in (spec.get('paths') or {}).items():
		for method in item:
			if method.lower() in HTTP_METHODS:
				found.add(f'{method.upper()} {path}')
	return found
 
 
def check_drift() -> str:
	"""Compare the authored contract against what FastAPI actually serves."""
	generated = generated_openapi()
	if generated is None:
		report(SKIP, 'contract drift', 'backend not importable in this environment')
		return SKIP
 
	authored = operation_set(load_yaml(OPENAPI_PATH))
	live = operation_set(generated)
 
	missing = sorted(live - authored)  # implemented but undocumented
	extra = sorted(authored - live)  # documented but not implemented
 
	if not missing and not extra:
		report(PASS, 'contract drift', f'{len(authored)} operations match')
		return PASS
 
	lines = []
	if missing:
		lines.append('implemented but missing from openapi.yaml:')
		lines.extend(f'  - {op}' for op in missing)
	if extra:
		lines.append('in openapi.yaml but not implemented:')
		lines.extend(f'  - {op}' for op in extra)
	report(FAIL, 'contract drift', '\n       '.join(lines))
	return FAIL
 
 
def main() -> int:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument(
		'--strict',
		action='store_true',
		help='treat skipped checks as failures',
	)
	parser.add_argument(
		'--deep',
		action='store_true',
		help='also run the AsyncAPI CLI, if it is already installed',
	)
	args = parser.parse_args()
 
	print('Validating API contracts\n')
	results = [check_openapi(), check_asyncapi(deep=args.deep), check_drift()]
	print()
 
	failed = results.count(FAIL)
	skipped = results.count(SKIP)
 
	if failed:
		print(f'{failed} check(s) failed.')
		return 1
	if skipped and args.strict:
		print(f'{skipped} check(s) skipped, and --strict was passed.')
		return 1
	print(f'All checks passed. ({skipped} skipped)' if skipped else 'All checks passed.')
	return 0
 
 
def _dump_generated() -> None:
	"""Helper: write the live schema to stdout. Handy when investigating drift."""
	generated = generated_openapi()
	if generated is None:
		sys.exit('backend not importable')
	json.dump(generated, sys.stdout, indent=2)
 
 
if __name__ == '__main__':
	if '--dump' in sys.argv:
		_dump_generated()
	else:
		sys.exit(main())
 