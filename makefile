include .env
export

.PHONY: install test lint dev build format

FRONTEND_DIR := apps/frontend

install:
	uv sync --all-groups --python 3.11
	cd $(FRONTEND_DIR) && yarn install

dev:
	uv run fastapi dev apps/backend/app/main.py --port $(BACKENDPORT) &
	cd $(FRONTEND_DIR) && yarn dev

build:
	uv run fastapi run apps/backend/app/main.py --port $(BACKENDPORT) &
	cd $(FRONTEND_DIR) && yarn build


test:
	uv run pytest --cov --cov-report=term-missing
	cd $(FRONTEND_DIR) && yarn test

lint:
	uv run ruff check --output-format=github
	cd $(FRONTEND_DIR) && yarn lint

fix:
	uv run ruff format .
	uv run ruff check --fix .
	cd $(FRONTEND_DIR) && yarn format

#keeping services in its own corner as we're mocking everything for now

services-install:
	pip install -e $(SERVICES_DIR)[dev] --break-system-packages

services-test:
	python -m pytest services/tests

	

