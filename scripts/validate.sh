#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() {
  echo "[validate] $1"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "[FAIL] Command $1 is required"; exit 1; }
}

file_exists() {
  [ -f "$1" ] || { echo "[FAIL] File $1 is required"; exit 1; }
}

PHASE="${1:-phase-15-uiux-debug-sweep}"

case "$PHASE" in
  phase-15-uiux-debug-sweep)
    say "Validating phase-15-uiux-debug-sweep"

    require_command pnpm

    file_exists apps/web/src/lib/error.ts
    file_exists docs/loop/reports/D00-root-cause.md
    file_exists docs/loop/reports/D02-uiux-audit.md
    file_exists docs/testing/FINAL_QA_REPORT.md

    ./scripts/check-error-handling.sh
    ./scripts/test-all.sh

    say "PHASE_OK phase-15-uiux-debug-sweep"
    ;;
  *)
    say "Unknown phase: $PHASE"
    exit 1
    ;;
esac
