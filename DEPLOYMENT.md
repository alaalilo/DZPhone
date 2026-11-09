# DZPhone — Production Deployment Guide

This guide describes deploying the Express + React application to a Node.js host with PostgreSQL. The application must run as a persistent Node.js service; static-only hosting is insufficient for checkout, admin APIs, media uploads, Telegram and AI routes.

## Runtime requirements

- Node.js 20.19+ (or a compatible Node 22 LTS release).
- PostgreSQL reachable from the server.
- HTTPS public origin for production.
- A persistent writable volume for `UPLOADS_DIR`; do not place it under `public/` or `dist/`.

## Environment variables

Set these in the host's secret/environment configuration. Do not commit actual values.

| Variable | Required | Notes |
|---|---:|---|
| `DATABASE_URL` | One DB option required | PostgreSQL URL including provider-specific port/SSL settings. |
| `SQL_HOST` | Alternative | Used with `SQL_PORT`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME`. |
| `SQL_PORT` | No | Defaults to `5432` if omitted. Use the exact port from the provider. |
| `SQL_USER` / `SQL_PASSWORD` / `SQL_DB_NAME` | Alternative | Split connection settings when not using `DATABASE_URL`. |
| `SQL_SSL` or `DATABASE_SSL` | Provider-dependent | Set `true`/`require` when the provider requires TLS. Review certificate requirements. |
| `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` | Yes | Plain password must be at least 12 characters; otherwise use a valid scrypt hash. |
| `ADMIN_SESSION_SECRET` | Yes | Exactly 64 hexadecimal characters representing 32 random bytes; placeholder values are rejected. |
| `APP_URL` | Yes | Canonical public HTTPS origin, e.g. `https://dzphone.dz` (replace this with the final HTTPS domain if it changes). |
| `UPLOADS_DIR` | Yes | Persistent mounted directory outside `public/` and `dist/`. |
| `PORT` | Host-dependent | Defaults to `3000`; use the port required by the platform. |
| `GEMINI_API_KEY` | Optional for deterministic fallback | Required for live Gemini responses. |
| `TELEGRAM_BOT_TOKEN` | Optional | Enables outbound Telegram notifications with the admin chat ID. |
| `TELEGRAM_ADMIN_CHAT_ID` | Optional | Destination for outbound notifications. |
| `TELEGRAM_ADMIN_USER_ID` | Required for callback actions | Only this Telegram account may execute inline admin actions. |
| `TELEGRAM_WEBHOOK_SECRET` | Required for Telegram webhook | Used to validate Telegram's secret-token request header. |

See `.env.example` for names and harmless placeholders. AI Studio may inject some values at runtime; confirm the actual runtime environment rather than assuming they exist.

## SEO domain and sitemap

Before launch, set `APP_URL` to the exact public HTTPS origin (currently intended as `https://dzphone.dz`). Keep the DNS, TLS certificate, `index.html` canonical/Open Graph defaults, and `public/robots.txt` sitemap host aligned. The Express `GET /sitemap.xml` route generates product URLs from the live public catalogue; the static `public/sitemap.xml` is only a homepage fallback for static asset serving. Verify these URLs after deployment:

- `https://YOUR-DOMAIN/robots.txt`
- `https://YOUR-DOMAIN/sitemap.xml`
- `https://YOUR-DOMAIN/` (inspect canonical and Open Graph tags)

Do not submit the sitemap to Search Console until the domain resolves publicly over HTTPS and the sitemap returns HTTP 200 with valid XML.

## Install and build

The project includes `bun.lock`, not `package-lock.json`. Use Bun to reproduce the locked dependency graph:

```bash
bun install --frozen-lockfile
bun run build
```

If the host only supports npm, use `npm install` (not `npm ci`) until a reviewed `package-lock.json` has been generated and committed. Then run:

```bash
npm run build
```

The `npm start` lifecycle selects production mode when `NODE_ENV` is not explicitly set. It serves the built `dist/` frontend and starts the Express API. For non-npm process managers, explicitly set `NODE_ENV=production`.

```bash
NODE_ENV=production npm start
```

## Database preparation

1. Provision a staging database first.
2. Take a verified backup before any schema change.
3. Inspect the current Drizzle schema and compare it against the target database.
4. On a new/empty staging database, run `npm run db:push` (or `bun run db:push`) to apply the current Drizzle schema. This is a schema push, not a reviewed production migration.
5. For schema changes after launch, generate and review migrations with `npm run db:generate`, then apply reviewed migration files with `npm run db:migrate`.
6. Do not run `db:push` blindly against an existing production database; compare the schema, back up first, and test the migration in staging.
7. Validate the 69 administrative wilaya records, but keep courier coverage disabled until the courier and actual rates are confirmed.
8. Re-run the seed only after checking that it uses conflict-safe upserts and does not overwrite merchant-edited rates or stock.

## Persistent media uploads

Set `UPLOADS_DIR` to a persistent writable mount, for example `/var/lib/dzphone/uploads`. The upload route writes image bytes there and serves them through `/media/:filename`. The volume must survive restarts and deployments. Back it up together with the database because product image records store file paths. If the platform has ephemeral disks, use a durable object-storage integration before accepting merchant uploads.

If migrating legacy Base64 images, take a database backup and a copy of the old image data first, then run `npm run migrate:legacy-images` (or the equivalent Bun script) with the persistent `UPLOADS_DIR` set. Verify a sample of migrated images before removing the backup.

## Telegram webhook

After deploying to a public HTTPS URL, register the webhook with Telegram using the server-side secrets. Do not put the bot token or webhook secret in browser code, screenshots or source control. Confirm that `getWebhookInfo` reports the expected URL and test an authenticated callback from the configured admin account.

## Operations

- Test `GET /api/health` and confirm the database status is healthy.
- Check the Telegram outbox monitor for `pending`, `processing`, `sent`, and `failed` events. Events remain pending when Telegram credentials are missing; they are not considered delivered.
- Back up PostgreSQL and the persistent media volume daily, and perform a restore drill before launch.
- Monitor application logs and outbox retries. Never log passwords, session tokens, bot tokens or customer phone numbers unnecessarily.
- Test order creation, phone confirmation, shipment, delivery and cancellation against staging before using production stock.
