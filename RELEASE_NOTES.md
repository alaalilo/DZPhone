# DZPhone Final Engineering Patch — Release Notes

This patch focuses on order integrity, trustworthy user feedback, operational configuration, product data integrity, and mobile usability.

## Implemented

- Checkout success now requires a successful server response; offline/local pseudo-orders were removed.
- Chat session creation and message sending no longer fabricate successful server/AI results.
- Order cancellation locks the order row and affected product rows to prevent duplicate stock restoration under concurrent requests.
- PostgreSQL runtime and Drizzle configuration support `DATABASE_URL` or split `SQL_*` settings, including `SQL_PORT` and SSL options.
- Production startup validates database connectivity, admin credentials, session secret, HTTPS app URL, and persistent media storage.
- Admin product images upload as validated binary files to a non-public persistent directory rather than Base64 JSONB payloads.
- Unknown stock is treated as unavailable; sample stock is not inferred as real inventory.
- Used-device inspection values are disclosed as templates until the seller verifies a single physical unit with a real uploaded image.
- Public product lookup and customer chat initialization reject hidden/draft/nonexistent products.
- Telegram outbox uses DB-backed row claiming, lease-based recovery, retries and does not mark events sent when Telegram is unconfigured.
- Product gallery no longer presents crops of one image as separate camera/display inspection photographs.
- Mobile navigation and repeated cart/filter entry points were simplified; inaccurate blanket delivery/time claims were removed.
- Wilaya seed supports codes 01–69; codes 59–69 are disabled pending confirmation of courier coverage and fees.
- Deployment, security, test and launch documentation was reconciled with actual scripts and configuration.

## Verification performed in this environment

- JSON files parsed successfully.
- Wilaya seed contains 69 unique codes; the new codes 59–69 are inactive.
- TypeScript transpile syntax scan: 32 TS/TSX files, zero syntax diagnostics.
- Focused domain smoke checks: 8 assertions passed.
- Archive contents scanned to exclude public source ZIPs, node_modules, real `.env` files and build output.

## Not verified here

The full TypeScript type-check, full unit/integration suite, Vite production build, live PostgreSQL migrations, persistent storage after restart, Gemini responses, Telegram delivery/webhook callbacks, real courier coverage and a complete browser run require installing project dependencies and using the owner's staging services and credentials.

**Readiness: staging verification required. Do not treat this archive as production-approved until the unverified checks pass.**


## SEO, WebP and maintainability patch

- Aligned the static canonical, Open Graph and Twitter metadata, `robots.txt`, `.env.example`, and static sitemap to the intended public origin `https://dzphone.dz`.
- Added `public/sitemap.xml` as a static homepage fallback; the Express `/sitemap.xml` endpoint remains the live database-backed product sitemap.
- Switched bundled seed product image paths and storefront/admin previews to optimized WebP; removed the redundant JPEG copies from `public/images/products/`. Legacy DB JPEG paths are mapped to their WebP counterpart for backward compatibility.
- Split the seller admin dashboard into focused modules, including an independent ProductEditorModal and shared admin constants.
- Removed byte-identical mirrored documentation from `docs/`; root-level documents remain the single source of truth.
- Kept `bun.lock` as the canonical lockfile. Use `bun install --frozen-lockfile`; npm users must run `npm install`, not `npm ci`, until a matching package-lock is generated.
