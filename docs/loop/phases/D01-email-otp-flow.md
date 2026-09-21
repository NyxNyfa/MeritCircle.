# D01 — Perbaiki Flow Email OTP End-to-End

## Scope & Tasks
1. **Profile email persistence**:
   - Ensure frontend saves email via `PATCH /api/profile` before requesting OTP or pass email in request body.
2. **Request OTP**:
   - Show inline field error if email format is invalid.
   - Show friendly message for `EMAIL_NOT_SET`, `RATE_LIMITED`, provider failure.
   - Button must show loading state and disable while requesting.
3. **Confirm OTP**:
   - Wrong code -> friendly inline error, not object.
   - Expired code -> friendly message + resend CTA.
   - Success -> show verified badge and award reputation once.
4. **Dev mode**:
   - If `EMAIL_PROVIDER=console` and `NODE_ENV != production`, surface `devCode` safely in UI only when `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true` or explicit demo flag.
5. **Backend tests**:
   - Request without email returns readable message.
   - Confirm wrong code rejected.
   - Confirm correct code verifies once.
   - Rate limit returns 429 with readable message.

## Validation
- `./scripts/test-backend.sh`
