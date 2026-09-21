# D04 — Regression Tests

## Scope & Tasks
Add or fix automated tests covering bugs found in D00–D03:
- Error helper always returns string (unit test with object, nested object, Error, string)
- Email OTP request/confirm/rate-limit tests
- API error shape tests for 400/401/403/404/409/429
- Frontend build passes with zero type errors

## Validation
- `./scripts/test-all.sh`
