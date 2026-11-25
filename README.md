# restaurant-app

A restaurant's own ordering and delivery platform: Next.js website + admin, Express API + BullMQ worker, and Flutter apps (customer; Partner for kitchen and riders, from Session 9).
Product and technical decisions: [docs/PRD.md](docs/PRD.md), [docs/BLUEPRINT.md](docs/BLUEPRINT.md). Build sessions: [docs/SESSIONS.md](docs/SESSIONS.md).

## Quick start

Requires Node 24+, pnpm 12+ and Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up     # MongoDB (replica set) + Redis
pnpm dev       # http://localhost:3000  (API on :4000, health at /health)
pnpm test
```

See [CLAUDE.md](CLAUDE.md) for commands, layout and the rules every change must follow.
