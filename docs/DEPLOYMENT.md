# Deploying SangeetHub

SangeetHub is **not** a serverless/static app. Party rooms use Socket.IO on a custom Node server
(`server.ts`), so it needs a host that runs a **long-lived Node process** with WebSocket support.

## What you need

| Requirement | Notes |
|---|---|
| Node.js 20+ | Long-running process (VM, container, Render/Railway/Fly/DigitalOcean App Platform, etc.) |
| PostgreSQL 14+ | Any managed Postgres works. One database, no other datastores (no Redis needed) |
| HTTPS + WebSocket proxying | If behind nginx/Caddy/a load balancer, it must forward `Upgrade`/`Connection` headers for `/api/socket` and set `X-Forwarded-For` |
| Single instance (for now) | Rate limiting is in-memory, and Socket.IO rooms are in-process. Scale up (bigger box), not out, until those are moved to a shared store |

**Will NOT work as-is on:** Vercel, Netlify, Cloudflare Pages, AWS Lambda — they can't hold the WebSocket server.
(You could deploy the Next.js app there and run the socket server separately, but that split isn't implemented.)

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXTAUTH_URL` | yes | Your public URL, e.g. `https://sangeethub.example.com` |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32`. The server **refuses to start** in production if this is missing, still the `.env.example` placeholder, or under 32 chars |
| `PORT` | no | Default 3000 |
| `APP_HOSTNAME` | no | Default `localhost`. Don't use `HOSTNAME` — hosts set that to a container id |
| `SEED_ADMIN_PASSWORD` | only if seeding | Required when running the seed |
| `SEED_LISTENER_PASSWORD` | only if seeding | Required when running the seed |

## First deploy

```bash
npm ci                      # `postinstall` runs `prisma generate`
npm run db:deploy           # prisma migrate deploy
npm run build               # next build
npm start                   # production custom server (Next + Socket.IO)
```

Optional local demo data: `npm run db:seed`. The seed requires both
`SEED_ADMIN_PASSWORD` and `SEED_LISTENER_PASSWORD`; provide strong local-only values and
never seed a production database with demo accounts.

## Migrations

The repository includes a three-migration chain:

1. `0_init` — the pre-preferences/pre-smart-playlists schema baseline, including the current
   collaboration activity enum values.
2. `20261021183000_add_user_music_preferences`
3. `20261022160000_add_smart_playlists`

The chain was verified with `prisma migrate deploy` against a fresh isolated PostgreSQL database.
After that, every schema change is `npx prisma migrate dev --name <change>` locally and
`npm run db:deploy` on the server.

For an existing database that already contains the schema and the two feature changes, do not run
`migrate deploy` or reset the database until the baseline has been tested against a staging clone.
Take a backup, compare the live schema with `0_init`, and test the exact procedure on the clone.
Only after that validation, mark the baseline as applied on the matching database:

```bash
npx prisma migrate resolve --applied 0_init
npm run db:deploy
```

Do not run those commands against production or an unknown database without a verified backup and
staging result. If the database is not an exact match, stop and create a reviewed migration plan
instead of forcing the migration history.

## Health check

`GET /api/health` → `200 {"status":"ok","database":"up"}` or `503 {"status":"degraded","database":"down"}`.
It returns no version/config/error details. Point your load balancer / uptime monitor at it.

## Reverse proxy example (nginx)

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;       # WebSocket upgrade for party rooms
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # used by rate limiting
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Security notes

- Security headers (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production) are set in `next.config.ts`.
- No `Content-Security-Policy` yet (needs a nonce setup because `next-themes` injects an inline script) — see `PROJECT_STATUS.md`.
- Signup and login are rate limited per process (10 attempts / 15 min per IP, per IP+email for login). Only trustworthy if your proxy sets `X-Forwarded-For` and clients can't reach the app directly.
- Logs go to stdout/stderr; there is no log shipping or error tracking configured.
- Dependency gate (2026-11-01): Next.js was upgraded from 16.3.0 to 16.4.3, with matching
  `eslint-config-next`; Zod, Socket.IO/Engine.IO, Sharp, and source-map-js were patched.
  The audit changed from 1 critical + 7 high findings to 3 high findings in Prisma 6's
  `deepmerge-ts` configuration path. Prisma 7.10.1 is the available audit fix but is a major
  migration requiring a reviewed client/config/adapter change; do not use `npm audit fix --force`.
  Production release remains blocked until this exception is accepted for staging or Prisma 7
  is migrated and fully tested.
