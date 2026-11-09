# DZPhone — Algerian Smartphone Store

DZPhone is a trilingual React + Express e-commerce application for smartphone sales in Algeria. It supports Arabic RTL, French LTR and English LTR, DZD pricing, cash-on-delivery order workflows, PostgreSQL via Drizzle ORM, a Gemini-powered Smart Deal-Room assistant and optional Telegram notifications.

## Important production behavior

- An order is successful only after the backend confirms database creation. A failed API call never creates a local pseudo-order.
- Prices, discounts, shipping fees and stock checks are calculated on the server.
- Stock is decremented inside a PostgreSQL transaction with row locks; cancellation restores stock while the order row is locked.
- The administrative data model can hold 69 wilayas, but checkout exposes only wilayas marked active. Administrative support does not imply courier coverage. Confirm coverage and rates with the courier before activation.
- Used-device X-Ray metrics are published only when marked `merchant_verified`. A template is not an inspection of the physical unit. Used units require actual merchant-uploaded photos and a single-unit stock record when verified.
- Product media uploads are stored outside the public build directory under `UPLOADS_DIR`. In production this must be a persistent mounted volume.
- Telegram outbox events remain pending when Telegram is not configured; they are not falsely marked as delivered. A background worker claims events using database row locking and retries delivery.
- Hidden and draft products are excluded from public product lookups.

## SEO and canonical origin

- The intended public origin is `https://dzphone.dz`. Set `APP_URL` to the final, verified HTTPS domain on the production host before launch.
- `public/robots.txt` references `/sitemap.xml`. Express serves a live database-backed sitemap at `GET /sitemap.xml`; `public/sitemap.xml` is a small static fallback for environments that serve public assets directly.
- The homepage canonical, Open Graph and Twitter image URLs are aligned to the intended domain. Server-rendered product previews use `APP_URL`.

## Admin code organization

The seller dashboard is split into focused components under `src/components/admin/` (overview, products, product editor, orders, chats, shipping/settings, login gate and shared presentation constants) to keep each module easier to review and maintain.

## Architecture

- Frontend: React, TypeScript, Vite and Tailwind CSS.
- Backend: Node.js and Express.
- Database: PostgreSQL with Drizzle ORM.
- AI: Google Gemini API, with a database-grounded deterministic fallback.
- Notifications: PostgreSQL transactional outbox and Telegram Bot API.
- PWA: manifest, service worker and offline storefront shell.

## Development

Requirements: Node.js 20.19+ and PostgreSQL for API-backed functionality. Install dependencies using `bun install --frozen-lockfile` (the repository lockfile is `bun.lock`) or `npm install`. Start local development with `npm run dev` and build the frontend with `npm run build`. See `DEPLOYMENT.md` for the production setup.

## Before commercial launch

Set strong production secrets, provision PostgreSQL, configure persistent `UPLOADS_DIR`, verify courier coverage and shipping prices, enter actual stock, upload authentic photos, and complete the staging launch checklist. Automated source checks do not replace tests against the real database, Gemini credentials, Telegram bot and courier operations.
