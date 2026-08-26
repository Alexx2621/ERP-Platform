# ERP Platform

Modular enterprise SaaS platform. See `docs/MASTER_SPEC.md` and
`docs/ARCHITECTURE.md` for the full design; `docs/PROJECT_STATE.md` for what
is actually built right now.

## Prerequisites

- Node.js >= 20
- pnpm (`packageManager` in `package.json` pins the exact version)
- Docker (for `docker-compose.yml`: PostgreSQL, Redis, MinIO)

## Setup

```bash
docker compose up -d
pnpm install
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
# .env.example values already match docker-compose.yml's defaults
pnpm --filter @erp/database migrate:dev
```

`pnpm --filter @erp/database migrate:dev` has not been run against a real
PostgreSQL instance yet in this codebase's history (see
`docs/PROJECT_STATE.md`) — the existing migrations were generated with
`prisma migrate diff` against no live database. Running it for the first time
against the `docker-compose.yml` database is the next verification step.

## Common commands (run from the repo root, orchestrated by Turborepo)

```bash
pnpm build       # build all packages (dependency-ordered)
pnpm lint        # eslint across all packages
pnpm typecheck   # tsc --noEmit across all packages
pnpm test        # jest (unit + Nest DI wiring tests; no live DB required)
```

Run a single package's script directly with `pnpm --filter <name> <script>`,
e.g. `pnpm --filter @erp/api test`.

## Structure

```text
apps/
  api/                 NestJS HTTP API (apps/api/src/core/* per module)
packages/
  database/            Prisma schema, migrations, generated client (@erp/database)
docs/                  Specification, architecture, ADRs, task tracking
```

`apps/api/src/core/<module>/` follows domain → application → infrastructure →
presentation, each module exposing a single `index.ts` as its public contract
for other modules to import (see `docs/ARCHITECTURE.md` §6).
