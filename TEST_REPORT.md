# DZPhone — Final Patch Test Report

## Source-level changes in this patch

- Removed the browser-side pseudo-order fallback. `createOrder()` returns success only after a successful `/api/orders` response.
- Removed fake local chat session and assistant response creation. Failed chat API submissions are rolled back from optimistic UI state and surfaced as errors.
- Added PostgreSQL row locking for order status transitions and cancellation stock restoration.
- Added `DATABASE_URL` / split SQL credentials support including `SQL_PORT` and SSL settings to runtime and Drizzle config.
- Added production startup validation for database, a 12+ character admin password or valid scrypt hash, a 64-hex-character session secret, HTTPS `APP_URL` and persistent `UPLOADS_DIR`.
- Added authenticated image upload to a non-public persistent directory with MIME/signature and size checks.
- Reworked Telegram outbox claiming with `FOR UPDATE SKIP LOCKED`, processing lease, retry backoff and no false `sent` state when credentials are missing.
- Added safer inspection disclosure, removed pseudo multi-angle cropping of a single product image, and made unknown stock fail closed in customer/admin views.
- Aligned docs, manifest and canonical metadata to the intended production domain `https://dzphone.dz`; set `APP_URL` to the final verified HTTPS origin before deployment.
- Corrected the package documentation to match the included `bun.lock`; npm `npm ci` is not supported until a package-lock is generated.

## Verification status

| Check | Status | Evidence / limitation |
|---|---|---|
| ZIP extraction and source inspection | PASS | Source archive extracted and key files inspected. |
| Source scans for fake order fallback | PASS (manual) | `createOrder()` uses only backend POST. |
| Telegram missing-credentials behavior | PASS (source review) | Events remain pending; not labelled sent. |
| Database row lock for order cancellation | PASS (source review) | Order and product rows are locked in transaction. |
| DB URL and split connection configuration | PASS (source review) | Runtime and Drizzle support the same options. |
| Public archive exposure | PASS (source review) | No archive is shipped under public assets; release archive is not published. |
| TypeScript syntax scan | PASS | TypeScript transpile parser inspected 32 `.ts` / `.tsx` files; 0 syntax diagnostics. This is not a full type-check. |
| Full TypeScript type-check (`tsc --noEmit`) | BLOCKED | Global TypeScript reported missing `@types/node` and `vite/client`; project dependencies are not installed. |
| Domain smoke tests | PASS | 8 isolated Node 22 assertions passed for Algerian phone normalization, order-state transitions, DZD totals and multilingual human-escalation detection. These are focused smoke checks, not the complete project test suite. |
| Full unit/integration suite | NOT RUN | No `node_modules` or live PostgreSQL staging database was supplied. |
| Bun lockfile root dependency parity | PASS (structural) | Every root dependency and devDependency in `package.json` matches the `bun.lock` workspace entries; a frozen install was not run because Bun is unavailable here. |
| Vite production build | NOT RUN | Dependency installation unavailable. |
| Real Telegram delivery and webhook callback | UNVERIFIED | Requires the owner's live bot secrets and public HTTPS deployment. |
| Gemini live API | UNVERIFIED | Requires production API key. |
| Persistent volume durability | UNVERIFIED | Depends on the selected hosting provider and mounted volume. |
| Actual courier rates and coverage | UNVERIFIED | Must be confirmed with the contracted courier and configured in admin. |

## Known operational caveats

- A persistent shared object store is preferable to a local filesystem when deploying multiple instances or ephemeral container hosts. `UPLOADS_DIR` must survive restarts and deployments.
- Telegram delivery is at-least-once; a rare crash after Telegram accepts a message but before the database records success can produce a duplicate on retry.
- Webhook replay IDs are process-local in the current implementation. Add persistent unique event storage before multi-instance high-volume production use.
- The owner must replace all seeded/sample stock and prices with actual inventory and commercial prices.


## Follow-up patch — SEO alignment, WebP and admin modularization

### Implemented

- Set static canonical, Open Graph and Twitter URLs to `https://dzphone.dz` to match the sitemap host and configured production `APP_URL`. Change all three together if the final domain differs.
- Added a valid static `public/sitemap.xml` homepage fallback. The Express `GET /sitemap.xml` route already exists and remains the authoritative live sitemap, adding all currently available database products.
- Updated bundled seed product URLs to WebP as the primary asset, switched storefront/product detail/admin previews to the preferred WebP URL, and removed the six redundant JPEG copies (saving approximately 3.8 MB of source assets). Old database `.jpg` paths remain backward-compatible through the existing WebP mapping.
- Split the 76 KB `AdminDashboard.tsx` into focused files: `AdminDashboard.tsx`, `AdminLoginGate.tsx`, `OverviewTab.tsx`, `ProductsAdminTab.tsx`, `ProductEditorModal.tsx`, `OrdersAdminTab.tsx`, `ChatsAdminTab.tsx`, `ShippingAndSettingsTab.tsx`, and `admin-shared.ts`. The root dashboard file is now approximately 4.6 KB.
- Removed identical duplicate copies of root documentation from `docs/`; the root documents are authoritative.
- Kept `bun.lock` as the single lockfile. Documentation consistently instructs Bun frozen install, or `npm install` (not `npm ci`) when using npm.

### Checks executed in this patch

| Check | Result |
|---|---|
| TypeScript/TSX parser scan | PASS — 40 files parsed; 0 syntax diagnostics (not a full type-check). |
| Local source import path scan | PASS — 40 files scanned; 0 unresolved local/alias imports. |
| SEO host consistency | PASS — canonical, OG URL/image, Twitter image, robots sitemap and static sitemap use `https://dzphone.dz`. |
| Sitemap XML parsing | PASS — `public/sitemap.xml` parses as valid XML; Express database-backed sitemap route is present. |
| Bundled product assets | PASS — all 6 primary seed image paths end in `.webp` and the matching files exist; no bundled product `.jpg` files remain. |
| JSON configuration parsing | PASS — package, metadata, PWA manifest and 69-wilaya seed JSON parse successfully. |
| Duplicate docs | PASS — identical root/document mirror directory removed. |
| `npm install --ignore-scripts --no-audit --no-fund` | BLOCKED — command timed out; no `node_modules` or `package-lock.json` was created. |
| `tsc --noEmit` | BLOCKED — TypeScript reports missing `@types/node` and `vite/client` because project dependencies are not installed. |
| Bun install, lint, tests and Vite build | NOT RUN — Bun is not installed in this environment, and dependency installation timed out. |

### Domain deployment note

The repository currently assumes `https://dzphone.dz` because that is the domain supplied in the requested SEO correction. Confirm domain ownership, DNS records and HTTPS before deploying. Set production `APP_URL` to the final exact origin.
