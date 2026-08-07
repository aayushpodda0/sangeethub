# Contributing to SangeetHub

Thanks for contributing.

## Development setup

1. `npm install`
2. Copy `.env.example` to `.env`
3. `docker compose up -d`
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev`

## Quality checks

Run before opening a PR:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

## Guidelines

- Use strict TypeScript types.
- Keep server authorization checks on server boundaries.
- Do not commit secrets.
- Do not include copyrighted music/art without permission.
- Add tests for logic changes.

