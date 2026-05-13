.PHONY: install test lint dev

install:
	uv sync --all-groups

test:
	uv run pytest tests/ --cov=services --cov-report=term-missing

lint:
	uv run ruff check --verbose --statistics --output-format=github

dev:
	uv run python -m services.main