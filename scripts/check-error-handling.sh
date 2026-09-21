#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[check] error helper exists"
[ -f apps/web/src/lib/error.ts ] || { echo "[FAIL] apps/web/src/lib/error.ts missing"; exit 1; }
grep -q "getErrorMessage" apps/web/src/lib/error.ts || { echo "[FAIL] getErrorMessage missing"; exit 1; }
grep -q "getApiErrorMessage" apps/web/src/lib/error.ts || { echo "[FAIL] getApiErrorMessage missing"; exit 1; }

echo "[warn] raw setError calls not using helper (review manually):"
grep -Rn "setError(" apps/web/src --include="*.ts" --include="*.tsx" \
  | grep -v "getErrorMessage" | grep -v "getApiErrorMessage" | grep -v "lib/error.ts" || true

echo "[check] error handling OK"
