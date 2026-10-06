# ClusterDeck

Collaborative infrastructure diagrams: nested nodes, tags, connections, live cursors.

**https://clusterdeck.space**

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
| MCP       | http://localhost:1235/mcp |
| Postgres  | localhost:5432          |

Useful commands:

```bash
pnpm docker:logs
pnpm docker:down
pnpm docker:reset   # wipe DB volume and rebuild
```

Compose builds one app image and runs `migrate` (schema only), `web`, and `realtime` against the `postgres` service. Inside containers `DATABASE_URL` points to host `postgres`; from the host use `127.0.0.1:5432`.

## Local setup (without Docker)

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at your Postgres.
2. Install: `pnpm install`
3. Migrate:

```bash
pnpm db:migrate
```

Wipe all users (and cascaded projects/memberships):

```bash
pnpm db:wipe-users -- --yes
```

Optional demo data: `pnpm db:seed` (login `bohdan@dev` / `password123`).

4. Run web + realtime:

```bash
pnpm dev
```

OAuth works when `AUTH_GITHUB_*` / `AUTH_GOOGLE_*` are set.

## MCP

The realtime process serves MCP, and the web app proxies it at `/mcp` (locally `http://localhost:3000/mcp`). Each user creates a personal token from the account menu and sends it as `Authorization: Bearer <token>`. Every diagram is hidden from that token until you turn MCP on for it, in the token dialog or with the MCP switch in the editor. The server instructions describe the node types, technologies, and how `list_diagrams`, `get_diagram`, and `update_diagram` work. While an agent is changing the open diagram, a bot icon appears in the editor header next to the people and Share.
