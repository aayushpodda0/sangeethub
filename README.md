# SangeetHub

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
- **Playlists** — create/rename/delete, reorder tracks, folders, public/private
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
- **Share links** — native share sheet / clipboard copy for tracks, albums, artists,
  playlists

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
- `lib/music/provider.ts` — the `MusicProvider` interface. `lib/music/demo-provider.ts`
  is the only implementation today; swap in a real API later without touching callers
  that go through it (currently: search). Track/album/artist detail pages query Prisma
  directly rather than through the provider — a known inconsistency, see
  [Future improvements](#future-improvements).
- `lib/player/` — Zustand store (`store.ts`) + the hook that owns the real
  `<audio>` element (`use-audio-engine.ts`). Pure queue/shuffle/repeat logic lives in
  the store and is unit-tested without touching the DOM.
- `lib/playlists/` — `rules.ts` holds pure, DB-free authorization logic
  (can-view/can-add/can-remove); `authorization.ts` loads data and applies those rules;
  `serializers.ts` shapes API responses.
- `lib/recommendations/` — `reasons.ts` is pure scoring/explanation logic (unit-tested);
  `deterministic-service.ts` is the thin DB-querying `RecommendationService`
  implementation; `context.ts` builds a user's taste profile from their history.
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
| `NEXTAUTH_SECRET` | Random secret for session signing — generate your own, don't reuse the placeholder |

## Demo accounts (after seeding)

- Admin: `admin@sangeethub.local` / `Admin@12345`
- Listener: `listener@sangeethub.local` / `Listener@12345`

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
| `npm run db:studio` | Prisma Studio |

## Testing

- **Unit** (`tests/unit/`): pure logic only — player queue/shuffle/repeat, playlist
  authorization rules, recommendation scoring/explanations, party playback-position
  math, Zod schema validation. These deliberately avoid touching Prisma so they run
  fast with no DB required.
- **E2E** (`tests/e2e/`): sign-in, search-and-play, playlist create + add-track, each
  against the seeded demo account. Requires `docker compose up -d`, a migrated +
  seeded DB, and `npm run dev` (or let Playwright's `webServer` config start it).

Run `npm run test` before any commit that touches `lib/`; run `npm run test:e2e`
before anything that touches a core user flow (auth, player, playlists, party).

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

## Known gaps / future improvements

- Track/album/artist detail pages bypass the `MusicProvider` abstraction (query Prisma
  directly) — only search goes through it today. Worth unifying before swapping in a
  real music API.
- No test coverage yet for the API route layer itself (auth, validation, error
  shapes) — current tests cover business logic, not the HTTP boundary.
- UI is functional but not visually polished — low hierarchy, no real imagery
  (gradient placeholders throughout), dense text blocks. A dedicated design pass is
  still pending.
- Production deployment of the custom server (`server.ts`) hasn't been set up on any
  specific host — `npm start` works locally but whatever platform this deploys to
  needs to support a long-running Node process (not pure serverless) for Socket.IO.

## Legal note

SangeetHub does not ship copyrighted music, artwork, or proprietary branding. All
metadata, artwork, and audio previews in this repository are fictional or
explicitly demo-safe, for development and portfolio purposes only.
