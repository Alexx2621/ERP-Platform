# Active Tasks

## Claude

Task: FOUNDATION-001
Branch: feature/foundation-auth
Status: DONE — pending review and merge

Owned files:

apps/api/src/core/auth/**
apps/api/src/core/users/**

Note for whoever merges/reviews next (see "Shared bootstrap" below): this
branch also contains the monorepo bootstrap (root package.json, pnpm-workspace.yaml,
turbo.json, tsconfig.base.json, eslint.config.mjs, packages/database) because
neither FOUNDATION-001 nor FOUNDATION-002 could exist without it and no task
owned it. Merge/rebase FOUNDATION-002 onto this branch (or merge this branch
first) rather than having Codex recreate the same scaffolding independently —
two independent bootstraps would conflict on every shared file below.

---

## Codex

Task: FOUNDATION-002
Branch: feature/foundation-tenancy
Status: IN_PROGRESS

Owned files:

apps/api/src/core/tenants/**
apps/api/src/core/organizations/**
apps/api/src/core/companies/**

---

## Shared File Locks

package.json: CREATED by Claude (feature/foundation-auth, unmerged) — monorepo root manifest
pnpm-lock.yaml: CREATED by Claude (feature/foundation-auth, unmerged)
prisma/schema.prisma: CREATED by Claude, at packages/database/prisma/schema.prisma
  (not repo-root `prisma/`, per docs/ARCHITECTURE.md §13 monorepo layout) —
  contains User/UserCredential/Session only (FOUNDATION-001 scope). Codex:
  append Tenant/Organization/Company/Membership models to this same file,
  do not create a second schema file.
docker-compose.yml: NONE — still not created (out of scope of what was
  authorized for FOUNDATION-001's bootstrap; needed for Fase 1A/1B, no owner yet)
turbo.json: CREATED by Claude (feature/foundation-auth, unmerged)
tsconfig.json: CREATED by Claude as tsconfig.base.json at repo root, plus
  apps/api/tsconfig.json and packages/database/tsconfig.json (each extends
  the base). A new package should add its own tsconfig.json extending
  ../../tsconfig.base.json rather than editing an existing package's config.