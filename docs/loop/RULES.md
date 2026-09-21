# Loop Rules for Merit Circle Debug & QA

## Scope & Execution Rules
1. **Micro-Phase Isolation**: Fix ONLY the current micro-phase scope. One micro-phase per session.
2. **Minimal Changes**: No redesign, no unnecessary refactoring, no feature scope creep.
3. **Preserve Business Logic**:
   - No final surplus.
   - Final cycle is full payout.
   - BNB Testnet chain ID 97.
   - No KYC / collateral / reserve / QRIS.
4. **No Raw Error Objects**: Never render raw error objects in UI text. All user-facing error messages must be human-readable strings.
5. **Backend Error Contract**:
   ```json
   { "error": { "code": string, "message": string, "details?": unknown } }
   ```
6. **Frontend Error Extraction**: Frontend must always extract message via helper, never display object.
7. **Validation First**: Always run validation scripts before marking micro-phase complete.
8. **Git Cleanliness**: Do not commit secrets, `.env`, or scratch files.
