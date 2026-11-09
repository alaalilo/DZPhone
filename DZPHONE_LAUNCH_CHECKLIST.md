# DZPhone — Launch Checklist

## Before staging

- [ ] Install from the committed lockfile and run build, lint and unit tests.
- [ ] Provision a non-production PostgreSQL database and apply reviewed schema changes.
- [ ] Configure `DATABASE_URL` (or all split `SQL_*` values), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `APP_URL`, `PORT` and persistent `UPLOADS_DIR`.
- [ ] Confirm `GET /api/health` reports a healthy database.
- [ ] Sign in to the admin dashboard; verify preview auth is unavailable in production.
- [ ] Upload a test image and verify it survives server restart and is served from `/media/`.

## Commercial configuration

- [ ] Replace sample phone prices and stock quantities with actual inventory.
- [ ] For each used physical unit, enter its real battery test, condition, included accessories and seller notes.
- [ ] Upload actual photographs for each used physical unit. Do not mark illustrative renders as unit photos.
- [ ] Verify sealed-product images, exact model, storage, color and regional variant.
- [ ] Confirm courier coverage and home/stop-desk rates for each wilaya; activate only verified coverage.
- [ ] Replace and approve the sample privacy, return, warranty and shipping policy copy.
- [ ] Configure the actual public domain, social accounts and customer support details.

## End-to-end staging tests

- [ ] Create a successful order and confirm it appears in PostgreSQL and admin.
- [ ] Simulate API failure during checkout; verify no success message, no pseudo-order and no cart clearing.
- [ ] Attempt concurrent checkout against a single-stock item; verify no overselling.
- [ ] Cancel an order twice/concurrently; verify stock is restored once only.
- [ ] Confirm, ship and deliver an order through authorized admin actions.
- [ ] Configure Telegram and verify order and human-escalation messages.
- [ ] Test unauthorized Telegram callback rejection and valid callback handling.
- [ ] Test Gemini with the live API key and verify responses reflect current database values.
- [ ] Test all language directions, desktop/mobile checkout and PWA install.
- [ ] Back up PostgreSQL and media volume, then restore into a separate staging environment.

## Go-live gate

- [ ] All critical tests pass in staging.
- [ ] No known critical/high security issue remains.
- [ ] Production secrets are newly generated and not reused from chat or source code.
- [ ] Monitoring and backup retention are enabled.
- [ ] Owner approves business policies, stock, prices, courier coverage and public contact details.
