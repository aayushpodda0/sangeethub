# SangeetHub

> **Deployment status:** Not deployed from this repository. No live URL, hosting
> provider configuration, CI/CD deployment workflow, or production environment
> configuration is committed. Set the live URL and platform in the deployment
> section below after the first controlled deployment.

A dark-first music discovery and streaming-style web app built around three ideas:
regional/multilingual discovery, **explainable** recommendations (every suggestion says
*why*), and real-time social listening.

Not a Spotify clone — its own branding, UI, and a provider abstraction so the demo
catalog can later be swapped for a real licensed music API without touching the UI.

## Features

- **Auth** — credentials login (Auth.js / NextAuth), hashed passwords, JWT sessions
- **Search** — debounced, matches title/artist/album/genre
- **Player** — persistent across navigation, queue, shuffle, repeat, keyboard shortcuts
  (space = play/pause, arrows = seek/skip)
- **Playlists** — create/rename/delete, reorder tracks, folders, public/private, and
  smart playlists with validated AND rules for genre, language, mood, activity, artist,
  liked status, recent listening, and release date
- **Collaborative playlists** — invite links with Accept/Decline, per-collaborator
  permissions (contributor vs. moderator), activity feed
- **Library** — liked tracks, saved albums, followed artists, listening history
- **Recommendations** — rule-based `RecommendationService`, one plain-language
  explanation per suggestion (`FAVORITE_ARTIST`, `NEW_RELEASE`, `FREQUENT_GENRE`,
  `MOOD_MATCH`, `ACTIVITY_MATCH`, `SIMILAR_LISTENERS`) — see
  [Recommendation engine](#recommendation-engine) below
- **Discover** — mood/activity/language filters, regional charts, independent artists
- **Insights** — total listening time, streak, weekly activity, top artists/genres/
  languages/tracks
- **Party rooms** — real-time listening rooms via Socket.IO: shared votable queue,
  host playback control, synced playback for guests — see
  [Party rooms](#party-rooms) below
- **Profiles** — public profile pages with playlists and derived taste tags
- **Onboarding preferences** — select languages, genres, and moods to tune recommendations, skip setup,
  and update taste preferences from your profile
- **Share links** — native share sheet / clipboard copy for tracks, albums, artists,
  playlists, with generated Open Graph and Twitter preview cards for public entities

## Tech stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · PostgreSQL · Prisma ·
Auth.js · Zustand (player state) · TanStack Query (server state) · Socket.IO
(real-time) · Vitest + Testing Library (unit) · Playwright (E2E) · ESLint + Prettier

## Architecture overview

- `app/` — routes (App Router). Pages are server components where practical, dropping
  into client components for interactivity.
- `app/api/` — REST-ish route handlers. Every route validates input with Zod and
  returns a consistent `{ data }` / `{ error: { code, message } }` shape
  (`lib/api/response.ts`).
- `lib/music/provider.ts` — the typed `MusicProvider` contract. `lib/music/service.ts`
  is the Prisma-backed implementation used by catalog callers; `demo-provider.ts` is a
  backwards-compatible test adapter. Search, track/album/artist pages, discovery,
  recommendations, library hydration, history validation, playlist track validation,
  and party track validation use this boundary. Prisma catalog queries should remain
  inside the service.
- `lib/player/` — Zustand store (`store.ts`) + the hook that owns the real
  `<audio>` element (`use-audio-engine.ts`). Pure queue/shuffle/repeat logic lives in
  the store and is unit-tested without touching the DOM.
- `lib/playlists/` — `rules.ts` holds pure, DB-free authorization logic
  (can-view/can-add/can-remove); `smart-playlists.ts` evaluates owner-scoped rules and
  refreshes materialized smart playlist tracks; `authorization.ts` loads data and applies
  access rules; `serializers.ts` shapes API responses.
- `lib/recommendations/` — `reasons.ts` is pure scoring/explanation logic (unit-tested);
  `deterministic-service.ts` keeps user-specific exclusions and scoring separate from
  catalog candidate reads, which are delegated to `MusicService`; `context.ts` builds
  a user's taste profile from explicit preferences and listening history.
- `lib/preferences/` — validated, user-scoped music preference persistence used by onboarding,
  profile editing, and recommendation context.
- `lib/seo/metadata.ts` — shared canonical URL, Open Graph, Twitter, generated preview image,
  and private-resource metadata helpers. `/api/og` renders deterministic text-based preview cards
  without external or copyrighted artwork.
- `lib/party/` — `playback-state.ts` is the pure elapsed-time calculation (unit-tested);
  `socket-handlers.ts` is the actual Socket.IO event wiring; `types.ts` is the shared
  client/server event contract.
- `server.ts` — custom Node server. Next.js and Socket.IO share one HTTP server so
  party rooms work; this is why `npm run dev`/`start` run `tsx server.ts` instead of
  plain `next`/`next start` (see [Scripts](#scripts)).

The pattern throughout: keep business logic in `lib/`, pure and DB-free where
possible, so it's testable in isolation; route handlers and page components stay thin
and mostly just call into `lib/`.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in a real `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`):
   ```bash
   cp .env.example .env
   ```
3. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
4. Generate the Prisma client, run migrations, and seed demo data:
   ```bash
   npx prisma generate
   npm run db:migrate
   npm run db:seed
   ```
5. Start the app (custom server — this is what makes party rooms work):
   ```bash
   npm run dev
   ```
   Need plain Next dev without real-time party rooms? `npm run dev:no-realtime`.

## Environment variables

See `.env.example`. At minimum:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_URL` | Must match the URL you're actually running on |
| `NEXTAUTH_SECRET` | Random secret for session signing (32+ chars). The production server refuses to start with a placeholder/short one |
| `APP_HOSTNAME` | Optional, default `localhost` |
| `SEED_ADMIN_PASSWORD` | Required when running the seed script |
| `SEED_LISTENER_PASSWORD` | Required when running the seed script |

## Demo catalog

`npm run db:seed` loads a fictional catalog (19 artists, 19 albums, 57 tracks across all nine languages, three demo playlists)
and gives the demo listener some history, likes and follows so recommendations and insights are populated on first login.
It is safe to re-run: catalog rows are updated in place and playlists are only ever appended to.
Cover art is generated SVG (`npm run artwork:generate` rewrites `public/artwork`, deterministically). Demo audio is short
development sample clips, so tracks are 3-9 seconds long; verify licensing and attribution before using any
audio in a public deployment.

## Demo accounts (after seeding — development only)

The seed requires local-only credentials supplied through environment variables; no demo
passwords are committed. In PowerShell:

```powershell
$env:SEED_ADMIN_PASSWORD = "choose-a-local-admin-password"
$env:SEED_LISTENER_PASSWORD = "choose-a-local-listener-password"
npm run db:seed
```

Use strong, unique values and never set these variables to production credentials.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server **with** party rooms (custom server + Socket.IO) |
| `npm run dev:no-realtime` | Plain `next dev`, no Socket.IO — faster if you don't need party rooms |
| `npm run build` | Production build (`next build`) |
| `npm start` | Production server (custom server, same reason as `dev`) |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) — needs a running dev server + seeded DB |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:deploy` | `prisma migrate deploy` (production migrations) |
| `npm run artwork:generate` | Regenerate the demo cover art in `public/artwork` |
| `npm run db:studio` | Prisma Studio |

## Testing

All of `npm run test` runs without a database:

- **Unit** (`tests/unit/`): player queue/shuffle/repeat, playlist authorization rules, recommendation
  scoring, playback-position math, Zod schemas, rate limiter, production env validation, socket-payload schemas.
- **API** (`tests/api/`): the real route handlers *and* real authorization code run against a mocked
  Prisma - covering 401 on every mutating endpoint, owner/moderator/contributor/stranger permissions,
  invite token handling (invalid / expired / duplicate / owner), input validation, and rate limiting.
- **Realtime integration** (`tests/integration/`): the real Socket.IO server with two real clients against an
  in-memory fake DB - host-only playback, vote ordering, cross-room vote blocking, malformed-payload
  survival, queue cap, position-collision regression.
- **E2E** (`tests/e2e/`, Playwright): sign-in, search-and-play, playlist create + add-track. Needs
  `docker compose up -d`, a migrated + seeded DB and a dev server.

Mocked-Prisma tests prove handler/authorization logic, not SQL behaviour or DB constraints.
See `PROJECT_STATUS.md` for exactly what has and hasn't been verified.

## Recommendation engine

`DeterministicRecommendationService` is rule-based, not ML — deliberately, per the
original build spec. For each candidate track it computes several possible reasons
(favorite artist, new release from a followed artist, frequent genre, mood match,
activity match, popularity fallback), weights them, and surfaces the single
highest-weighted one as the shown explanation. `RecommendationService` is an
interface, so a future ML-based implementation is a drop-in replacement — nothing
else in the app needs to change.

## Party rooms

Real-time sync uses Socket.IO over a custom Node server (`server.ts`) so it can share
one HTTP server with Next.js. Auth reuses the existing NextAuth JWT session cookie —
no separate login for sockets. Playback position isn't streamed continuously; instead
the server stores `(startedAt, playbackPosition)` and every client derives the live
position as `playbackPosition + elapsed-time-since-startedAt` (see
`lib/party/playback-state.ts`), with periodic host heartbeats to correct drift. Queue
order is driven by vote score, not insertion order.

## Deployment

### Current deployment record

| Item | Current value |
|---|---|
| Live deployment URL | `<SET_AFTER_DEPLOYMENT>` |
| Platform | Not detected or configured in this repository |
| Recommended architecture | One persistent Node.js 20+ application instance with managed PostgreSQL |
| WebSocket transport | Socket.IO at `/api/socket`, proxied with WebSocket upgrade support |
| Health check | `GET /api/health` |
| Current deployment decision | Not verified / do not treat as production-ready from repository evidence alone |

SangeetHub must run as a long-lived Node process because `server.ts` serves Next.js
and Socket.IO from the same HTTP server. Do not deploy the current architecture to a
serverless-only platform such as Vercel, Netlify, Cloudflare Pages, or AWS Lambda.
Use a persistent Node host such as a VM, container service, Render, Railway, Fly.io,
or DigitalOcean App Platform, with a managed PostgreSQL database. Keep the first
deployment single-instance: rate limiting and party-room state are in-process.

### Required production environment

Set these in the hosting provider's secret/environment configuration. Do not commit
`.env`, passwords, or production connection strings.

| Variable | Required | Production requirement |
|---|---:|---|
| `DATABASE_URL` | Yes | Managed PostgreSQL connection string for the production database |
| `NEXTAUTH_URL` | Yes | Exact public HTTPS origin, for example `https://music.example.com` |
| `NEXTAUTH_SECRET` | Yes | Random secret of at least 32 characters; never reuse a public/example value |
| `PORT` | No | Host-provided port, otherwise defaults to `3000` |
| `APP_HOSTNAME` | No | Bind hostname supplied by the host; defaults to `localhost` |
| `SEED_ADMIN_PASSWORD` | No | Only for a deliberate non-production seed operation |
| `SEED_LISTENER_PASSWORD` | No | Only for a deliberate non-production seed operation |

The production server refuses to start when required database/auth configuration is
missing or the Auth.js secret is a known placeholder or too short.

### Database migration and seed strategy

1. Provision a managed PostgreSQL database and take a backup before changing an
   existing database.
2. Run `npm ci` and `npm run db:deploy` during the release process. The committed
   migration chain currently contains four migrations:
   `0_init`, `20261021183000_add_user_music_preferences`,
   `20261022160000_add_smart_playlists`, and
   `20261101040000_add_collaborator_activity_values`.
3. Run `npm run build`, then start the custom server with `npm start`.
4. Do not run `npm run db:seed` against production by default. Seed only an isolated
   development/staging database using strong credentials supplied through
   `SEED_ADMIN_PASSWORD` and `SEED_LISTENER_PASSWORD`, never values committed to Git.
5. If an existing database has an unresolved baseline, do not run
   `prisma migrate resolve --applied 0_init` until a verified backup and disposable
   clone have proved that the schema matches the baseline. See
   [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Production deployment checklist

See the complete, evidence-based checklist in
[docs/PRODUCTION-VERIFICATION.md](docs/PRODUCTION-VERIFICATION.md). At minimum,
verify the public HTTPS URL, Auth.js configuration, database migration status,
`GET /api/health`, signup/sign-in/sign-out, search, playback, playlists,
collaboration permissions, party-room synchronization, queue voting, mobile layout,
private-resource access controls, and a clean browser console.

## Status, deployment, known gaps

- **`PROJECT_STATUS.md`** - single source of truth: what's done and verified, known bugs, technical debt,
  deployment blockers.
- **`docs/DEPLOYMENT.md`** - hosting requirements (long-running Node + WebSocket + Postgres; not serverless),
  env vars, migrations, reverse-proxy config, health check.
- Notable gaps today: this repository has no recorded live deployment/platform,
  the source local database still needs its reviewed one-time baseline procedure
  (validated only on a disposable clone), no CSP header,
  playlist/profile data loaders still combine user/playlist persistence reads with catalog-shaped
  relations and should be split further if the provider must be enforced at every domain boundary.

## Legal note

SangeetHub does not ship copyrighted music, artwork, or proprietary branding. Catalog metadata and
artwork are fictional/demo data; preview URLs are development fixtures and must be replaced with
assets whose licensing and attribution are verified before public deployment.
