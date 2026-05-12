.Phony: install test lint

PORT ?= 3001

install: 
	uv sync --all-groups

test: 	
	uv run pytest tests/ --cov=app --cov-report=term-missing

#--cov-fail-under=80

lint: 
	uv run ruff check --verbose --statistics --output-format=github

dev:
	uv run fastapi dev app/main.py --port $(PORT)

build:
	uv run fastapi run app/main.py --port $(PORT)