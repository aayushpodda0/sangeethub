# SangeetHub Production Verification Checklist

This checklist is for the first controlled staging or production deployment. Mark an
item only after collecting the stated evidence. Repository tests do not replace
manual verification of a deployed service.

## Deployment and transport

- [ ] Record the deployed URL: `https://<your-domain>`.
- [ ] Confirm the deployed URL loads the SangeetHub landing page.
- [ ] Confirm HTTPS is enabled and HTTP redirects to HTTPS.
- [ ] Confirm `NEXTAUTH_URL` exactly matches the public HTTPS origin.
- [ ] Confirm the hosting platform runs a persistent Node.js 20+ process.
- [ ] Confirm the platform supports WebSocket upgrades for `/api/socket`.
- [ ] Confirm the first deployment uses one application instance.
- [ ] Confirm no secrets are present in Git, client bundles, logs, or error pages.

## Environment and database

- [ ] Confirm `NEXTAUTH_SECRET` is a randomly generated secret with at least 32 characters.
- [ ] Confirm `DATABASE_URL` points to the intended managed PostgreSQL database.
- [ ] Confirm the database connection uses TLS/appropriate provider security settings.
- [ ] Confirm `npm run db:deploy` completed successfully against the intended database.
- [ ] Confirm Prisma reports all committed migrations applied.
- [ ] Confirm a backup exists before changing an existing database.
- [ ] Confirm seed data is intentional for the environment.
- [ ] Confirm production was not seeded with development demo accounts unless explicitly approved.
- [ ] If seeding staging, provide `SEED_ADMIN_PASSWORD` and
      `SEED_LISTENER_PASSWORD` out of band and never commit or print their values.

## Health and error handling

- [ ] `GET /api/health` returns HTTP `200`.
- [ ] The response contains `{"status":"ok","database":"up"}` without secrets or
      internal configuration details.
- [ ] Temporarily test database-unavailable behavior in a disposable environment:
      the endpoint returns HTTP `503` and `{"status":"degraded","database":"down"}`.
- [ ] Visit a missing route and confirm the error page is usable.
- [ ] Exercise empty search, empty library, empty playlist, and no-recommendation states.
- [ ] Confirm the browser console has no unexpected application errors.
- [ ] Confirm logs do not include passwords, session tokens, database URLs, or sensitive
      user data.

## Authentication and authorization

- [ ] Create a new user through the signup flow.
- [ ] Sign in with valid credentials.
- [ ] Confirm authentication persists after refresh and navigation.
- [ ] Sign out and confirm protected pages are inaccessible afterward.
- [ ] Confirm invalid credentials fail without exposing whether an account exists.
- [ ] Confirm private playlists are not accessible to anonymous users or unauthorized users.
- [ ] Confirm private party rooms are not joinable without valid authorization.
- [ ] Create a playlist and confirm the owner can rename, modify, reorder, and delete it.
- [ ] Confirm another user cannot modify or delete the owner's private playlist.
- [ ] Confirm collaborative playlist contributor/moderator permissions are enforced server-side.

## Catalog, search, and playback

- [ ] Search by track, artist, album, genre, language, and an empty query.
- [ ] Open a track, album, and artist page from search results.
- [ ] Start real audio playback and confirm the time/progress updates.
- [ ] Pause, seek, change volume, skip, and resume playback.
- [ ] Navigate to another page while playback continues.
- [ ] Add and remove tracks from the queue.
- [ ] Verify shuffle and repeat behavior.
- [ ] Like a track and confirm the like persists after refresh.
- [ ] Confirm playlist artwork, track artwork, and fallback artwork render correctly.

## Party rooms

- [ ] Create a party room as an authenticated user.
- [ ] Join the same room from a genuinely independent second browser session.
- [ ] Confirm both clients receive the shared queue and current-track state.
- [ ] Confirm host-only playback controls are rejected for guests.
- [ ] Confirm guests can vote when permitted and queue ordering updates for both clients.
- [ ] Confirm invalid or unauthorized Socket.IO payloads do not crash the server.
- [ ] Disconnect one client and confirm it can reconnect safely.
- [ ] Restart the application in staging and confirm the expected room recovery behavior
      is documented; in-process rooms are not guaranteed to survive a restart.

## Responsive and browser verification

- [ ] Test desktop, tablet, and mobile viewport sizes.
- [ ] Confirm no horizontal overflow.
- [ ] Confirm navigation, player controls, queue dismissal, and touch targets work on mobile.
- [ ] Confirm keyboard focus is visible and icon-only controls have accessible labels.
- [ ] Confirm loading, empty, and error states are readable and actionable.
- [ ] Inspect social preview metadata using a public HTTPS URL.

## Automated release gate

Run from the exact release commit:

```bash
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run test
npm run build
npm run db:deploy
npm run test:e2e
```

Record command output, the commit SHA, migration status, E2E passed/failed/skipped
counts, and any checks that could not run. Do not report manual items as passed based
only on automated tests.

## Missing implementation or configuration

The repository currently provides the required `/api/health` endpoint and production
environment validation. No application-code change is required to begin this
checklist. The following deployment configuration is still missing from repository
evidence and must be supplied by the deployment owner:

- live domain and hosting platform;
- managed PostgreSQL instance and `DATABASE_URL`;
- production `NEXTAUTH_URL` and `NEXTAUTH_SECRET`;
- HTTPS certificate and reverse-proxy WebSocket support;
- backup/restore procedure for the selected database;
- an explicit decision about whether staging is seeded;
- manual browser evidence for real audio, mobile behavior, party synchronization,
  reconnection, restart behavior, and social previews.

Known product limitations remain: rate limiting and party-room state are in-process
and require a single instance; party rooms are not durable across server restarts;
there is no Content-Security-Policy header; and demo audio is not cleared for
unreviewed public licensing.
