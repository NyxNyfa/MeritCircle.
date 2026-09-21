# D05 — Final Smoke + Report

## Scope & Tasks
Run manual smoke against live or local environment:
- Onboarding: set username, set email, Send OTP shows readable message or dev code
- Confirm OTP works and reputation updates
- Pools, join gate, payment, auction, final cycle rules
- Admin pages load and actions audited

Write `docs/testing/FINAL_QA_REPORT.md` section "Phase 15" with:
- Root cause summary
- Fixes list
- Remaining known issues with severity
- Verdict: READY / READY WITH WAIVER / NOT READY

## Validation
- `./scripts/validate.sh phase-15-uiux-debug-sweep`
