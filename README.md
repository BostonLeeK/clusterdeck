# DataFlow

Collaborative infrastructure diagrams: nested nodes, tags, connections, live cursors.

## Stack

- Next.js 16 + Tailwind + shadcn-style UI
- React Flow canvas
- Yjs + Hocuspocus over WebSockets
- Postgres schema `dataflow` via Drizzle

## Docker (recommended)

```bash
cp .env.example .env
pnpm docker:up
```

Services:

| Service   | URL / port              |
|-----------|-------------------------|
| Web       | http://localhost:3000   |
| Realtime  | ws://localhost:1234     |
| Postgres  | localhost:5432          |

Seed login: `bohdan@dev` / `password123`

Useful commands:

```bash
pnpm docker:logs
pnpm docker:down
pnpm docker:reset   # wipe DB volume and rebuild
```

Compose builds one app image and runs `migrate` (schema + seed), `web`, and `realtime` against the `postgres` service. Inside containers `DATABASE_URL` points to host `postgres`; from the host use `127.0.0.1:5432`.

## Local setup (without Docker)

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at your Postgres.
2. Install: `pnpm install`
3. Migrate and seed:

```bash
pnpm db:migrate
pnpm db:seed
```

4. Run web + realtime:

```bash
pnpm dev
```

OAuth works when `AUTH_GITHUB_*` / `AUTH_GOOGLE_*` are set.
