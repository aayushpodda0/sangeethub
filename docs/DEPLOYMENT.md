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
| `SEED_ADMIN_PASSWORD` | only if seeding | Seeding with `NODE_ENV=production` refuses to run without it |

## First deploy

```bash
npm ci                      # `postinstall` runs `prisma generate`
npm run db:deploy           # prisma migrate deploy  (see "Migrations" - needs a committed baseline)
npm run build               # next build
npm start                   # production custom server (Next + Socket.IO)
```

Optional demo data: `npm run db:seed`. **Don't seed a real production database** with demo accounts
(the demo listener account has a known password). Seeding in production requires `SEED_ADMIN_PASSWORD`.

## Migrations — one-time setup required

The repository currently has **no committed `prisma/migrations` folder**, so `prisma migrate deploy`
has nothing to apply. Create the baseline once, on your dev machine, and commit it:

```bash
# Fresh dev database:
npx prisma migrate dev --name init

# OR, if your dev database was created with `prisma db push`, baseline it without resetting data:
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init
```

Then commit `prisma/migrations/`. After that, every schema change is `npx prisma migrate dev --name <change>`
locally and `npm run db:deploy` on the server. The recent `PlaylistActivityType` enum additions
(`COLLABORATOR_*`) must be included in whatever migration you create.

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
