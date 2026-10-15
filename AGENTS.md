<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# SangeetHub engineering rules (read before changing anything)

The codebase is the source of truth — inspect it before assuming a feature is missing or present.
`PROJECT_STATUS.md` says what is verified and what isn't; keep it current.

## Scope
- Finish and harden what exists. Don't rebuild working systems (player, auth, schema, party), swap the
  stack, or add infrastructure (Redis, queues, microservices) without a concrete requirement.
- A feature that isn't needed for the current task goes in `PROJECT_STATUS.md` → Future Features,
  not into the diff.
- Don't add Prisma models/dependencies unless an existing model genuinely can't do the job.

## Where logic lives
- Pure, DB-free business rules live in `lib/**` modules with **no Prisma/Next imports**
  (`lib/playlists/rules.ts`, `lib/recommendations/reasons.ts`, `lib/party/playback-state.ts`,
  `lib/party/validation.ts`, `lib/security/rate-limit.ts`, `lib/config/env.ts`) so they can be unit-tested.
- Route handlers (`app/api/**`) stay thin: authenticate → authorize → validate (Zod) → act → respond
  with `apiSuccess`/`apiError` from `lib/api/response.ts`.
- Catalog access goes through `MusicProvider` (`lib/music/provider.ts`). Album/artist pages still query
  Prisma directly — a recorded decision, not an accident.

## Non-negotiables
- **Authorization is server-side.** UI hiding is never a permission check. Never trust a client-supplied
  user id; use the session.
- **Validate every external input** — API bodies/queries *and every Socket.IO payload*
  (`lib/party/validation.ts`). A throw inside an async socket handler is an unhandled rejection that can
  take the whole server down.
- Anything that assigns `position` must respect `@@unique([..., position])` (use max+1, not row count;
  reorder with a two-pass update).
- Schema changes need a migration (`npx prisma migrate dev --name ...`) — say so when you make one.
- Never commit secrets; keep `.env.example` current.

## Definition of done
`npm run typecheck`, `npm run lint`, `npm run test` pass; `npm run test:e2e` for core-journey changes;
`npm run build` before calling anything deployable. If a check can't be run, say so — don't claim it passed.
Tests mock Prisma, so they prove handler/authorization logic, not SQL behaviour.
