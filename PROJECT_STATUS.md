# SangeetHub Status

Single source of truth for completion. **Evidence levels:** *Automated* = covered by tests that pass;
*Manual* = verified by the owner running the app; *Unverified* = implemented but not yet checked.
Don't move something to Completed without evidence.

## Completed

| Area | Evidence |
|---|---|
| Auth: credentials login/signup, bcrypt hashing, JWT sessions, protected routes, signup + login rate limiting | Automated (signup API, schemas, limiter); login flow Manual |
| Search / discover filters (input validated → 400) | Automated (validation); UI Manual |
| Player: queue, shuffle, repeat, reorder, keyboard shortcuts | Automated (store logic, 14 tests); audio engine + UI Manual |
| Library: likes, saved albums, follows, history | Automated (401s, 404-on-unknown-id, user scoping); UI Manual |
| Playlists: CRUD, reorder, folders, public/private | Automated (authorization + validation); UI Manual |
| Collaboration: invites (accept/decline), contributor/moderator permissions, collaborator management, activity feed | Automated (≈40 API tests: every mutating route rejects anonymous; owner/moderator/contributor/stranger matrix; invalid/expired/duplicate/owner tokens) |
| Recommendations (rule-based + explanations) | Automated (scoring/explanations); DB query layer Manual |
| Party rooms: join, shared votable queue, host-only controls, synced playback | Automated (11 tests: real Socket.IO server + 2 clients, in-memory DB); **real multi-browser sync Unverified** |
| Like / follow / save-album / add-to-queue / add-to-playlist actions on track, album, artist pages and track lists | Automated (15 component tests: optimistic update, rollback on failure, double-click guard, 409 handling, outside-click/Escape dismissal; plus API tests) |
| Demo catalog: 19 fictional artists, 19 albums, 57 tracks across all 9 languages, generated cover art, seeded demo-listener history/likes/follows | Automated (10 integrity tests: unique slugs, valid enums, references resolve, every language covered, durations match audio) ; reseed itself Manual |
| Similar tracks (explainable weighted scoring) | Automated |
| **Global navigation**: desktop sidebar + mobile bottom tab bar (+ More menu), active-page state, user card, sign-out; hidden for signed-out visitors and on landing/login/signup | Automated (21 tests: visibility rules, links, `aria-current`, sign-out, More menu, Escape, player offset); **visual layout Unverified in a browser** |
| Insights, profiles, sharing | Manual |
| Security hardening (see below), health endpoint, prod env validation | Automated where marked |

## Current phase
Finalization: audit → harden → test → document. Audit baseline: commit `f1819db`, 2026-10-12.

## In progress
- UI polish: tokens, fonts, home, track list, track/album/artist pages and the app shell are done. The *page headers/layouts* of search, library, discover, insights, playlists, party, profile, login and landing still use the old styling (artwork and navigation are already in place on them).

## Remaining
- Expandable full-screen mobile player (the mobile tab bar exists; the player bar itself is still the desktop layout on small screens).
- Artwork now renders on track/album/artist pages, track lists, search, library, discover, playlist rows, home sidebar and the player bar. Still missing: playlist cover images on the playlists list/detail pages, party room.
- Run and fix the Playwright E2E suite (specs exist; never executed by the author of this audit).
- Loading/empty/error-state pass verified in a browser on every page (implemented in code, not visually verified).

## Known Bugs
- None known. (A party-queue add failure after removals/skips and a server crash on malformed socket payloads were found and fixed in this audit — see Last Audit.)

## Technical Debt
- The sidebar stops above the player bar using a constant (`PLAYER_BAR_HEIGHT` in `components/shell/app-shell.tsx`); if the player bar's height changes, update it.
- Light mode has tokens but has never been reviewed visually.
- Demo audio clips are only 3, 6 and 9 seconds long, so demo tracks are listed with those true durations. Swap `PREVIEW_CLIPS` in `prisma/seed-data.ts` for longer royalty-free audio and rerun `npm run db:seed`.
- `AddToPlaylistMenu` only lists playlists you own (the playlists API doesn't say which collaborative playlists you may edit).
- Album/artist pages query Prisma directly; only tracks/search go through `MusicProvider`. **Deliberate:** adding provider DTOs for a provider that doesn't exist yet would be speculative. Revisit when integrating a real API.
- API tests mock Prisma: they prove handler/authorization logic, not SQL, constraints, or cascades. A real-Postgres integration suite (CI service container) would close this gap.
- Rate limiting and Socket.IO rooms are in-process → single instance only.
- `authorize()` skips the bcrypt comparison when the email doesn't exist (minor timing side-channel for account enumeration).
- Party rooms are never expired/cleaned up; if the host disconnects, host controls stay unavailable until they return.
- Discover UI duplicates the filter constants now centralized in `lib/music/taxonomy.ts`.
- Private playlists return 403 rather than 404 (reveals that an unguessable id exists).

## Deployment Blockers
1. **No committed `prisma/migrations`** → `prisma migrate deploy` has nothing to run. Baseline once (see `docs/DEPLOYMENT.md`) and commit it. Include the new `COLLABORATOR_*` activity enum values.
2. **`npm run build` and full `npm run typecheck` not yet confirmed** in the audit environment (it cannot download Prisma engines). Run both locally.
3. Needs a host with a long-running Node process + WebSocket support + Postgres (not Vercel/serverless). See `docs/DEPLOYMENT.md`.
4. Secrets: real `NEXTAUTH_SECRET` (server refuses to start otherwise), `NEXTAUTH_URL`, managed Postgres.

## Future Features (intentionally deferred)
Smarter/ML recommendations, natural-language search, AI playlist generation, richer party features (host handoff, room expiry), PWA/offline,
nonce-based Content-Security-Policy, shared rate-limit/socket store for multi-instance, followers/social graph, real licensed music provider.

## Last Audit
- **Date / baseline:** 2026-10-12, commit `f1819db`.
- **Test suite:** 12 files, 146 tests passing (was 61). Lint clean.
- **Found & fixed:**
  - *Crash:* any logged-in user could take down the whole server by emitting a malformed party socket event (payload destructuring threw inside async handlers → unhandled rejection). All payloads now Zod-validated; regression-tested against the old code.
  - *Bug:* party "add to queue" silently failed after any earlier item was removed/skipped (`position = count` collided with `@@unique([roomId, position])`). Now max+1 with retry; regression-tested.
  - *Deploy:* `tsx`/`cross-env` (needed by `npm start`) were devDependencies; `HOSTNAME` env var collides with container hostnames.
  - *Security:* signup/login brute-force protection, `javascript:` playlist cover URLs rejected, discover filters validated (400 not 500), FK errors → 404, signup race → 409, security headers, production env validation, seed refuses known admin password in production, queue size cap.
  - *Lint:* 1 error (unescaped apostrophe).
- **New:** `GET /api/health`, `docs/DEPLOYMENT.md`, API-layer + realtime test suites.
