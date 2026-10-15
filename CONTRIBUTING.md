# Contributing to SangeetHub

Thanks for contributing. Read `AGENTS.md` (engineering rules) and `PROJECT_STATUS.md` (what's verified,
what isn't) first.

## Development setup

1. `npm install` (the `postinstall` hook runs `prisma generate`)
2. `cp .env.example .env` and set a real `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
3. `docker compose up -d`
4. `npm run db:migrate` then `npm run db:seed`
5. `npm run dev` (custom server with Socket.IO; `npm run dev:no-realtime` for plain Next)

## Quality checks

Run before opening a PR:

- `npm run typecheck`
- `npm run lint`
- `npm run test` (unit + API + realtime integration; no database needed)
- `npm run test:e2e` when you change a core journey (needs DB + seed + dev server)
- `npm run build` before anything that claims to be deployable

## Tests

- `tests/unit` - pure logic. `tests/api` - real route handlers + real authorization code against a mocked
  Prisma (`tests/helpers/api.ts`). `tests/integration` - real Socket.IO server + real clients against an
  in-memory fake DB. `tests/e2e` - Playwright.
- Mocked-Prisma tests do not exercise SQL or DB constraints. If your change depends on one
  (unique/FK/cascade), make the fake enforce it or verify against a real database.
- Add a test for every bug you fix; make sure it fails before your fix.

## Database changes

Change `prisma/schema.prisma`, then `npx prisma migrate dev --name <what-changed>` and commit the
generated `prisma/migrations/` folder. Destructive changes (dropping columns/tables) need a note in the PR.

## Commits

Small, coherent commits with a type prefix: `feat:`, `fix:`, `test:`, `ui:`, `docs:`, `chore:`, `audit:`.

## Guidelines

- Strict TypeScript types; no `any` without a reason.
- Server-side authorization on every sensitive action; validate all inputs.
- Do not commit secrets.
- Do not include copyrighted music/art without permission.
