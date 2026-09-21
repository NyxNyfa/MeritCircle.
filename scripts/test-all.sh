#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[test-all] Typecheck..."
pnpm run typecheck

echo "[test-all] Backend tests..."
pnpm --filter "@merit-circle/backend" run test

echo "[test-all] Web build..."
pnpm --filter "@merit-circle/web" run build

echo "[test-all] All checks passed!"
