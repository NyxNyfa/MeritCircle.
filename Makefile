# ==============================================================================
# MERIT CIRCLE — MAKEFILE
# ==============================================================================

.PHONY: help install dev build lint test clean docker-up docker-down anvil deploy-contracts verify-dod

help: ## Tampilkan daftar command yang tersedia
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install seluruh dependensi pnpm monorepo
	pnpm install

dev: ## Jalankan Next.js development server
	pnpm --filter web dev

build: ## Build frontend Next.js untuk produksi
	pnpm --filter web build

lint: ## Jalankan linter ESLint
	pnpm --filter web lint

typecheck: ## Jalankan TypeScript typecheck
	pnpm --filter web exec tsc --noEmit

anvil: ## Jalankan node blockchain lokal Anvil (port 8545)
	anvil --port 8545 --block-time 1

contracts-build: ## Kompilasi smart contract Foundry
	cd contracts && forge build

contracts-test: ## Jalankan unit test smart contract Foundry
	cd contracts && forge test

deploy-local: ## Deploy smart contract ke Anvil lokal
	cd contracts && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

db-generate: ## Generate Prisma ORM client
	pnpm --filter web exec prisma generate

db-push: ## Sinkronisasi skema Prisma ke database tanpa migrasi
	pnpm --filter web exec prisma db push

db-seed: ## Isi database dengan data mock awal (pools, dummy users)
	pnpm --filter web exec prisma db seed

verify-dod: ## Jalankan skrip audit otomatis Definition of Done
	pnpm --filter web exec tsx scripts/verify-dod.ts

docker-up: ## Jalankan seluruh service via Docker Compose
	docker-compose up -d --build

docker-down: ## Matikan seluruh service Docker Compose
	docker-compose down -v

clean: ## Bersihkan cache build dan node_modules
	rm -rf .next apps/web/.next contracts/out contracts/cache
