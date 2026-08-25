# Foundation Database Design

Estado: **built incrementally per module**, like `docs/SECURITY.md`. This file
was empty when FOUNDATION-001 started even though `docs/ROADMAP.md` §4 lists a
"Diseño detallado de Foundation DB" here as a Phase 0 deliverable. This first
section documents only the tables FOUNDATION-001 actually created. Tenancy/
Organization/Company/Membership/RBAC tables (FOUNDATION-002 and later) belong
in their own sections below, added by whoever builds them — this is not yet a
complete Foundation schema.

Source of truth for the live schema: `packages/database/prisma/schema.prisma`.
This document explains *why* it looks the way it does; if the two disagree,
the `.prisma` file is correct and this file is stale.

---

## Authentication tables (FOUNDATION-001)

### `users`

Global identity (`docs/MULTITENANCY.md` §4.8) — no `tenant_id`. A user's
access to a given tenant is a `Membership` (owned by Access Control/Tenancy,
not yet built); this table only knows "who can authenticate."

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7, generated in application code (`packages/database/src/ids.ts`), not a DB default — see "IDs" below. |
| `email` | `varchar(320)` | Unique. Stored pre-normalized (trim + lowercase, `normalizeEmail()`) so the DB unique constraint and application lookups agree on identity without a `citext` dependency. |
| `display_name` | `varchar(200)` | |
| `status` | enum `ACTIVE`/`DISABLED` | Gates authentication; checked on every session validation, not just login (ADR-006). |
| `created_at`, `updated_at` | `timestamptz(6)` | UTC; `updated_at` auto-managed by Prisma's `@updatedAt`. |

### `user_credentials`

One row per user (1:1, `user_id` unique + FK cascade on delete). Kept as a
separate table rather than columns on `users` so a future second credential
type (passkey, OAuth identity) doesn't force a schema change to `users`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `user_id` | `uuid` | `UNIQUE`, FK → `users.id` `ON DELETE CASCADE`. |
| `password_hash` | `varchar(255)` | Argon2id PHC-format string (algorithm + version + params + salt + digest all embedded) — no separate `algorithm`/`version` column; see ADR-006. |
| `created_at`, `updated_at` | `timestamptz(6)` | |

### `sessions`

One row per logical session. Refresh **rotates the token pair on the same
row** rather than creating a new session or a token-family chain (ADR-006) —
this is why there is exactly one `access_token_hash`/`refresh_token_hash`
pair per row, not a history table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `user_id` | `uuid` | FK → `users.id` `ON DELETE CASCADE`. Indexed (`sessions_user_id_idx`) for "revoke all sessions for user." |
| `access_token_hash` | `varchar(64)` | `UNIQUE`. SHA-256 hex of the opaque access token — the raw token is never stored, only its hash (ADR-006 threat model in `docs/SECURITY.md`). |
| `refresh_token_hash` | `varchar(64)` | `UNIQUE`. Same scheme for the refresh token. |
| `status` | enum `ACTIVE`/`REVOKED` | |
| `access_expires_at`, `refresh_expires_at` | `timestamptz(6)` | Independent expiries — an access token can expire while the refresh token is still valid, which is the normal refresh flow. |
| `revoked_at` | `timestamptz(6)?` | Set on logout / revoke-all. |
| `last_used_at` | `timestamptz(6)` | Updated on rotation; not currently updated on plain read-only session validation (would add a write to every authenticated request for a field nothing yet consumes — revisit if audit/analytics needs it). |
| `ip_address` | `varchar(64)?` | Best-effort, from `request.ip`; not validated/pinned against future requests. |
| `user_agent` | `varchar(512)?` | Best-effort, informational only. |
| `created_at` | `timestamptz(6)` | |

### Design choices that apply across all three tables

- **IDs:** UUIDv7 generated in application code (`newId()` in
  `packages/database/src/ids.ts`), not a Postgres default — keeps ID
  generation portable/testable and independent of which PostgreSQL version is
  running, per `docs/ARCHITECTURE.md` §8.1's UUIDv7 guidance.
- **Timestamps:** `timestamptz(6)`, UTC, per `docs/ARCHITECTURE.md` §8.1.
- **No soft delete:** none of these three tables use `deleted_at`. `users`
  and `user_credentials` use `status`/replacement instead (MASTER_SPEC §33:
  soft delete is not applied indiscriminately); a `Session` is either active
  or revoked, and a revoked session is kept (not deleted) so it remains
  auditable and can't be "un-revoked" by recreating the row.
- **No `tenant_id`:** deliberate — see `docs/MULTITENANCY.md` §4.8 and the
  Tenant isolation review in `docs/SECURITY.md`. This is the one place in the
  schema where that omission is correct rather than an oversight; every
  other tenant-owned table added by later modules must have one.

### Migration

`packages/database/prisma/migrations/20260825000000_init_auth_foundation/` —
generated via `prisma migrate diff --from-empty --to-schema=schema.prisma --script`
(no live database was available to run `prisma migrate dev` against in the
environment this was built in). This has **not** been applied to a real
PostgreSQL instance yet; treat it as reviewed-but-unverified until someone
runs `prisma migrate deploy` against an actual database and confirms it
applies cleanly.
