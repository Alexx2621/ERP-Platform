# Project State

## Current Phase

PHASE 0/1 transition — Foundation bootstrap and first vertical slice (Authentication) in progress.
Phase 0 is not fully closed: ADR-001, ADR-002, ADR-003, ADR-004, ADR-005 are still
unwritten (see `docs/DECISIONS.md`), and `ARCHITECTURE.md`/`MULTITENANCY.md`/`ROADMAP.md`
remain marked "Propuesta para aprobación" in their own headers.

## Version

0.0.1

## Completed

- Master specification created
- Agent collaboration structure created
- Monorepo bootstrap: pnpm workspace + Turborepo, TypeScript (strict), ESLint
  flat config, Jest — `apps/api` (NestJS), `packages/database` (Prisma).
  Done as part of FOUNDATION-001 because it had no owner/task and both
  FOUNDATION-001 and FOUNDATION-002 depend on it; see note in
  `docs/tasks/CURRENT.md`.
- ADR-006 (Identity & Session Strategy) — `docs/DECISIONS.md`.
- Authentication Foundation (FOUNDATION-001, `apps/api/src/core/auth`,
  `apps/api/src/core/users`): credentials (Argon2id), login, opaque
  access/refresh sessions with rotation, logout, session revocation
  (single + all-sessions). 30 tests passing (unit-level, in-memory
  repositories — see Database Status for what is NOT yet verified).
- Prisma schema + baseline migration for `users`, `user_credentials`,
  `sessions` (`packages/database/prisma`).

## In Progress

- Architecture V1 approval (ADR-001 through ADR-005 still pending)
- Multi-tenant model / Tenancy, Organizations, Companies (FOUNDATION-002, Codex)

## Pending

- ADR-001 Modular Monolith, ADR-002 PostgreSQL/Prisma, ADR-003 Multi-Tenancy,
  ADR-004 Event Architecture, ADR-005 Plugin Architecture
- Docker environment (docker-compose for local PostgreSQL/Redis/MinIO — not
  created; out of scope of what was authorized for this task)
- A running PostgreSQL instance (schema/migration exist but are unapplied —
  no database was available in the environment this was built in)
- Redis
- Tenancy / RBAC (beyond the global User identity — Membership, Role,
  Permission are explicitly out of scope for FOUNDATION-001)
- Audit
- Event Bus

## Production Status

Not deployed.

## Database Status

Not created. Prisma schema and a hand-verified baseline migration
(`packages/database/prisma/migrations/20260825000000_init_auth_foundation`)
exist for the Foundation auth tables, generated via `prisma migrate diff`
without a live database connection (none was available). Nobody has run
`prisma migrate deploy`/`dev` against a real PostgreSQL instance yet — that
is the first thing to do before trusting the migration end-to-end.