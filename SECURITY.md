# DZPhone — Security Notes and Operational Controls

## Implemented controls (source-level)

- Admin password verification uses scrypt and constant-time comparison; session tokens are HMAC signed and include a nonce. Production startup requires an admin password/hash and a 64-hex-character `ADMIN_SESSION_SECRET` generated from 32 random bytes.
- Preview/operator authentication is disabled in production. Admin routes are protected by server-side middleware.
- Request validation uses Zod schemas; SQL access uses Drizzle/parameterized PostgreSQL queries.
- Rate limits cover admin login, order submission, order tracking and chat message submission. Security headers are set by middleware.
- Service-worker caching excludes admin, order, chat and webhook API paths.
- Product image upload requires authentication, has a 5 MiB size cap, restricts declared MIME types and checks file signatures. Files are stored outside `public/` and `dist/` under `UPLOADS_DIR`, then served through a constrained `/media/:filename` route.
- Public product detail lookup excludes hidden and draft products.
- Telegram webhook checks the secret-token header and validates the configured admin Telegram identity before handling admin callbacks.
- Outbox events use database row claiming (`FOR UPDATE SKIP LOCKED`), a lease, retry backoff and terminal failure after the retry budget. Missing Telegram credentials do not mark events as sent.

## Important deployment requirements

1. Store secrets in the hosting secret manager only. Never expose server secrets through React/Vite-prefixed environment variables, logs, source control or public files.
2. Set a unique production admin password and `ADMIN_SESSION_SECRET` (exactly 32 random bytes encoded as 64 hexadecimal characters). Rotate any credentials previously disclosed in chat, screenshots or public repositories.
3. Set `APP_URL` to the real public HTTPS origin. Set `UPLOADS_DIR` to a persistent writable volume outside the static web root.
4. Restrict CORS and trusted proxy hops to the actual deployment topology.
5. Back up PostgreSQL and the media volume together. Perform restore drills.
6. Keep order phone numbers and customer notes out of routine application logs. Access them only through authenticated admin flows.

## Limitations to account for

- The outbox worker is a process-managed interval worker. For multi-instance deployments, DB claiming prevents two workers from claiming the same event concurrently, but delivery is at-least-once: a process can crash after Telegram accepts a message but before the database marks it sent. Operational review must account for the possibility of a duplicate notification after lease expiry.
- Webhook replay tracking is process-local; order state transitions are separately validated and locked in the database. For strict cross-instance webhook replay storage, add a persistent table with unique Telegram `update_id` and `callback_query.id` constraints.
- `/media` assets are public product assets. Do not upload identity documents, private customer photos or other non-public material to this bucket. Use private object storage for sensitive files.
- This archive was not tested against the store owner's live production database, Gemini credentials, Telegram bot, hosting filesystem or courier. Those integrations require staging verification.

## Release archive handling

The application does not provide an unauthenticated release-archive download endpoint. Keep source ZIPs, database dumps and environment files outside `public/`, `dist/` and the deployed static asset directory. The source archive should be shared privately with developers only.
