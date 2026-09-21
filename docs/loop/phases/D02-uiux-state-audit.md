# D02 — Audit State UI/UX Semua Halaman

## Scope & Tasks
Audit EVERY user and admin route against state requirements:
- Loading state exists (skeleton or spinner)
- Empty state exists with helpful CTA
- Error state shows readable string (never `[object Object]`)
- Success state exists where action happens
- Disabled buttons have visible reason (tooltip / helper text)
- Forms show inline validation messages
- Join pool gate explains username + verified email requirement
- Active group limit message shown when reached
- Auction page: non-final shows bid form, final cycle shows full reward and NO bid form
- No final surplus wording anywhere in UI
- Payment page shows due date and late penalty preview
- Toasts / alerts never render raw objects

## Output
`docs/loop/reports/D02-uiux-audit.md` with table:
`route | state | status | fixed?`

## Validation
- `pnpm --filter "@merit-circle/web" run --if-present typecheck`
- `pnpm --filter "@merit-circle/web" run --if-present build`
