# D03 — Audit Kontrak Error Backend

## Scope & Tasks
Audit ALL backend endpoints for a consistent error contract:
```json
{ "error": { "code": string, "message": string, "details?": unknown } }
```

Verify and fix:
- 400 validation errors include field-level details and readable message
- 401 for missing/invalid token
- 403 for non-admin on admin routes and non-member on group resources
- 404 for unknown entities
- 409 for duplicates (username, email, txHash, bid)
- 429 for rate limits with readable retry message
- 500 never leaks stack trace or secrets in production
- All admin mutating actions write AuditLog
- Payment confirm remains idempotent
- OTP stored hashed only

## Validation
- `./scripts/test-backend.sh`
