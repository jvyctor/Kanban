# Production Operations

## Secrets and Configuration

- Store `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `CORS_ORIGINS`, SMTP credentials and cookie policy outside the repository.
- Rotate database, Redis and SMTP credentials on a fixed cadence and after any incident.
- Validate `APP_URL` and `CORS_ORIGINS` against the exact production domains before every deploy.
- Require a real SMTP provider with domain authentication before enabling password reset and invitations in production.

## Backups and Rollback

- Take a database backup before every schema migration.
- Keep at least one recent verified restore point.
- Rollback order:
  1. Stop traffic to the new release.
  2. Restore the previous application version.
  3. Restore the database only if the migration is not backward compatible.
  4. Run the smoke check script after rollback.

## Post-Deploy Smoke Check

- Run `node scripts/smoke-check.mjs`.
- Confirm `/health` returns `200` with database and redis `up`.
- Confirm `/auth/me` returns `401` when unauthenticated.
- Confirm frontend returns CSP, `X-Frame-Options` and `Referrer-Policy`.

## Failure Drills

- Redis unavailable:
  - Confirm API still starts.
  - Confirm auth rate limiting falls back to memory and logs a warning.
- SMTP unavailable:
  - Confirm register still works.
  - Confirm password reset request fails cleanly and produces operational logs.
- Database slow or unavailable:
  - Confirm `/health` moves to `degraded`.
  - Confirm request logging exposes latency and failures with `X-Request-Id`.

## Monitoring and Alerts

- Collect JSON logs from stdout/stderr into your log platform.
- Alert on:
  - `/health` degraded
  - repeated `auth.rate_limit.exceeded`
  - repeated `auth.login.failed`
  - elevated 5xx rate
  - elevated response latency
- Track websocket connection count and broadcast latency if available in the platform.
