# SangeetHub

SangeetHub is a modern, dark-first music discovery and demo streaming platform focused on:

- transparent recommendations,
- multilingual/regional discovery,
- collaborative playlists,
- and real-time party listening experiences.

This repository currently contains **Phase 1 foundation**:

- Next.js App Router + strict TypeScript
- Tailwind CSS design system + theme toggle
- Prisma schema (normalized, production-style)
- Secure credentials authentication (Auth.js / NextAuth + hashed passwords)
- PostgreSQL local setup via Docker Compose
- Seeded fictional catalog with legal demo audio previews
- Initial test and tooling setup (Vitest + Playwright + ESLint + Prettier)

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment template:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Run migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Start app:

```bash
npm run dev
```

## Demo accounts (after seed)

- Admin: `admin@sangeethub.local` / `Admin@12345`
- User: `listener@sangeethub.local` / `Listener@12345`

## Legal note

SangeetHub does not ship copyrighted music catalogs or proprietary branding assets.
All current metadata/artwork/audio in this project is fictional or demo-safe and intended only for development/testing.
