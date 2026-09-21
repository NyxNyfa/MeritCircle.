# D00 Root Cause Report: "[object Object]" & Error Handling Sweep

## 1. Overview & Captured Issue
When users clicked "Send OTP" or encountered errors during onboarding / profile save, the browser UI displayed:
```text
[object Object]
```
or an unhandled 500 error from the production server:
```json
{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
```

## 2. Real Status Code & Response Body
- **Status Code 1**: `400 Bad Request` or `500 Internal Server Error`
- **Response Body**:
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "Internal server error"
    }
  }
  ```
  or:
  ```json
  {
    "error": {
      "code": "EMAIL_NOT_SET",
      "message": "Email is not set in user profile"
    }
  }
  ```

## 3. Detailed Root Causes

### A. Root Cause of `[object Object]` in Frontend
In `apps/web/src/lib/api.ts`:
```typescript
if (!res.ok) {
  const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
  throw new ApiError(res.status, code, errorMsg, data);
}
```
When backend returned `{ error: { code: "...", message: "..." } }`, `data.message` was `undefined`.
`data.error` was an **object** `{ code, message }`.
In JavaScript, passing an object into `super(errorMsg)` within an `Error` subclass converts the message string to `"[object Object]"`.
When components rendered `err?.message` or passed `error` directly to JSX `<Alert>{error}</Alert>`, React rendered `"[object Object]"`.

### B. Root Cause of 500 `INTERNAL_ERROR` on OTP & Profile
1. **Resend Email Failure Masking**:
   When Resend rejected an email request (e.g. invalid `RESEND_API_KEY`, or free-tier restriction on `onboarding@resend.dev` only sending to registered account emails), `ResendEmailProvider` threw `new Error(errorMsg)`. Because it was not an `AppError`, the production error middleware swallowed `err.message` and replaced it with `{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}`.
2. **Payload Size Limit on Base64 Avatar**:
   `express.json()` defaulted to `100kb`. When a user uploaded a PNG profile picture (base64 string > 100kb), `body-parser` threw `entity.too.large` (HTTP 413), which was unhandled and caught by the generic error handler as an `INTERNAL_ERROR` 500.

## 4. Solutions Applied
1. **Created Standardized Error Helper** (`apps/web/src/lib/error.ts`):
   - `getApiErrorMessage(res: Response): Promise<string>`
   - `getErrorMessage(err: unknown): string`
   Safely unpacks nested error objects, handles strings, instances of `Error`, and ensures that `[object Object]` is never returned.
2. **Updated `fetchApi` in `apps/web/src/lib/api.ts`**:
   Properly extracts `data.error.message`, `data.message`, or `data.error.code` before instantiating `ApiError`.
3. **Replaced Raw Error Handlers Across All Web Pages & Components**:
   - `apps/web/src/components/profile/OnboardingForm.tsx`
   - `apps/web/src/providers/AuthContext.tsx`
   - `apps/web/src/providers/WalletContext.tsx`
   - `apps/web/src/hooks/usePools.ts`
   - `apps/web/src/hooks/useReputation.ts`
   - `apps/web/src/components/pool/JoinPoolModal.tsx`
   - `apps/web/src/components/payment/PaymentCard.tsx`
   - `apps/web/src/components/auction/AuctionCard.tsx`
   - `apps/web/src/app/pools/[poolId]/page.tsx`
   - `apps/web/src/app/pay/page.tsx`
   - `apps/web/src/app/groups/[groupId]/page.tsx`
   - `apps/web/src/app/auction/page.tsx`
   - `apps/web/src/app/admin/page.tsx`
   - `apps/web/src/app/admin/users/page.tsx`
   - `apps/web/src/app/admin/reputation/page.tsx`
   - `apps/web/src/app/admin/pools/page.tsx`
   - `apps/web/src/app/admin/groups/page.tsx`
   - `apps/web/src/app/admin/groups/[groupId]/page.tsx`
   - `apps/web/src/app/admin/audit/page.tsx`
   - `apps/web/src/app/admin/auctions/page.tsx`
4. **Backend Payload & Resend Improvements**:
   - Increased body-parser JSON limit to 10MB in `apps/backend/src/app.ts`.
   - Handled HTTP 413 `PAYLOAD_TOO_LARGE` in `apps/backend/src/middleware/error.ts`.
   - Converted Resend provider errors to `AppError(..., 502, "EMAIL_DELIVERY_FAILED")` in `apps/backend/src/modules/email/email.provider.ts`.

## 5. Verification
- `scripts/check-error-handling.sh`: Passed (0 raw error leaks).
- `pnpm --filter "@merit-circle/web" run typecheck`: Passed (0 type errors).
- `pnpm --filter "@merit-circle/backend" run test`: Passed (101/101 tests).
