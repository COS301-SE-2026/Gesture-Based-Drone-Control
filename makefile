.PHONY: install test lint dev build format clean

FRONTEND_DIR := apps/frontend
BACKEND_DIR := apps/backend
SERVICES_DIR := services

install:
	$(MAKE) -C $(SERVICES_DIR) install
	$(MAKE) -C $(BACKEND_DIR) install
	cd $(FRONTEND_DIR) && yarn install

dev:
	$(MAKE) -C $(BACKEND_DIR) dev &
	cd $(FRONTEND_DIR) && yarn dev

build:
	$(MAKE) -C $(BACKEND_DIR) build &
	cd $(FRONTEND_DIR) && yarn build


test:
	$(MAKE) -C $(SERVICES_DIR) test
	$(MAKE) -C $(BACKEND_DIR) test
	cd $(FRONTEND_DIR) && yarn test

lint:
	$(MAKE) -C $(SERVICES_DIR) lint
	$(MAKE) -C $(BACKEND_DIR) lint
	cd $(FRONTEND_DIR) && yarn lint

fix:
	$(MAKE) -C $(SERVICES_DIR) fix
	$(MAKE) -C $(BACKEND_DIR) fix
	cd $(FRONTEND_DIR) && yarn format

clean:
	rm -f $(SERVICES_DIR)/coverage.xml $(SERVICES_DIR)/.coverage
	rm -f $(BACKEND_DIR)/coverage.xml $(BACKEND_DIR)/.coverage
	rm -rf $(SERVICES_DIR)/htmlcov $(BACKEND_DIR)/htmlcov

#keeping services in its own corner as we're mocking everything for now

services-install:
	pip install -e $(SERVICES_DIR)[dev] --break-system-packages

services-test:
	python -m pytest services/tests

	

