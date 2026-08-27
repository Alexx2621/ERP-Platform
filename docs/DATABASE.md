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

---

## Access Control tables (RBAC, 2026-08-27)

Scope: `docs/MULTITENANCY.md` §9 — Role, Permission, RoleAssignment. Applied
to a real running PostgreSQL instance via `prisma migrate dev` (not just
diffed) — see migration note below.

### `permissions`

Global, code-owned catalog — **not** tenant-scoped, and never created from
the UI. The set of valid keys is `FOUNDATION_PERMISSIONS`
(`apps/api/src/core/access-control/application/permission-catalog.ts`),
upserted into this table on every boot by `PermissionCatalogSeeder`. Adding a
new permission is a code change (extend the catalog), not a data-entry task.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `key` | `varchar(150)` | `UNIQUE`. `<context>.<resource>.<action>`, e.g. `access.roles.manage` (MASTER_SPEC §9). |
| `description` | `varchar(300)` | Human-readable, shown in `GET /api/v1/permissions`. |
| `created_at` | `timestamptz(6)` | |

### `roles`

Tenant-owned, named group of permissions. `is_system` marks roles the
platform creates itself (currently only the auto-seeded "Owner" role at
tenant provisioning) rather than something a tenant admin created — reserved
so a future UI can block editing/deleting system roles without a separate
flag proliferation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `tenant_id` | `uuid` | FK → `tenants.id` `ON DELETE RESTRICT` (a tenant with roles cannot be hard-deleted out from under them — matches the platform's general no-cascading-delete-of-financial/security-relevant-data posture). |
| `name` | `varchar(100)` | Unique per tenant (`@@unique([tenantId, name])`) — the same name is free to reuse in a different tenant. |
| `is_system` | `boolean` | Default `false`. |
| `created_at`, `updated_at` | `timestamptz(6)` | |

Also declares `@@unique([tenantId, id])` — this is what lets every other
table reference a Role via the composite `(tenantId, roleId)` FK pattern
instead of trusting a bare `roleId`, the same tenant-safety pattern used by
`companies`/`organizations` (`docs/MULTITENANCY.md` §8).

### `role_permissions`

Join table, Role ↔ Permission (many-to-many). Carries `tenant_id` too (even
though it's derivable from the role) so the FK to `roles` can be the safe
composite `(tenant_id, role_id) → roles(tenant_id, id)` rather than a bare
`role_id → roles.id`.

| Column | Type | Notes |
| --- | --- | --- |
| `tenant_id`, `role_id` | `uuid` | Composite FK → `roles(tenant_id, id)` `ON DELETE CASCADE` — deleting a role clears its grants. |
| `permission_id` | `uuid` | FK → `permissions.id` `ON DELETE RESTRICT` — a permission in active use cannot be silently deleted out from under a role. |

PK is `(role_id, permission_id)`; a separate index on `permission_id` alone
supports "which roles grant this permission" lookups.

### `role_assignments`

Grants a Role to a Membership within a scope. This is the table
`HasPermissionUseCase` actually reads to answer "can membership X do Y."

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `tenant_id`, `membership_id` | `uuid` | Composite FK → `memberships(tenant_id, id)` `ON DELETE CASCADE`. This FK is the actual enforcement that a `membership_id` belongs to `tenant_id` — the application layer never queries Tenancy to pre-validate it (`PrismaRoleAssignmentRepository` catches the `P2003` violation and rethrows as `MembershipNotFoundInTenantError`, see `docs/SECURITY.md`). |
| `tenant_id`, `role_id` | `uuid` | Composite FK → `roles(tenant_id, id)` `ON DELETE RESTRICT` — a role with live assignments cannot be deleted. |
| `scope_type` | enum `TENANT`/`COMPANY` | `BRANCH`/`WAREHOUSE` are deferred — those entities don't exist yet, and accepting a `scope_id` with nothing to validate it against would be an unenforced access claim, not a real control (see the domain entity's own docstring). |
| `scope_id` | `uuid?` | `NULL` for `TENANT` scope (covers everything in the tenant); required for `COMPANY` scope. The domain entity (`RoleAssignment.create`) rejects the two invalid combinations before a row is ever built — this is a domain invariant enforced in code, not (yet) a DB `CHECK` constraint. |
| `created_at` | `timestamptz(6)` | |

`@@unique([membershipId, roleId, scopeType, scopeId])` prevents granting the
exact same role at the exact same scope to the same membership twice
(`DuplicateRoleAssignmentError`). An index on `(tenant_id, membership_id)`
supports the primary read pattern: "every assignment for this membership in
this tenant," which `HasPermissionUseCase` and `GET /api/v1/roles` both use.

### Migration

`packages/database/prisma/migrations/20260827021429_rbac_foundation/` —
generated and applied via `prisma migrate dev --name rbac_foundation`
against the real `erp_platform` Postgres container (`docker compose up -d`),
not diffed against an empty schema like the auth migration above. Confirmed
applying cleanly both there and against the ephemeral Testcontainers
instance used by `apps/api/test/integration`.

---

## Configuration tables (Typed Configuration, 2026-08-27)

Scope: `docs/ARCHITECTURE.md` §8.2, MASTER_SPEC §28/§29 — `SettingDefinition`,
`SettingValue`, `UserPreference`. Applied to the real running PostgreSQL
instance via `prisma migrate dev` (not just diffed).

### `setting_definitions`

Global, code-owned catalog — same pattern as `permissions`: not tenant-scoped,
never created from the UI. Seeded on every boot by `SettingCatalogSeeder`
from the code-owned `FOUNDATION_SETTINGS` list
(`apps/api/src/core/configuration/application/setting-catalog.ts`), currently
exactly three keys: `localization.currency`, `localization.timezone`,
`localization.locale` (MASTER_SPEC §29's moneda/zona horaria/idioma).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `key` | `varchar(150)` | `UNIQUE`. `<namespace>.<name>`, e.g. `localization.currency`. |
| `data_type` | enum `STRING`/`NUMBER`/`BOOLEAN`/`JSON` | Declares what shape a value at any scope for this key must have; enforced in application code (`SettingDefinition.assertValidValue`), not a DB `CHECK` — the value column is `jsonb` and Postgres has no built-in way to constrain its shape per-row against a sibling table's declared type. |
| `description` | `varchar(300)` | |
| `default_value` | `jsonb` | Used when no `setting_values` row exists at any scope — the last link in the resolution chain (see below). |
| `allowed_scopes` | `"ConfigScopeType"[]` (Postgres array of the enum) | Which of `PLATFORM`/`TENANT`/`COMPANY` this key may be set at. Prisma has no partial-unique-index support used here; this is a plain array column, validated in `SetSettingValueUseCase`, not a DB constraint. |
| `created_at` | `timestamptz(6)` | |

### `setting_values`

A concrete value for one `SettingDefinition` at exactly one scope instance —
the table `GetEffectiveSettingUseCase` actually reads.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `definition_id` | `uuid` | FK → `setting_definitions.id` `ON DELETE RESTRICT`. |
| `scope_type` | enum `PLATFORM`/`TENANT`/`COMPANY` | |
| `tenant_id` | `uuid?` | `NULL` for `PLATFORM` scope; FK → `tenants.id` `ON DELETE RESTRICT` otherwise. |
| `company_id` | `uuid?` | `NULL` unless `scope_type` is `COMPANY`. |
| `scope_key` | `varchar(80)` | Denormalized, non-null discriminator computed in application code (`SettingValue.scopeKey`): `"platform"` / the tenant id / `"tenantId:companyId"`. Exists purely so the unique index below can work — Postgres treats `NULL` as distinct from `NULL` in a unique constraint, so `tenant_id`/`company_id` alone (both `NULL` for every `PLATFORM` row) would allow duplicate `PLATFORM` values for the same key. |
| `value` | `jsonb` | |
| `created_at`, `updated_at` | `timestamptz(6)` | |

`(tenant_id, company_id) → companies(tenant_id, id)` is a **composite FK**,
the same tenant-safety pattern as `role_assignments` →
`memberships(tenant_id, id)`: Postgres skips a composite FK check entirely
when any column in it is `NULL`, so this constraint only ever fires for
`COMPANY`-scope rows, and a `company_id` that does not belong to `tenant_id`
is rejected by the database, not just filtered out by a query. A
mismatch surfaces as Prisma's `P2003`, caught by
`PrismaSettingValueRepository` and rethrown as `CompanyNotFoundInTenantError`
(`404 COMPANY_NOT_FOUND`) — see `docs/SECURITY.md`.

`@@unique([definitionId, scopeType, scopeKey])` is what makes "set" an
upsert instead of an ever-growing history table — one row per definition per
concrete scope instance. An index on `tenant_id` supports "every value this
tenant has ever set."

### `user_preferences`

Per-user, per-key preference. **Not** tenant-scoped — global to the `User`
identity, the same reasoning as `users` itself (`docs/MULTITENANCY.md` §4.8):
a preference like "UI theme" or "table page size" belongs to the person, not
to whichever tenant they happen to be working in at the moment. Deliberately
has no code-owned catalog like `setting_definitions` — preferences are
personal/UI concerns any feature can read/write directly without a central
registry or an `allowed_scopes` concept (there is only one scope: the user).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `user_id` | `uuid` | FK → `users.id` `ON DELETE CASCADE`. |
| `key` | `varchar(150)` | Free-form, not validated against a catalog. |
| `value` | `jsonb` | |
| `created_at`, `updated_at` | `timestamptz(6)` | |

`@@unique([userId, key])` makes "set" an upsert per user per key.

### Migration

`packages/database/prisma/migrations/20260827183903_typed_configuration/` —
generated and applied via `prisma migrate dev --name typed_configuration`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.
