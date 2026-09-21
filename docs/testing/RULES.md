# Testing & QA Rules

## Testing Standards
1. **Automated Verification**:
   - Backend unit and integration tests run via Vitest.
   - Frontend type checks run via TypeScript compiler (`tsc --noEmit`).
   - Next.js build verification via `next build`.
2. **Deterministic Tests**:
   - No flaky assertions. Mock external email services (Resend) and Web3 RPC where appropriate.
   - Database tests should use transactional rollback or isolated test records.
3. **Smoke Testing**:
   - Manual smoke checklists in `docs/testing/smoke/` must be followed prior to release.
