# D00 — Root Cause "[object Object]" + Standarisasi Error Handling

## Bug Report
Onboarding page "Send OTP" button shows alert text `[object Object]` or `{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}`.

## Scope & Tasks
1. Search ALL places in `apps/web` that display errors:
   `setError(...)`, `toast(...)`, `alert(...)`, `{error}`, `{err}`, `String(err)`.
2. Create `apps/web/src/lib/error.ts` with two helpers:
   - `getErrorMessage(err: unknown): string`
   - `getApiErrorMessage(res: Response): Promise<string>`
   Both must ALWAYS return a human-readable string and never `[object Object]`.
3. Replace every raw object error rendering with these helpers.
4. Reproduce the Send OTP request against the backend and capture the REAL error (status code + response body).
5. Write findings to `docs/loop/reports/D00-root-cause.md`:
   - Real status code
   - Real response body
   - Root cause of the OTP failure
   - List of files fixed for error rendering

## Validation
- `./scripts/check-error-handling.sh`
- `pnpm --filter "@merit-circle/web" run --if-present typecheck`
