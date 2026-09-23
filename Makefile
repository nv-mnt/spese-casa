# Spese Casa - comandi di sviluppo e verifica.
#
# `make test` e' il comando unico: prima i controlli statici (TypeScript,
# ESLint, build di produzione), poi i test del backend, infine gli E2E.
# Se uno dei controlli statici fallisce la suite si ferma li'.

SHELL := /bin/bash
FRONTEND := frontend
BACKEND := backend

.PHONY: help install test statici typecheck lint build test-backend e2e e2e-report seed-e2e pulisci

help:
	@echo "make install       installa le dipendenze di backend e frontend"
	@echo "make test          suite completa: statici + backend + end-to-end"
	@echo "make statici       TypeScript, ESLint e build di produzione"
	@echo "make test-backend  test di integrazione delle API (pytest)"
	@echo "make e2e           solo i test end-to-end (Playwright)"
	@echo "make e2e-report    apre l'ultimo report HTML di Playwright"

install:
	cd $(FRONTEND) && npm install
	cd $(BACKEND) && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
	cd $(FRONTEND) && npx playwright install --with-deps chromium webkit

test: statici test-backend e2e

statici: typecheck lint build

typecheck:
	cd $(FRONTEND) && npm run typecheck

lint:
	cd $(FRONTEND) && npm run lint

build:
	cd $(FRONTEND) && npm run build

test-backend:
	cd $(BACKEND) && .venv/bin/python -m pytest -q

e2e:
	cd $(FRONTEND) && npm run e2e

e2e-report:
	cd $(FRONTEND) && npx playwright show-report

seed-e2e:
	bash $(BACKEND)/scripts/reset_e2e.sh && echo "database E2E riportato al seed"

pulisci:
	rm -rf $(FRONTEND)/dist $(FRONTEND)/playwright-report $(FRONTEND)/test-results
	rm -f $(BACKEND)/e2e.db $(BACKEND)/e2e.db-wal $(BACKEND)/e2e.db-shm
