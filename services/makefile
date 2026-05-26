.PHONY: install test lint dev services makefile

install:
	uv sync --all-groups --python 3.11

test:
	PYTHONPATH=.. uv run pytest tests/ --cov=services --cov-report=term-missing --cov-report=xml

lint:
	uv run ruff check --output-format=github

dev:
	uv run python -m services.main

fix:
	uv run ruff check --fix .
	uv run ruff format .

fix-services:
	uv run ruff check --fix 
	uv run ruff format