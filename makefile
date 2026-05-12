.PHONY: install test lint dev build format

FRONTEND_DIR := apps/frontend
BACKEND_DIR := apps/backend

install:
	$(MAKE) -C $(BACKEND_DIR) install
	cd $(FRONTEND_DIR) && yarn install

dev:
	$(MAKE) -C $(BACKEND_DIR) dev &
	cd $(FRONTEND_DIR) && yarn dev

build:
	$(MAKE) -C $(BACKEND_DIR) build &
	cd $(FRONTEND_DIR) && yarn build

test:
	$(MAKE) -C $(BACKEND_DIR) test
	cd $(FRONTEND_DIR) && yarn test

lint:
	$(MAKE) -C $(BACKEND_DIR) lint
	cd $(FRONTEND_DIR) && yarn lint
	cd $(FRONTEND_DIR) && yarn format
	

