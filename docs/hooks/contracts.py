from pathlib import Path

from mkdocs.structure.files import File

CONTRACTS = {
	'openapi.yaml': 'api/openapi.yaml',
	'asyncapi.yaml': 'api/asyncapi.yaml',
}


def on_files(files, config):
	source_dir = Path(config['docs_dir']).parent / 'packages' / 'api-contracts'

	for name, src_url in CONTRACTS.items():
		source = source_dir / name
		if not source.is_file():
			raise FileNotFoundError(
				f'Contract not found: {source}. The doc site publishes '
				f'the contracts from packages/api-contracts/, if that path '
				f'changed, updated docs/hooks/contracts.py'
			)

		files.append(File.generated(config, src_url, abs_src_path=str(source)))

	return files
