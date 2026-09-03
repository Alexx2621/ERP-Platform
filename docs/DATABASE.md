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
| `is_platform_admin` | `boolean` | `DEFAULT false`. Added 2026-08-28 (migration `20260828175413_platform_admin_flag`). Grants access to `/api/v1/platform/*`, gated by `PlatformAdminGuard` — see ADR-007 and `docs/SECURITY.md` §"Platform Administration". Never settable via any public endpoint; `CreateUserUseCase` hardcodes it `false`. |
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

---

## Audit table (2026-08-27)

Scope: MASTER_SPEC §10 — `AuditEntry`. Applied to the real running
PostgreSQL instance via `prisma migrate dev` (not just diffed).

### `audit_entries`

Append-only. No application role has `UPDATE`/`DELETE` on this table
(`docs/ARCHITECTURE.md` §8.3) — the only write path is
`RecordAuditEntryUseCase`, which never exposes an update or delete
operation at any layer (domain, application, or repository interface).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `user_id` | `uuid?` | The **actor**, not necessarily the subject of the action — e.g. for a status change, the subject's id is in `resource_id`/`new_values`. `NULL` for unauthenticated events (a failed login attempt with no resolvable account) or system-initiated ones (the Owner-role auto-seed at provisioning). FK → `users.id` `ON DELETE RESTRICT` — a user can never be hard-deleted out from under their own audit history (moot in practice: `users` already never hard-deletes, see its own section above). |
| `tenant_id` | `uuid?` | `NULL` for actions that are not tenant-scoped at all — Authentication and User-status events (`docs/MULTITENANCY.md` §4.8) — not merely "unknown". FK → `tenants.id` `ON DELETE RESTRICT`. |
| `company_id` | `uuid?` | Same composite-FK pattern as `setting_values`: `(tenant_id, company_id) → companies(tenant_id, id)`, which Postgres only checks when both columns are non-null, so this never interferes with tenant-only or untenanted rows. |
| `action` | `varchar(150)` | `<context>.<resource-or-aggregate>.<past-tense-verb>`, e.g. `configuration.setting.changed`, `access_control.role_assignment.created`. Code-defined per call site, not a catalog. |
| `resource` | `varchar(100)` | The aggregate type affected, e.g. `"Session"`, `"Tenant"`, `"Role"`, `"SettingValue"`. |
| `resource_id` | `uuid?` | The specific instance affected, when there is a single one (omitted for actions like "revoked all sessions" that affect many). |
| `previous_values`, `new_values` | `jsonb?` | Free-form snapshots — deliberately not typed per action; each call site decides what is meaningful to capture (e.g. a setting change also fetches and records which scope the previous *effective* value came from, not just its raw value). |
| `ip_address`, `user_agent` | `varchar?` | Populated only where the caller had them (HTTP request context) — `NULL` for actions triggered from a use case with no request in scope, e.g. the RBAC/configuration application-layer writes recorded from a controller that only had `TenantExecutionContext`. |
| `correlation_id` | `varchar(100)` | Always present — every request carries one via `CorrelationIdMiddleware`, which runs on every route. Two entries recorded from the same request (e.g. `tenant.provisioned` and the immediately following `access_control.owner_role.seeded`) share the same value, letting them be reconstructed as one logical operation later. |
| `created_at` | `timestamptz(6)` | |

`@@index([tenantId, createdAt])` supports the primary read pattern (a
tenant's audit trail, newest first). `@@index([correlationId])` supports
reconstructing everything that happened within one request/operation.

### Migration

`packages/database/prisma/migrations/20260827194023_audit_foundation/` —
generated and applied via `prisma migrate dev --name audit_foundation`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.

---

## Event Bus / transactional outbox table (2026-08-27)

Scope: `docs/EVENTS.md` — `OutboxMessage`. Applied to the real running
PostgreSQL instance via `prisma migrate dev` (not just diffed).

### `outbox_messages`

The transactional outbox (`docs/EVENTS.md` §8). Unlike every other table in
this Foundation schema, atomicity with the state change it describes is a
**hard requirement**, not a documented best-effort gap: `appendOutboxMessage`
(`packages/events`, used by `apps/api`) is the only function that inserts here, and it
is always called with the *same* Prisma transaction client the producer's
own repository is already using inside its own `$transaction` — see
`PrismaTenantProvisioningRepository.create()` for the first real producer.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7 — also the envelope's `eventId` (`docs/EVENTS.md` §6). |
| `tenant_id`, `company_id` | `uuid?` | Same composite-FK pattern as `setting_values`/`audit_entries`: `(tenant_id, company_id) → companies(tenant_id, id)`, only checked by Postgres when both are non-null. `NULL` for platform-global events (none exist yet). |
| `event_type` | `varchar(150)` | `<bounded-context>.<aggregate>.<past-tense>.v<major>` (`docs/EVENTS.md` §7), e.g. `tenancy.tenant.provisioned.v1`. |
| `event_version` | `int` | The envelope's major version, separate from the `.v<major>` suffix in `event_type` for easier querying/telemetry. |
| `aggregate_type`, `aggregate_id`, `aggregate_version` | `varchar` / `uuid` / `int?` | Identify which aggregate instance the event describes and, when the aggregate tracks one, its version at the time — lets a consumer detect it received a stale/out-of-order event (`docs/EVENTS.md` §10). |
| `payload` | `jsonb` | Self-contained — IDs and stable values only, never a full entity dump (`docs/EVENTS.md` §6). |
| `occurred_at` | `timestamptz(6)` | When the fact happened (usually `now()` at append time). |
| `available_at` | `timestamptz(6)` | When this row becomes claimable — `now()` at insert, pushed forward on a retry (exponential backoff, see `OutboxMessage.markFailed`). |
| `status` | enum `PENDING`/`PROCESSING`/`PUBLISHED`/`FAILED` | `FAILED` is the dead-letter state after `maxAttempts` (currently 5) — no infinite retry loop. |
| `attempt_count`, `last_error_code` | `int` / `varchar?` | Retry bookkeeping; `last_error_code` is the failing handler's error name+message, never a raw stack trace or sensitive payload. |
| `locked_at`, `locked_by` | `timestamptz?` / `varchar?` | Set when a dispatcher claims the row (`PROCESSING`); a `PROCESSING` row whose `locked_at` is older than the configured lease becomes claimable again — recovers a dispatcher that crashed mid-batch without ever needing a separate cleanup job. |
| `published_at` | `timestamptz?` | Set when `DomainEventBus.publish()` returns without throwing. |
| `correlation_id` | `varchar(100)` | Always present, propagated from the HTTP request that caused the write (`CorrelationIdMiddleware`) — two rows from the same logical operation (e.g. `tenant.provisioned` and its immediately-following `access_control.owner_role.seeded` audit entry) share this value. |
| `causation_id` | `varchar(100)?` | Not populated by any producer yet — reserved for a future event that is itself caused by consuming another event. |
| `actor_type`, `actor_id` | `varchar(20)?` / `uuid?` | `USER`+id, or `SYSTEM`+null for a system-initiated fact. FK on `actor_id` → `users.id` `ON DELETE RESTRICT`, same reasoning as `audit_entries.user_id`. |
| `created_at` | `timestamptz(6)` | |

`@@index([status, availableAt])` supports the dispatcher's claim query
(`WHERE status = 'PENDING' AND available_at <= now() ... FOR UPDATE SKIP LOCKED`,
see `PrismaOutboxMessageRepository.claimBatch`). `@@index([tenantId])`
supports a future per-tenant outbox view, not built yet.

### Migration

`packages/database/prisma/migrations/20260827232432_event_bus_outbox/` —
generated and applied via `prisma migrate dev --name event_bus_outbox`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.

---

## Inbox / consumer idempotency table (2026-08-29)

Scope: `docs/EVENTS.md` §9 — `InboxMessage`. Applied to the real running
PostgreSQL instance via `prisma migrate dev` (not just diffed). Full design
rationale in `docs/DECISIONS.md` ADR-008.

### `inbox_messages`

Consumer-side idempotency ledger — one row per `(consumer_name, message_id)`
pair the platform has ever seen. `message_id` is an outbox message's own
`id` (its `eventId`), not a separately generated identifier — this table
tracks "which consumer has processed which delivery," not events in their
own right.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7, generated by the repository at claim time (there is no separate producer step, unlike the outbox). |
| `consumer_name` | `varchar(100)` | The consumer's own stable logical name (e.g. `"notifications"`) — chosen by whichever module registers the `DomainEventBus` handler, not derived from anything structural. |
| `message_id` | `uuid` | The outbox row's `id` being consumed. |
| `tenant_id` | `uuid?` | Informational/for future per-tenant filtering — FK → `tenants.id` `ON DELETE RESTRICT`, `NULL` for platform-scoped events. Not part of the uniqueness key. |
| `status` | enum `PROCESSING`/`PROCESSED` | Deliberately only two states — see ADR-008 point 1 for why there is no separate `FAILED`: a failed attempt just leaves the row `PROCESSING` with its lease intact. |
| `attempt_count`, `last_error_code` | `int` / `varchar(150)?` | Incremented/set by `markFailed`, same bookkeeping pattern as `outbox_messages`. |
| `locked_at` | `timestamptz(6)` | Not nullable (unlike `outbox_messages.locked_at`) — a row only ever exists once it has been claimed at least once, so it always has a lease timestamp. A `PROCESSING` row whose `locked_at` is older than the caller's configured lease becomes reclaimable again — same recovery mechanism as the outbox's own crashed-dispatcher case. |
| `processed_at` | `timestamptz(6)?` | Set when `markProcessed` runs. |
| `created_at` | `timestamptz(6)` | |

`@@unique([consumerName, messageId])` is the actual correctness boundary —
it is what makes a second concurrent claim of a brand-new pair fail with a
real Postgres constraint violation (`P2002`) rather than relying purely on
application-level locking. `@@index([status, lockedAt])` supports the same
kind of "is this reclaimable" query the outbox's own
`@@index([status, availableAt])` supports for its claim query.

### Migration

`packages/database/prisma/migrations/20260829224906_inbox_idempotency/` —
generated and applied via `prisma migrate dev --name inbox_idempotency`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.

---

## Files table (2026-08-27)

Scope: MASTER_SPEC §22 — `FileObject`. Applied to the real running
PostgreSQL instance via `prisma migrate dev` (not just diffed).

### `file_objects`

Metadata + ownership only — the file's bytes never touch this table or
local disk. `storage_key` is the object key inside the S3-compatible bucket
(MinIO locally, S3 in production); access happens exclusively through
short-lived signed URLs issued by `GetFileDownloadUrlUseCase` after a
tenant/ownership check.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7, also the last path segment of `storage_key`. |
| `tenant_id` | `uuid` | Not nullable — unlike `audit_entries`/`outbox_messages`, every file belongs to exactly one tenant; there is no platform-global file concept yet. FK → `tenants.id` `ON DELETE RESTRICT`. |
| `company_id` | `uuid?` | Same composite-FK pattern as `setting_values`/`audit_entries`/`outbox_messages`: `(tenant_id, company_id) → companies(tenant_id, id)`, only checked by Postgres when both are non-null. `NULL` for a file not scoped to a specific company. |
| `owner_user_id` | `uuid` | Who uploaded the file. FK → `users.id` `ON DELETE RESTRICT` — same reasoning as `audit_entries.user_id`: a user can never be hard-deleted out from under files they own. |
| `storage_key` | `varchar(500)` | Unique. `tenants/{tenantId}/files/{id}` — deliberately not derived from the original filename (avoids path traversal/collision entirely; the readable name is `original_filename`, metadata only). |
| `original_filename` | `varchar(255)` | As uploaded, for display only — never used to build `storage_key` or any filesystem path. |
| `content_type` | `varchar(150)` | As reported by the upload (`multipart` field), passed through to the storage adapter's `PutObject` so signed downloads serve the correct `Content-Type`. |
| `size_bytes` | `bigint` | `bigint`, not `int` — MASTER_SPEC has no stated file-size ceiling and Postgres `int` tops out at ~2 GiB. Serialized as a string at the API boundary (`FileObjectResponseDto`) since JSON has no native 64-bit integer type. |
| `status` | enum `ACTIVE`/`DELETED`/`PURGED` | Deliberate, explicit soft-delete (MASTER_SPEC §33) rather than a generic `deleted_at`-on-every-table policy. `PURGED` (added 2026-08-29) is the terminal state once `PurgeDeletedFilesUseCase` has actually removed the real storage object — see `docs/SECURITY.md` "Files". |
| `created_at` | `timestamptz(6)` | |
| `deleted_at` | `timestamptz?` | Set once, by `FileObject.markDeleted` — idempotent (deleting twice keeps the first timestamp). |
| `purged_at` | `timestamptz?` | Added 2026-08-29. Set once, by `FileObject.markPurged`, only after the real S3/MinIO object has actually been deleted — the row itself is never hard-deleted (an audit entry referencing this id must keep resolving). |

`@@unique(storageKey)` makes a duplicate/colliding object key impossible at
the database level, not just by convention. `@@index([tenantId, companyId])`
supports the primary read pattern (a tenant's, optionally a company's, file
listing). `@@index([status, deletedAt])` (added 2026-08-29) supports
`PurgeDeletedFilesUseCase`'s own read pattern: `DELETED` rows ordered by how
long they have been deleted.

### Migration

`packages/database/prisma/migrations/20260827235703_files_foundation/` —
generated and applied via `prisma migrate dev --name files_foundation`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`. Extended by
`packages/database/prisma/migrations/20260830004924_file_purge_and_membership_expiry/`
(adds `PURGED` to the enum and the `purged_at` column/index) — same
real-database + Testcontainers verification.

---

## Notifications tables (2026-08-28)

Scope: MASTER_SPEC §48 — `Notification`, `NotificationDelivery`. Applied to
the real running PostgreSQL instance via `prisma migrate dev` (not just
diffed).

### `notifications`

The notification request itself — content and recipient, no delivery
state. Nothing over HTTP creates these directly: the only write path is
`RequestNotificationUseCase`, an internal service call other modules make
(same pattern as `RecordAuditEntryUseCase`), because a public endpoint that
let any authenticated caller notify an arbitrary user would be an abuse
surface.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `tenant_id` | `uuid?` | `NULL` reserved for a future platform-level notification (none exist yet) — every notification produced today is tenant-scoped. FK → `tenants.id` `ON DELETE RESTRICT`. |
| `recipient_user_id` | `uuid` | Who the notification is for. FK → `users.id` `ON DELETE RESTRICT`. |
| `type` | `varchar(150)` | Code-defined `<context>.<event>` identifier (e.g. `tenancy.tenant_provisioned`) — not a catalog, same convention as `audit_entries.action`. |
| `title`, `body` | `varchar(200)` / `text` | |
| `data` | `jsonb?` | Free-form context for the frontend to render with (e.g. a resource id to link to) — never sensitive data. |
| `created_at` | `timestamptz(6)` | |

`@@index([tenantId, recipientUserId, createdAt])` supports the primary read
pattern (a recipient's notifications within a tenant, newest first).

### `notification_deliveries`

One row per channel requested for a `Notification`. V1 dispatches
synchronously — `IN_APP` "sending" is just this row's own persistence — so
every delivery is created already `SENT` or `FAILED`; there is no `PENDING`
state yet (would only matter once an async channel, e.g. Email via a
worker, actually exists).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | UUIDv7. |
| `notification_id` | `uuid` | FK → `notifications.id` `ON DELETE CASCADE` — unlike every other Foundation table, cascading here is correct: a delivery has no meaning without its notification, and nothing else references a delivery row. |
| `channel` | enum `IN_APP`/`EMAIL`/`SMS`/`WHATSAPP`/`PUSH` | Only `IN_APP` has a real adapter (`IMPLEMENTED_NOTIFICATION_CHANNELS`) — the rest are reserved values with no implementation, same "declared but deferred" pattern as `role_assignments`' `BRANCH`/`WAREHOUSE` scopes. Requesting one produces a `FAILED` row with an explanatory `failure_reason`, not a thrown error. |
| `status` | enum `SENT`/`FAILED` | |
| `sent_at` | `timestamptz?` | Set only for `SENT` rows. |
| `read_at` | `timestamptz?` | Only meaningful for `IN_APP` — "read" is a UI concept; other channels don't populate it. `NULL` = unread. |
| `failure_reason` | `varchar(300)?` | Populated only for `FAILED` rows (enforced by `NotificationDelivery.create`'s domain invariant). |
| `created_at` | `timestamptz(6)` | |

`@@unique([notificationId, channel])` makes a duplicate delivery for the
same notification+channel impossible at the database level — a caller
requesting the same channel twice for one notification is a bug the schema
itself catches, not a documented convention.

### Migration

`packages/database/prisma/migrations/20260828003322_notifications_foundation/` —
generated and applied via `prisma migrate dev --name notifications_foundation`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.

---

## App Registry tables (2026-08-30)

Scope: `docs/PLUGINS.md`, `docs/DECISIONS.md` ADR-005 (V1 mínimo). Applied to
the real running PostgreSQL instance via `prisma migrate dev` (not just
diffed).

### `app_definitions`

Global, code-owned catalog — same pattern as `permissions`. Seeded
idempotently by `AppCatalogSeeder` from the code-owned `FOUNDATION_APPS`
array, which ships **empty** in production (no business module beyond the
Platform Core exists yet to register — see ADR-005 and `docs/SECURITY.md`
"App Registry").

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Surrogate key, same split as `permissions.id`/`.key`. |
| `key` | `varchar(60)` | Unique. The manifest id (`docs/PLUGINS.md` §4.1) — stable, lowercase kebab-case, validated by `AppDefinition.create`'s domain invariant, never reused. |
| `name` | `varchar(150)` | Display name. |
| `version` | `varchar(30)` | Plain string, informational only in V1 mínimo — no SemVer range compatibility checking yet (ADR-005). |
| `kind` | enum `BUSINESS_APP`/`CHANNEL`/`INTEGRATION`/`INDUSTRY_EXTENSION` | `PLATFORM` deliberately absent — Core capabilities are never app-registrable (`docs/ARCHITECTURE.md` §5.3-§5.4). |
| `depends_on_keys` | `text[]` | References other rows' `key`, not `id` — the catalog is defined in code before any UUID exists. Validated acyclic and fully-resolvable by `validateAppCatalog` before any write. |
| `created_at` | `timestamptz(6)` | |
| `updated_at` | `timestamptz(6)` | |

### `tenant_apps`

Tenant-scoped enablement. V1 mínimo collapses the full
`AVAILABLE -> INSTALLING -> INSTALLED -> ENABLING -> ENABLED`/`DISABLING ->
DISABLED`/`SUSPENDED` lifecycle (`docs/PLUGINS.md` §7) down to
`ENABLED`/`DISABLED` — see ADR-005 for why the extra transitional states
have no distinct real behavior yet.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` | FK → `tenants.id` `ON DELETE RESTRICT`. |
| `app_definition_id` | `uuid` | FK → `app_definitions.id` `ON DELETE RESTRICT` — an app can never be hard-deleted out from under a tenant's own enablement history. |
| `status` | enum `ENABLED`/`DISABLED` | |
| `enabled_at` | `timestamptz(6)` | Refreshed on every `enable()`/re-`enable()` call. |
| `disabled_at` | `timestamptz?` | `NULL` while `ENABLED` — enforced by `TenantApp.create`'s domain invariant. |
| `created_at` | `timestamptz(6)` | |
| `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, appDefinitionId])` makes a duplicate enablement row for
the same tenant+app impossible at the database level — `EnableAppUseCase`/
`DisableAppUseCase` upsert against this constraint, never insert blindly.

### `app_configurations`

Opaque per-tenant-app JSON configuration. No formal per-key catalog like
`setting_definitions` yet — no shipped app declares a configurable setting
today, so there is nothing real to validate a schema against (ADR-005
"Deferred").

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_app_id` | `uuid` | FK → `tenant_apps.id` `ON DELETE CASCADE` — the only cascade in this module: a configuration value has no meaning without its `TenantApp`, same reasoning as `notification_deliveries` → `notifications`. |
| `key` | `varchar(150)` | Free-form, like `user_preferences.key`. |
| `value` | `jsonb` | |
| `created_at` | `timestamptz(6)` | |
| `updated_at` | `timestamptz(6)` | |

`@@unique([tenantAppId, key])` makes `SetAppConfigurationUseCase` a real
upsert, not an append-only log.

### Migration

`packages/database/prisma/migrations/20260830041057_app_registry_foundation/` —
generated and applied via `prisma migrate dev --name app_registry_foundation`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.

## Catalog tables (Master Data — Phase 2, 2026-08-31)

Scope: `docs/ARCHITECTURE.md` §5.2 "Master Data" — first Phase 2 module,
first business module ever placed under `apps/api/src/modules/` (a sibling
of `core/`, not inside it — `docs/ARCHITECTURE.md` §5.3-§5.4). Unlike every
Foundation table, `company_id` is **required, non-nullable** here: a
product/unit/category/brand genuinely belongs to exactly one company, not
an optional scope refinement. Applied to the real running PostgreSQL
instance via `prisma migrate dev` (not just diffed).

### `MasterDataStatus` / `ProductType` / `ProductStatus` enums

`MasterDataStatus` (`ACTIVE`/`INACTIVE`) is shared by `UnitOfMeasure`,
`Category`, `Brand`, `ProductVariant`. `Product` has its own richer
`ProductStatus` (`ACTIVE`/`INACTIVE`/`DISCONTINUED`). `ProductType`
(`PHYSICAL_GOOD`/`SERVICE`/`DIGITAL_PRODUCT`/`RAW_MATERIAL`) is deliberately
narrow — Kit/Bundle product types are out of scope for this slice (see
`docs/SECURITY.md` "Catalog" for the full list of deferred Master Data
scope).

### `units_of_measure`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` | FK → `tenants.id`. `@@unique([tenantId, id])` — required so `products.unit_of_measure_id` can reference this table with a tenant-scoped composite FK, the same pattern used everywhere else in this schema to make a cross-tenant reference structurally impossible, not just application-filtered. |
| `company_id` | `uuid` | FK → `companies(tenantId, id)`, **required**. |
| `code` | `varchar(60)` | |
| `name` | `varchar(150)` | |
| `symbol` | `varchar(20)` | e.g. `u`, `kg`, `L` — always present, unlike `category`/`brand`'s optional fields. |
| `status` | `MasterDataStatus` | |
| `version` | `int` | Optimistic-concurrency counter, bumped on every mutation (`docs/ARCHITECTURE.md` §8.3). |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, companyId, code])` — code uniqueness is scoped to the
company, not the tenant: two companies under the same tenant may each have
their own `"UN"`.

### `categories`

Same shape as `units_of_measure` minus `symbol`, plus a self-referencing
`parent_id uuid?` (FK → `categories(tenantId, id)`, relation name
`CategoryParent`) for a two-level-or-deeper tree. `Category.create`/
`.reparent()` both reject a category being its own parent at the domain
layer; the database does not enforce acyclicity beyond that single-level
check (a longer cycle through several `reparent()` calls is not currently
blocked — see `docs/SECURITY.md` "Catalog" known gaps).
`@@unique([tenantId, id])` (required for the self-FK) and
`@@unique([tenantId, companyId, code])`, same as `units_of_measure`.

### `brands`

Same shape as `units_of_measure` minus `symbol`. `@@unique([tenantId, id])`
(required so `products.brand_id` can reference it with a tenant-scoped
composite FK) and `@@unique([tenantId, companyId, code])`.

### `products`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `@@unique([tenantId, id])` — required so `product_variants.product_id` can reference this table tenant-scoped. |
| `tenant_id` / `company_id` | `uuid` | Required, same pattern as above. |
| `category_id` / `brand_id` / `unit_of_measure_id` | `uuid?` / `uuid?` / `uuid` | All three via composite `(tenantId, ...Id) → (tenantId, id)` FKs — a product can never reference another tenant's category/brand/unit even by mistake. `unitOfMeasure` is required; `category`/`brand` are optional. |
| `code` | `varchar(60)` | |
| `name` | `varchar(200)` | |
| `description` | `text?` | |
| `type` | `ProductType` | |
| `track_inventory` / `sellable` / `purchasable` / `has_variants` / `publish_online` | `boolean` | Server-side defaults (`false` for `hasVariants`/`publishOnline`, `true` for the rest) — the reason the SDK's `CreateProductInput` type had to be corrected in `packages/api-client/src/contracts.ts` (see that file's own docstring): `openapi-typescript` renders a boolean with a JSON-Schema `default` as non-optional even though the real API contract makes it optional. |
| `barcode` | `varchar(64)?` | |
| `base_price` / `base_cost` | `numeric(14,4)?` | **The first real monetary fields in this codebase.** `NULL` when `hasVariants=true` (price lives per-variant instead) — enforced by `Product.create`'s domain invariant, which also requires `basePrice` to be present when `!hasVariants && sellable`. Represented in the domain/application layers as canonical decimal **strings**, never a JS `number` (MASTER_SPEC §30/§82) — see "Decimal formatting" below. |
| `status` | `ProductStatus` | |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, companyId, code])` and
`@@unique([tenantId, companyId, barcode])` — both scoped to company, same
reasoning as the other Catalog tables.

### `product_variants`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` | |
| `product_id` | `uuid` | FK → `products(tenantId, id)`, tenant-scoped composite. |
| `sku` | `varchar(80)` | |
| `barcode` | `varchar(64)?` | |
| `attributes` | `jsonb` | `Record<string, string>` (e.g. `{"color":"Azul","talla":"M"}`) — genuinely open-ended/dynamic (MASTER_SPEC §19's variant model), the one deliberate JSONB use in this module, consistent with `docs/ARCHITECTURE.md` §57's "JSONB only where flexibility is genuinely needed." Postgres supports a real unique index over a `jsonb` column via its canonical internal key ordering — confirmed working by the migration applying cleanly. |
| `price` | `numeric(14,4)` | Required — a variant always carries its own price (unlike `Product.basePrice`, which is optional and product-type-dependent). |
| `cost` | `numeric(14,4)?` | |
| `status` | `MasterDataStatus` | |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, sku])` (SKU uniqueness is tenant-wide, not just
per-product — matching how barcodes/SKUs work in real inventory systems)
and `@@unique([tenantId, productId, attributes])` (the same attribute
combination — e.g. `{color: Azul, talla: M}` — can't be registered twice
for the same product).

### Decimal formatting — a real bug found and fixed this session

`PrismaProductRepository`/`PrismaProductVariantRepository` initially
converted Prisma's `Decimal` fields back to domain strings with
`.toString()`. Decimal.js's `.toString()` strips trailing zeros
(`"24.9900"` → `"24.99"`), which silently disagreed with what
`numeric(14,4)` actually stores and with what a fresh `create()` response
echoes back — confirmed by a direct `psql` query showing `24.9900` in the
column while the API returned `"24.99"`. Fixed to `.toFixed(4)`, which uses
Decimal.js's own arbitrary-precision arithmetic (never a JS `number`) to
pad to the column's declared scale. Re-verified via the integration suite
(explicit DB-round-trip assertions) and a fresh HTTP smoke test.

### Migration

`packages/database/prisma/migrations/20260831040628_catalog_master_data/` —
generated and applied via `prisma migrate dev --name catalog_master_data`
against the real `erp_platform` Postgres container. Two schema issues were
caught by Prisma's own validator before the migration could even be
generated: `Brand` initially lacked `@@unique([tenantId, id])` (needed for
`Product.brand`'s composite FK), and `UnitOfMeasure`'s relation from
`Product.unitOfMeasure` was initially a bare `references: [id]` (not
tenant-scoped) — both fixed before generating, so no unsafe intermediate
migration was ever applied.

## Customers / Suppliers tables (Master Data — Phase 2, 2026-08-31)

Scope: `docs/ARCHITECTURE.md` §5.2 "Master Data" — second Phase 2 block,
following Catalog. `Customer` and `Supplier` are deliberately separate
tables, not a shared "Party" abstraction — see the docstring directly above
`model Customer` in `schema.prisma` for the reasoning (today's fields are
identical, but Sales/Purchasing phases will add customer-only and
supplier-only concepts that have no natural shared home).

### `customers` / `suppliers`

Identical shape, two separate tables:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | No `@@unique([tenantId, id])` — unlike Catalog, nothing references these tables via a composite FK yet, so `findById` looks up by the global PK alone and the application layer double-checks `tenantId`/`companyId` (same pattern as `Notification`). |
| `tenant_id` / `company_id` | `uuid` | Required, same as every other Catalog/Master Data table. |
| `code` | `varchar(50)` | |
| `name` | `varchar(200)` | Trade/display name. |
| `legal_name` | `varchar(200)?` | Razón social. |
| `tax_id` | `varchar(60)?` | RFC/NIT/RUC-style tax identifier. |
| `email` | `varchar(200)?` | |
| `phone` | `varchar(40)?` | |
| `address_line` / `city` / `country` | `varchar(255)?` / `varchar(100)?` / `varchar(2)?` | A single flat address, not a normalized `Address`/`Location` sub-resource — sufficient for Master Data; Warehousing's own `Location` concept (still pending) is unrelated. `country` is ISO 3166-1 alpha-2, not validated against a country list yet. |
| `status` | `MasterDataStatus` | Reuses the enum already defined for Catalog. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, companyId, code])` and
`@@unique([tenantId, companyId, taxId])`, both scoped to company —
Postgres allows multiple `NULL`s in a unique index, so any number of
customers/suppliers with no tax id on file coexist without conflict; only a
genuine duplicate *value* is rejected. A customer and a supplier may freely
share the same tax id (real businesses are often both a customer and a
supplier of the same counterparty) — verified against real Postgres.

### Migration

`packages/database/prisma/migrations/20260831054432_customers_suppliers_master_data/` —
generated and applied via
`prisma migrate dev --name customers_suppliers_master_data` against the
real `erp_platform` Postgres container; applied cleanly on the first
attempt (no schema-validator errors this time, unlike Catalog's migration).

## Taxes / Warehouses / Pricing tables (Master Data — Phase 2, closing block, 2026-08-31)

Scope: `docs/ARCHITECTURE.md` §5.2 "Master Data" — the third and final
Phase 2 block, closing out the phase. Three separate modules
(`apps/api/src/modules/taxes`, `.../warehouses`, `.../pricing`), one
combined migration.

### `taxes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | No `@@unique([tenantId, id])` — nothing references this table via a composite FK. |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `code` | `varchar(50)` | |
| `name` | `varchar(150)` | |
| `rate` | `numeric(7,4)` | A **percentage** value (`"12.0000"` means 12%), not a fraction. Scoped to `numeric(7,4)` rather than the `numeric(14,4)` used for money — a tax rate has no realistic need for money's range, and using a tighter, deliberately-chosen scale here (rather than copy-pasting the money column type) was a conscious choice. |
| `status` | `MasterDataStatus` | Reuses the enum already defined for Catalog. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, companyId, code])`. Deliberately **not** a rules
engine — no jurisdiction logic, no compound/cascading composition, no
product-category applicability. See docs/SECURITY.md "Taxes".

### `warehouses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Same no-composite-unique reasoning as `taxes`. |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `code` | `varchar(50)` | |
| `name` | `varchar(150)` | |
| `address_line` / `city` / `country` | `varchar(255)?` / `varchar(100)?` / `varchar(2)?` | Same flat-address shape as `customers`/`suppliers`. |
| `status` | `MasterDataStatus` | |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, companyId, code])`. Belongs directly to `Company` —
**no `branch_id`/`location_id` column**, because neither `Branch` nor
`Location` exists anywhere in this schema yet
(`docs/ARCHITECTURE.md` §6's conceptual model allows an optional
association, but adding nullable FKs to tables that don't exist would be
pure speculative scaffolding). Add the association additively once either
entity is actually built.

### `price_lists`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `@@unique([tenantId, id])` — required so `price_list_items.price_list_id` can reference this table tenant-scoped. |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `code` | `varchar(50)` | |
| `name` | `varchar(150)` | |
| `currency` | `varchar(3)` | ISO 4217, uppercased by the domain layer; **not validated** against a real currency list — same accepted gap already documented for `country` on Customer/Supplier/Warehouse. |
| `valid_from` / `valid_until` | `date?` / `date?` | `@db.Date`, not `timestamptz` — these are civil dates, not instants (`docs/ARCHITECTURE.md` §8.1). Domain-validated `validFrom <= validUntil` when both are present. |
| `status` | `MasterDataStatus` | |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, companyId, code])`. Resolving which list actually
applies to a real sale on a given date is Sales-phase business logic
(Phase 4) — this table only stores the list itself, the same
"storage now, business rules later" split already used for Typed
Configuration in Foundation.

### `price_list_items`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `price_list_id` | `uuid` | `price_list_id` → `price_lists(tenantId, id)`, `ON DELETE CASCADE` — a line has no meaning without its list, same reasoning as `product_variants` → `products`. |
| `product_id` | `uuid` | → `products(tenantId, id)`, `ON DELETE RESTRICT`. **Deliberately references `Product` only, never `ProductVariant`.** Supporting per-variant list pricing would need a nullable-FK uniqueness scheme — a partial unique index (`WHERE product_variant_id IS NOT NULL`) that Prisma cannot express declaratively — for no validated use case yet. A `hasVariants` product simply cannot be added to a price list in this slice; see docs/SECURITY.md "Pricing". |
| `price` | `numeric(14,4)` | Same money-column shape as `products.base_price`. |
| `created_at` / `updated_at` | `timestamptz(6)` | |

`@@unique([tenantId, priceListId, productId])` — a real database
constraint, not just an application check (verified against real
Postgres). No `status` column: removing an item is a real `DELETE`
(`RemovePriceListItemUseCase`), not a lifecycle transition — a price list
line has no status of its own the way a standalone master-data entity
does.

### The first genuine cross-module dependency

`AddPriceListItemUseCase` (Pricing) calls `GetProductUseCase`, a new use
case added to Catalog's own public contract
(`apps/api/src/modules/catalog/application/use-cases/get-product.use-case.ts`,
exported from `modules/catalog/index.ts`) — the first time one business
module in this codebase depends on another
(`docs/ARCHITECTURE.md` §6: "module A -> public contract of module B").
`PricingModule` imports `CatalogModule` directly; the dependency is
directed and cycle-free — Catalog has zero knowledge of Pricing.
Exposed as a use case, not the raw `ProductRepository` interface, so the
consuming module gets Catalog's own read boundary rather than ad-hoc query
access to its persistence.

### Migration

`packages/database/prisma/migrations/20260831170111_pricing_taxes_warehouses_master_data/` —
generated and applied via
`prisma migrate dev --name pricing_taxes_warehouses_master_data` against
the real `erp_platform` Postgres container; applied cleanly on the first
attempt.

## Inventory tables (Phase 3, 2026-08-31)

Scope: `docs/ROADMAP.md` §7 — Movement Ledger, on-hand/reserved/available
projection, reservations/releases, adjustments, and transfers with
explicit state. `apps/api/src/modules/inventory`. Warehouse
locations/bins and lot/serial/expiration tracking are deliberately **not**
built — `docs/ROADMAP.md` §7 scopes both as "solo según alcance
aprobado", and no such approval exists; see docs/SECURITY.md "Inventory".

### `inventory_movements`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Append-only — no update/delete path exists anywhere in the application layer. |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `warehouse_id` | `uuid` | → `warehouses(tenantId, id)`, `ON DELETE RESTRICT`. |
| `product_id` | `uuid` | → `products(tenantId, id)`, `ON DELETE RESTRICT`. |
| `product_variant_id` | `uuid?` | → `product_variants(tenantId, id)`, `ON DELETE RESTRICT`. `NULL` for a non-variant product. |
| `type` | `InventoryMovementType` | `RECEIPT` \| `ISSUE` \| `ADJUSTMENT` \| `TRANSFER_OUT` \| `TRANSFER_IN` \| `TRANSFER_CANCELLED` \| `RESERVATION` \| `RELEASE`. |
| `quantity` | `numeric(14,4)` | **Signed.** The exact delta this row applies — no separate direction column that could drift out of sync with `type`. |
| `reason` | `varchar(500)?` | Required by the domain for `ADJUSTMENT`; optional/typically null otherwise. |
| `reference_type` | `InventoryMovementReferenceType?` | `TRANSFER` \| `RESERVATION` \| `MANUAL` — this module's own internal callers only, not a free-form field (contrast with `inventory_reservations.reference_type` below). |
| `reference_id` | `uuid?` | The `inventory_transfers.id`/`inventory_reservations.id` that caused this row, when applicable. No formal FK — the reference is polymorphic across two possible target tables, same reasoning already used for `audit_entries.resource_id`/`outbox_messages` payload references. |
| `correlation_id` | `varchar(100)` | **Not** `uuid` — a real bug caught by this module's own integration test (see below). |
| `created_by_user_id` | `uuid` | → `users(id)`, `ON DELETE RESTRICT`. |
| `created_at` | `timestamptz(6)` | Doubles as the transaction's `now` for the balance row it updates — see `PrismaInventoryBalanceRepository.applyMovement`. |

`@@index([tenantId, companyId, warehouseId, productId, productVariantId])`,
`@@index([tenantId, referenceType, referenceId])`. No `@@unique([tenantId,
id])` — nothing references this table via a composite FK.

**Real bug found and fixed by this module's own integration test, before
the first commit**: `correlation_id` was originally declared `@db.Uuid`.
`CorrelationIdMiddleware` echoes back an incoming `X-Correlation-Id` header
verbatim when the client supplies one (`req.correlationId = incoming &&
incoming.length > 0 ? incoming : randomUUID()`) — a caller-supplied
correlation id is not guaranteed to be UUID-shaped. Every other table with
a `correlationId` column (`audit_entries`, `outbox_messages`) already uses
`varchar(100)`; `inventory_movements` was the only one that didn't.
Corrected in the same migration before it was ever shared, and re-verified
against real Postgres with a literal non-UUID correlation id.

### `inventory_balances`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `warehouse_id` / `product_id` / `product_variant_id` | `uuid` / `uuid` / `uuid?` | Same shape as `inventory_movements`. |
| `on_hand_quantity` | `numeric(14,4)` | Physical stock in the warehouse. Never negative (enforced in the repository, not just the domain — see below). |
| `reserved_quantity` | `numeric(14,4)` | Stock earmarked but not physically moved. Never negative, and never greater than `on_hand_quantity` (same enforcement). |
| `version` | `int` | Incremented on every `applyMovement` call — an optimistic-concurrency-style audit trail of how many changes this row has seen, though the row lock (below) is what actually makes concurrent writes safe, not this counter. |
| `created_at` / `updated_at` | `timestamptz(6)` | |

**No `available_quantity` column and no `in_transit` column.**
`available = onHandQuantity - reservedQuantity` is always computed at read
time (`InventoryBalance.availableQuantity`, `apps/api/src/modules/
inventory/domain/inventory-balance.entity.ts`) — storing it would create a
third value that could drift out of sync with the two it derives from.
`in_transit` is likewise never stored: it is a query over `inventory_
transfers` rows with `status = IN_TRANSIT` for a warehouse, not a balance
bucket (see `inventory_transfers` below for why creating a transfer
already decrements the source's `on_hand_quantity`).

**Two hand-written partial unique indexes, not a plain `@@unique`** — the
one genuinely new schema technique this module needed:

```sql
CREATE UNIQUE INDEX "inventory_balances_variant_unique"
  ON "inventory_balances"("tenant_id", "warehouse_id", "product_variant_id")
  WHERE "product_variant_id" IS NOT NULL;
CREATE UNIQUE INDEX "inventory_balances_product_unique"
  ON "inventory_balances"("tenant_id", "warehouse_id", "product_id")
  WHERE "product_variant_id" IS NULL;
```

Postgres treats every `NULL` in a unique index as distinct from every
other `NULL`; a plain `@@unique([tenantId, warehouseId, productId,
productVariantId])` would therefore let the same non-variant product
accumulate unlimited balance rows in one warehouse (each insert's `NULL`
`product_variant_id` would never collide with the previous one). Prisma's
schema DSL cannot express a partial/filtered index, so this pair was
written directly into the migration SQL — the first migration in this
codebase to require hand-editing beyond what `prisma migrate dev`
generates on its own. Because neither index has a name Prisma's client
knows about, `findUnique`/`upsert` cannot target them: the balance
repository's row lock and first-insert path use raw SQL
(`$queryRaw`/manually built `where`) instead — see
`PrismaInventoryBalanceRepository.applyMovement`'s own docstring for the
full locking strategy, and docs/SECURITY.md "Inventory" for the
concurrency threat model.

**The single invariant that makes concurrent writes safe**, enforced
inside a `SELECT ... FOR UPDATE`-locked transaction on every write:

```
nextOnHand >= 0 AND nextReserved >= 0 AND nextOnHand >= nextReserved
```

This one check — not a type-specific branch — is what uniformly prevents
oversell (`ISSUE`/`TRANSFER_OUT` past available stock), negative
reservations, and reserving beyond on-hand. Verified against real
concurrent writers, not just reasoned about: `apps/api/test/integration/
inventory.integration-spec.ts` fires seven concurrent `RecordIssueUseCase`
calls against ten units of real on-hand stock (real Postgres, real `FOR
UPDATE` contention across genuinely concurrent connections) and asserts
exactly five succeed, exactly two are rejected with
`InsufficientInventoryError`, and the final on-hand is exactly `0.0000` —
never negative — repeated for concurrent `RESERVATION`s against on-hand
stock. This is `docs/ROADMAP.md` §7's own exit criteria ("Pruebas
concurrentes no permiten oversell/reservas negativas"), verified directly.

### `inventory_transfers`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `product_id` / `product_variant_id` | `uuid` / `uuid?` | |
| `source_warehouse_id` / `destination_warehouse_id` | `uuid` / `uuid` | Both → `warehouses(tenantId, id)`, `ON DELETE RESTRICT`, two named relations (`TransferSource`/`TransferDestination`) since Prisma requires disambiguating two FKs to the same target table. Domain-validated to be different warehouses. |
| `quantity` | `numeric(14,4)` | **Unsigned** — the requested transfer amount, not a ledger delta (contrast with `inventory_movements.quantity`). |
| `status` | `InventoryTransferStatus` | `IN_TRANSIT` (default) → `COMPLETED` \| `CANCELLED`, both terminal. |
| `version` | `int` | |
| `created_at` / `completed_at` / `cancelled_at` | `timestamptz(6)` / `timestamptz(6)?` / `timestamptz(6)?` | |

Creating a transfer immediately posts a `TRANSFER_OUT` at the source —
stock leaves `on_hand_quantity` right away, not just an "intent" — so an
`IN_TRANSIT` transfer is genuinely in motion, never double-counted with
the source's own on-hand. `complete()` posts `TRANSFER_IN` at the
destination; `cancel()` posts `TRANSFER_CANCELLED` at the source,
reversing the original `TRANSFER_OUT` — the original row is never edited
or deleted (MASTER_SPEC §20: reversal, not mutation, of the ledger).

### `inventory_reservations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `warehouse_id` / `product_id` / `product_variant_id` | `uuid` / `uuid` / `uuid?` | |
| `quantity` | `numeric(14,4)` | Unsigned, same reasoning as `inventory_transfers.quantity`. |
| `status` | `InventoryReservationStatus` | `ACTIVE` (default) → `RELEASED`, terminal. Only *full* release is supported — no partial release of a larger reservation. |
| `reference_type` / `reference_id` | `varchar(50)?` / `varchar(100)?` | **Free-form strings, not an enum** — unlike `inventory_movements.reference_type`, this describes *why* the reservation exists to a caller outside this module (a future Sales order, say). No such module exists yet to constrain against. |
| `version` | `int` | |
| `created_at` / `released_at` | `timestamptz(6)` / `timestamptz(6)?` | |

Never touches `on_hand_quantity` directly — only `reserved_quantity`, via
a `RESERVATION` movement on creation and a `RELEASE` movement on release.

### Accepted non-transactional trade-off

Creating a reservation/transfer applies its ledger movement (and the
balance-row invariant check) **before** saving the reservation/transfer
row itself — so a rejected write (insufficient stock) never leaves an
orphaned row. The reverse ordering is used for completing/cancelling a
transfer: the movement (always a pure positive addition there, so it can
never be rejected) is applied first, and the transfer's own status update
follows — keeping the ledger, this module's real source of truth, correct
even in the rare case the second write fails. Both directions accept the
same class of gap already present elsewhere in this codebase (e.g.
ADR-008's Owner-role seeding not sharing a transaction with tenant
provisioning): two sequential writes, not one atomic transaction spanning
two different repositories' tables. Growing every repository interface to
accept an externally supplied Prisma transaction client — the only way to
close this gap — was judged disproportionate to a failure window this
narrow (MASTER_SPEC §59/§93); see each write use case's own docstring in
`apps/api/src/modules/inventory/application/use-cases/`.

### Migration

`packages/database/prisma/migrations/20260831175237_inventory_ledger/` —
generated via `prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --script` (not `prisma migrate dev --create-only`,
which fails in this non-interactive environment when it needs to show an
interactive warning prompt — a real workaround, not a shortcut: the
generated SQL is identical to what `migrate dev` would have produced,
minus the two hand-added partial indexes and the `correlation_id` type
fix), then applied via `prisma migrate deploy`. Applied cleanly against
both the real `erp_platform` Postgres container and the ephemeral
Testcontainers Postgres used by the integration/E2E suites.

## Sales tables (Phase 4A, 2026-08-31)

Scope: `docs/ROADMAP.md` §8 (4A) — Quotes, Sales Orders and lines with
explicit status/transitions, pricing snapshot with discounts/taxes/channel,
inventory reservation via a transactional port into Inventory, and Returns
kept structurally separate from an Order status mutation. `apps/api/src/
modules/sales`.

### `quotes` / `sales_orders`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `customer_id` | `uuid` | → `customers(tenantId, id)`, `ON DELETE RESTRICT`. |
| `quote_id` | `uuid?` | `sales_orders` only — → `quotes(tenantId, id)`, `NULL` for an order created directly (not via conversion). |
| `channel` | `SalesChannel` | `ERP` \| `POS` \| `ECOMMERCE` \| `B2B` \| `MARKETPLACE` \| `MOBILE` \| `API` (MASTER_SPEC §21). Defaults to `ERP`. |
| `status` | `QuoteStatus` / `SalesOrderStatus` | `DRAFT` → `CONVERTED` \| `CANCELLED` (Quote, both terminal); `DRAFT` → `CONFIRMED` → `FULFILLED`, with `CANCELLED` reachable only from `DRAFT`/`CONFIRMED` — never after `FULFILLED` (SalesOrder). No `PENDING`/`PROCESSING`/`PARTIALLY_FULFILLED`/`REFUNDED`: this slice has no per-line fulfillment tracking or invoicing to make those states real, same "don't model a state with no distinct behavior yet" reasoning ADR-005 already used for `TenantApp`. |
| `currency` | `varchar(3)` | ISO 4217, uppercased in the domain. |
| `notes` | `varchar(1000)?` | `quotes` only. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |
| `converted_at` / `cancelled_at` (Quote), `confirmed_at` / `fulfilled_at` / `cancelled_at` (SalesOrder) | `timestamptz(6)?` | |

No human-readable `ORD-000001`/`QUO-000001` correlative number in this
slice — MASTER_SPEC §34 explicitly frames these as optional ("puede
existir"), and a genuinely safe generator needs the same bounded-retry-on-
conflict machinery `inventory_balances`' partial unique indexes required;
building it half-safe would be worse than deferring it (see
docs/SECURITY.md "Sales").

### `quote_lines` / `sales_order_lines`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` | Required (no separate `company_id` — scoped through the parent Quote/SalesOrder). |
| `quote_id` / `sales_order_id` | `uuid` | → parent, `ON DELETE RESTRICT`. |
| `warehouse_id` | `uuid?` | `sales_order_lines` only — `NULL` unless the product tracks inventory (a Quote line never has a warehouse at all; see `Quote`'s own docstring). |
| `product_id` / `product_variant_id` / `tax_id` | `uuid` / `uuid?` / `uuid?` | Same shape as Inventory/Pricing's own line-target fields. |
| `quantity` / `unit_price` / `discount_amount` | `numeric(14,4)` | Real money/quantity fields — first Sales table with monetary columns, same `numeric(14,4)` precision already used by Catalog/Pricing. |
| `tax_rate` | `numeric(7,4)` | Percentage snapshot, matching `taxes.rate`'s own precision — `"12.0000"` means 12%. |
| `line_total` | `numeric(14,4)` | `(quantity × unitPrice − discountAmount) + tax`, computed once by `QuoteLine.create()`/`SalesOrderLine.create()` (`apps/api/src/modules/sales/domain/decimal.ts`, dependency-free BigInt arithmetic — domain must not depend on Prisma's `Decimal`, docs/ARCHITECTURE.md §6) and **never recomputed on read** — see the dual-factory pattern below. |
| `reservation_id` | `uuid?` | `sales_order_lines` only. `NULL` until `ConfirmSalesOrderUseCase` attaches it exactly once; never cleared afterward — a permanent pointer to which `InventoryReservation` this line used, even after it is released. |
| `created_at` | `timestamptz(6)` | |

**Dual-factory entities, a genuinely new pattern in this codebase**:
`QuoteLine`/`SalesOrderLine` have `.create()` (computes `lineTotal` from
the other fields — used for real creation) and `.fromProps()` (trusts the
stored value as-is — used for reconstruction from persistence, and for
`ConvertQuoteToSalesOrderUseCase` copying a QuoteLine's already-computed
snapshot verbatim into a new SalesOrderLine). Every prior entity in this
codebase safely reused a single factory for both creation and
reconstruction because none had a computed field; `lineTotal` is a
historical fact of what the customer was quoted/sold, not a value that
should silently change on read if a future rounding-rule change would
compute it slightly differently.

**Real bug found and fixed before this module's first commit**:
`ConvertQuoteToSalesOrderUseCase` originally assigned the caller-supplied
`warehouseId` to *every* converted line unconditionally, regardless of
whether that line's product tracks inventory. `ConfirmSalesOrderUseCase`
decides whether to reserve inventory for a line solely from
`line.warehouseId !== null` — so a converted line for a non-tracked
product would have carried a `warehouseId` it should never have, causing
`ConfirmSalesOrderUseCase` to attempt a real reservation against
Inventory's `ResolveProductTargetUseCase`, which correctly rejects it with
`ProductInventoryNotTrackedError` — an error type `ConfirmSalesOrderUseCase`'s
compensation logic doesn't catch (it only compensates
`InsufficientInventoryError`), so it would have propagated as a raw,
unmapped 500 instead of a clean, compensated failure. Fixed by having
`ConvertQuoteToSalesOrderUseCase` call Catalog's `GetProductUseCase` per
line and only carry the warehouse through when `product.trackInventory` is
true — verified with a dedicated unit test asserting the untracked line's
`warehouseId` is `null` after conversion even when a warehouse was
supplied for the whole conversion.

### `sales_returns` / `sales_return_lines`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` (both) / `company_id` (`sales_returns` only) | `uuid` | |
| `sales_order_id` | `uuid` | → `sales_orders(tenantId, id)`, `ON DELETE RESTRICT`. Requires the order to be `FULFILLED` — enforced in the domain, not a DB constraint. |
| `reason` | `varchar(500)?` | `sales_returns` only. |
| `sales_return_id` / `sales_order_line_id` | `uuid` / `uuid` | `sales_return_lines` only — → parent return, → the fulfilled order line being returned against. |
| `quantity` | `numeric(14,4)` | Unsigned. Validated against the running sum of every prior `sales_return_line` for the same `sales_order_line_id` (a ledger read via `listBySalesOrderLine`, not a stored running total — same philosophy as `inventory_balances`), never a stored counter that could drift. |
| `created_at` | `timestamptz(6)` | |

**No status column on `sales_returns`** — a return is its own append-only
record, never a `SalesOrder` status mutation (a `FULFILLED` order stays
`FULFILLED` regardless of how many returns are later recorded against
it — see `SalesOrder`'s own docstring). `CreateSalesReturnUseCase` posts a
real `RETURN` inventory movement per line whose order line has a
`warehouseId` (via Inventory's public `RecordReturnUseCase`,
`referenceType: "SALES_RETURN"`), restoring on-hand stock.

### Migration

`packages/database/prisma/migrations/20260831224651_sales_and_payments/` —
combines the Sales and Payments schemas (below) in one migration, same
"combine several new modules in one migration" pattern already used by
the Taxes/Warehouses/Pricing closing block. Also adds
`@@unique([tenantId, id])` to `customers` and `taxes` — neither had one
before, since Sales is their first FK-referencing consumer (mirroring the
same requirement Pricing's `AddPriceListItemUseCase` created for
`products` in Phase 2). Generated via the same non-interactive `prisma
migrate diff --from-config-datasource --to-schema ... --script` workaround
already used throughout this project (Prisma's interactive warning prompt
about new unique constraints on existing data fails non-interactively),
applied via `prisma migrate deploy`, verified against real Postgres —
`prisma migrate status` confirms no drift.

## Payments table (Phase 4B, 2026-08-31)

Scope: `docs/ROADMAP.md` §8 (4B) — a `Payment` aggregate independent of
`SalesOrder`, a `PaymentGateway` port with real adapters, idempotent
capture, and refund. `apps/api/src/modules/payments`. Deliberately
**not** built: webhook verification and provider-timeout reconciliation —
both are only meaningful once a real asynchronous gateway exists; see
docs/SECURITY.md "Payments" and `docs/DECISIONS.md` for the scope decision
that ships only credential-free adapters in this slice.

### `payments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | Required. |
| `sales_order_id` | `uuid` | → `sales_orders(tenantId, id)`, `ON DELETE RESTRICT`. |
| `method` | `PaymentMethod` | `CASH` \| `BANK_TRANSFER` only — see `docs/DECISIONS.md`, Payments section, for why no credential-requiring provider (`StripeAdapter`/`PayPalAdapter`) is faked here (MASTER_SPEC §90). |
| `status` | `PaymentStatus` | `CAPTURED` \| `REFUNDED` \| `FAILED`. A capture always resolves synchronously to one of these — never `PENDING` — since neither method has an asynchronous confirmation step to reconcile later. |
| `amount` | `numeric(14,4)` | |
| `currency` | `varchar(3)` | Must match the sales order's own currency — enforced in `CapturePaymentUseCase`, not a DB constraint. |
| `idempotency_key` | `varchar(100)` | Caller-supplied, deduplicates a retried capture request. |
| `gateway_reference` | `varchar(200)?` | The bank transfer confirmation number for `BANK_TRANSFER`; always `NULL` for `CASH` (no external reference exists). |
| `failure_reason` | `varchar(500)?` | Set only when `status = FAILED` (e.g. a `BANK_TRANSFER` capture with no reference). |
| `created_at` / `captured_at` / `refunded_at` | `timestamptz(6)` / `timestamptz(6)?` / `timestamptz(6)?` | |

`@@unique([tenantId, companyId, idempotencyKey])` is the real frontier
that satisfies `docs/ROADMAP.md` §8's exit criteria ("duplicar request no
duplica... cargo") — not an application-level check alone.
`CapturePaymentUseCase` pre-checks `findByIdempotencyKey` before calling
the gateway (covers the common sequential-retry case), and
`PrismaPaymentRepository.save()` translates a real unique-constraint
violation (a genuine concurrent race between two first-time requests with
the same key) into `PaymentIdempotencyConflictError`, which the use case
catches and reacts to by re-fetching the real winner — never leaking a raw
Prisma error type across the module boundary (docs/ARCHITECTURE.md §6).
Verified against real Postgres, not just reasoned about:
`apps/api/test/integration/payments.integration-spec.ts` fires five
genuinely concurrent `CapturePaymentUseCase.execute()` calls with the same
idempotency key and asserts all five resolve successfully, all five agree
on the exact same `Payment.id`, exactly one attempt actually created the
row (`wasReplayed: false`) and the other four were real replays
(`wasReplayed: true`), and exactly one row exists in the table afterward.

**Real bug found and fixed by this table's own manual smoke test against
real Postgres, before this session's commit**: `CapturePaymentUseCase`
originally returned the bare `Payment` from `execute()`, and
`PaymentsController.capture()` unconditionally wrote a
`payments.payment.captured` audit entry after every call — including a
call that only replayed an already-captured payment via the idempotency
pre-check. A retried capture request (the exact scenario idempotency
exists to make safe) was therefore writing a **second** audit entry for
what was really a single real charge, falsely implying in the audit trail
that the payment had been captured twice. Fixed by having
`CapturePaymentUseCase.execute()` return `{ payment, wasReplayed }`, and
`PaymentsController.capture()` only records the audit entry when
`!wasReplayed`. Re-verified against real Postgres: the same idempotent
retry that previously produced 14 audit entries for the smoke test's full
lifecycle now produces exactly 13, with exactly one
`payments.payment.captured` row.

### Migration

Combined with `sales_and_payments` above (`packages/database/prisma/
migrations/20260831224651_sales_and_payments/`).

## Purchasing tables (Phase 5, 2026-09-01)

Scope: `docs/ROADMAP.md` §9 — Purchase Orders and lines, Receipts
(partial-first-class), Returns to a supplier, Supplier Invoices.
`apps/api/src/modules/purchasing`. Mirrors Sales' shape closely
(`PurchaseOrder`/`PurchaseOrderLine` ~ `SalesOrder`/`SalesOrderLine`,
`PurchaseReturn`/`PurchaseReturnLine` ~ `SalesReturn`/`SalesReturnLine`)
with two deliberate differences: no discount/tax on order lines (a
supplier's own tax breakdown belongs on `SupplierInvoice`, a separate
document), and receiving is genuinely partial-first-class — `PurchaseReceipt`/
`PurchaseReceiptLine` can be posted multiple times against the same
`CONFIRMED` order, unlike Sales' single atomic `FulfillSalesOrderUseCase`.

### `purchase_orders`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `supplier_id` | `uuid` | `supplier_id` → `suppliers(tenantId, id)`, `ON DELETE RESTRICT` — the first FK consumer of `suppliers`' `@@unique([tenantId, id])`, added in this same migration (Suppliers never needed it before; same situation `customers`/`taxes` were in before Sales, session 27). |
| `status` | `PurchaseOrderStatus` | `DRAFT` → `CONFIRMED` → `CLOSED`, `CANCELLED` reachable only from `DRAFT`/`CONFIRMED` — never from `CLOSED`. Confirming needs a genuinely different permission (`purchasing.orders.approve`) from every other write on this table (`purchasing.orders.manage`) — the segregation-of-duties exit criterion, enforced by `PermissionGuard`, not a DB constraint. |
| `currency` | `varchar(3)` | |
| `notes` | `varchar(1000)?` | |
| `version` | `int` | Optimistic concurrency, same convention as `SalesOrder`. |
| `created_at` / `updated_at` / `confirmed_at` / `closed_at` / `cancelled_at` | `timestamptz(6)` | |

`CancelPurchaseOrderUseCase` additionally rejects cancelling a `CONFIRMED`
order that already has at least one real `PurchaseReceipt` — a
cross-table check (`PurchaseReceiptRepository.listByPurchaseOrder`), not
something `PurchaseOrder.cancel()` itself can know (docs/ARCHITECTURE.md
§6: domain can't query other tables). Goods that physically arrived are
corrected via a `PurchaseReturn`, never erased by cancelling the order
that brought them in.

### `purchase_order_lines`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `purchase_order_id` | `uuid` | `ON DELETE CASCADE` from `purchase_orders` — same convention as `sales_order_lines`. |
| `warehouse_id` | `uuid?` | Required only when the product tracks inventory (`ResolvePurchaseLineTargetUseCase`, same conditional rule `SalesOrderLine.warehouseId` established). |
| `product_id` / `product_variant_id` | `uuid` / `uuid?` | |
| `quantity` / `unit_cost` / `line_total` | `numeric(14,4)` | `lineTotal = quantity × unitCost`, computed once at line-creation time (`PurchaseOrderLine.create()`) — no discount, no tax rate on this line; a supplier's own tax breakdown belongs on `SupplierInvoice`. |
| `created_at` | `timestamptz(6)` | |

### `purchase_receipts` / `purchase_receipt_lines`

A receipt is its own append-only record, not a `PurchaseOrder` status
mutation — a `CONFIRMED` order stays `CONFIRMED` regardless of how many
partial receipts are posted against it; the order only ever advances to
`CLOSED` via an explicit, separate close action. `CreatePurchaseReceiptUseCase`
posts a real `RECEIPT` inventory movement per line
(`referenceType: "PURCHASE_ORDER"`, `referenceId: purchaseOrderId` —
Inventory's `RecordReceiptUseCase` gained an optional `referenceType`/
`referenceId` pair in this same change, previously hardcoded to `"MANUAL"`)
and rejects receiving more than was ever ordered for a given line,
computed as a running sum over every prior `purchase_receipt_lines` row
for that order line (`listByPurchaseOrderLine`) — a ledger read, never a
stored counter that could drift, the same philosophy `InventoryBalance`
and `SalesReturnLine` already established.

| `purchase_receipts` column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `purchase_order_id` | `uuid` | `purchase_order_id` → `purchase_orders(tenantId, id)`, `ON DELETE RESTRICT` (a receipt must never be able to outlive the order it belongs to, but deleting an order with real receipts is exactly the scenario `CancelPurchaseOrderUseCase`'s own check already prevents at the application layer first). |
| `notes` | `varchar(1000)?` | |
| `created_at` | `timestamptz(6)` | |

| `purchase_receipt_lines` column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `purchase_receipt_id` | `uuid` | `ON DELETE CASCADE` from `purchase_receipts`. |
| `purchase_order_line_id` | `uuid` | → `purchase_order_lines(tenantId, id)`, `ON DELETE RESTRICT`. |
| `quantity` | `numeric(14,4)` | Always positive — a receipt can never itself be negative; a correction is a `PurchaseReturn`, not a negative receipt. |
| `created_at` | `timestamptz(6)` | |

### `purchase_returns` / `purchase_return_lines`

Same append-only-record philosophy as `purchase_receipts`, but for goods
physically leaving back to the supplier. `CreatePurchaseReturnUseCase`
posts a real `ISSUE` inventory movement per line
(`referenceType: "PURCHASE_RETURN"`) — deliberately `RecordIssueUseCase`,
not `RecordReturnUseCase` (which is Sales' "customer sent goods back,
stock increases" movement and would be the wrong direction here) — and
rejects returning more than was ever received minus what was already
returned for a given line, computed as running sums over both
`purchase_receipt_lines` and `purchase_return_lines` (never stored
counters).

| `purchase_returns` column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `purchase_order_id` | `uuid` | → `purchase_orders(tenantId, id)`, `ON DELETE RESTRICT`. |
| `reason` | `varchar(500)?` | |
| `created_at` | `timestamptz(6)` | |

| `purchase_return_lines` column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `purchase_return_id` | `uuid` | `ON DELETE CASCADE` from `purchase_returns`. |
| `purchase_order_line_id` | `uuid` | → `purchase_order_lines(tenantId, id)`, `ON DELETE RESTRICT`. |
| `quantity` | `numeric(14,4)` | |
| `created_at` | `timestamptz(6)` | |

### `supplier_invoices`

A supplier's own invoice, recorded as its own document
(docs/ROADMAP.md §9: "Supplier invoices como documento separado") — never
a `PurchaseOrder` field.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `supplier_id` / `purchase_order_id` | `uuid` | `purchase_order_id` must genuinely belong to `supplier_id` — `CreateSupplierInvoiceUseCase` checks `order.supplierId !== input.supplierId` and rejects with `SupplierInvoiceOrderMismatchError`, a real cross-check the schema itself cannot express (an FK can't assert a relationship between two *other* FKs' targets). |
| `invoice_number` | `varchar(100)` | The supplier's own reference — not a code this platform generates. |
| `amount` | `numeric(14,4)` | Not validated against the order's own line totals or receipts — see docs/SECURITY.md "Purchasing" for why. |
| `currency` | `varchar(3)` | |
| `issue_date` / `due_date` | `date` / `date?` | Civil dates, same `@db.Date` convention `PriceList.validFrom`/`.validUntil` already established — `issueDate` must not be after `dueDate` (domain-validated). |
| `status` | `SupplierInvoiceStatus` | `RECORDED` → `CANCELLED` only — deliberately never tracks "paid"; see docs/SECURITY.md "Purchasing" for the full reasoning (same "don't simulate" principle ADR-009 applied to Payments). |
| `notes` | `varchar(1000)?` | |
| `created_at` / `updated_at` / `cancelled_at` | `timestamptz(6)` | |

### `InventoryMovementReferenceType` extended

`ALTER TYPE "InventoryMovementReferenceType" ADD VALUE 'PURCHASE_ORDER'`
and `'PURCHASE_RETURN'` — same one-value-per-statement workaround already
used when Sales added `SALES_ORDER`/`SALES_RETURN` (session 27,
`20260831223815_inventory_return_and_sales_reference_types`). Inventory's
`RecordReceiptUseCase` gained an optional `referenceType`/`referenceId`
pair in this same change (previously hardcoded to `"MANUAL"`), mirroring
`RecordIssueUseCase`/`RecordReturnUseCase`'s existing shape — its own
docstring had already anticipated this exact caller: "Purchasing, Phase 5,
will call this once it exists."

### Migration

`packages/database/prisma/migrations/20260901182240_purchasing/` —
generated via the same non-interactive `prisma migrate diff --script`
workaround established in session 26 (`prisma migrate dev --create-only`
fails in this environment), applied cleanly to real Postgres on the first
attempt despite combining seven new tables and an enum extension in one
migration, plus adding `@@unique([tenantId, id])` to `suppliers` (its
first FK consumer).

## POS tables (Phase 6, 2026-09-01)

Scope: `docs/ROADMAP.md` §10 — Registers, Shifts, Cash Movements, Sales,
Returns. `apps/api/src/modules/pos`. Unlike every prior business module,
POS owns almost no domain data of its own beyond bookkeeping: a POS sale
*is* a real `SalesOrder` (channel `POS`) plus a real `Payment`, created
through Sales'/Payments' own public contracts exactly as the ERP Sales
screen would (`RingUpSaleUseCase`); `pos_sales`/`pos_returns` exist to give
a shift its own reporting surface and idempotency guarantee, not to
duplicate Sales'/Payments' own tables.

### `pos_registers`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `warehouse_id` | `uuid` | `warehouse_id` → `warehouses(tenantId, id)`, `ON DELETE RESTRICT` — every sale rung up on this register issues stock from this one warehouse, resolved server-side, never from client input. |
| `code` / `name` | `varchar(50)` / `varchar(150)` | `@@unique([tenantId, companyId, code])`. |
| `status` | `MasterDataStatus` | Reused `ACTIVE`/`INACTIVE` from Catalog/Warehouses/Taxes — `OpenShiftUseCase` rejects opening a shift on an `INACTIVE` register. |
| `version` | `int` | Optimistic concurrency, same convention as every prior master-data entity. |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `pos_shifts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `register_id` | `uuid` | `register_id` → `pos_registers(tenantId, id)`, `ON DELETE RESTRICT`. |
| `status` | `PosShiftStatus` | `OPEN` → `CLOSED`, terminal. A register may have at most one `OPEN` shift at a time — `OpenShiftUseCase` enforces this by querying for one first (`findOpenByRegister`), an application-level invariant, not a partial unique index. |
| `opened_by_user_id` / `closed_by_user_id` | `uuid` / `uuid?` | → `users(id)`, `ON DELETE RESTRICT` — same direct `User` FK precedent already established by `inventory_movements.created_by_user_id`. |
| `opened_at` / `closed_at` | `timestamptz(6)` / `timestamptz(6)?` | |
| `opening_cash` | `numeric(14,4)` | May legitimately be `0` (a till with no starting float). |
| `closing_cash_counted` / `closing_cash_expected` / `cash_variance` | `numeric(14,4)?` | All three set exactly once, together, by `CloseShiftUseCase`. `closing_cash_expected` is computed fresh at close time from this shift's own ledger — `opening_cash` plus every `pos_cash_movements` row (`CASH_IN` adds, `CASH_OUT` subtracts) plus every `CASH` `pos_sales.amount` minus every `CASH` `pos_returns.refund_amount` — never a running counter that could drift, the same ledger-read philosophy `InventoryBalance` and every running-sum validation in Sales/Purchasing already established. `cash_variance = closing_cash_counted - closing_cash_expected`. |
| `notes` | `varchar(500)?` | |

### `pos_cash_movements`

Append-only cash-drawer ledger entry — never updated or deleted, the same
philosophy as `inventory_movements`/`audit_entries`. Only meaningful while
its shift is `OPEN`; `RecordCashMovementUseCase` rejects one against a
`CLOSED` shift.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `shift_id` | `uuid` | `shift_id` → `pos_shifts(tenantId, id)`, `ON DELETE RESTRICT`. |
| `type` | `PosCashMovementType` | `CASH_IN` / `CASH_OUT`. |
| `amount` | `numeric(14,4)` | Always positive — direction comes from `type`, never a signed value. |
| `reason` | `varchar(500)` | Required, not optional — a movement outside of a sale/return has no other way to explain itself later during a shift-close reconciliation. |
| `recorded_by_user_id` | `uuid` | → `users(id)`, `ON DELETE RESTRICT`. |
| `created_at` | `timestamptz(6)` | |

### `pos_sales`

The POS-owned record of a completed sale — created only after the real
`SalesOrder` (channel `POS`) is confirmed and fulfilled and its `Payment`
is `CAPTURED`; nothing is persisted here for an attempt that fails partway
(`RingUpSaleUseCase` compensates by cancelling the order instead, the same
pattern `ConfirmSalesOrderUseCase` already established — see
docs/SECURITY.md "POS").

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `shift_id` | `uuid` | `shift_id` → `pos_shifts(tenantId, id)`, `ON DELETE RESTRICT`. |
| `sales_order_id` | `uuid` | → `sales_orders(tenantId, id)`, `ON DELETE RESTRICT`, `@@unique([tenantId, salesOrderId])` — a real `SalesOrder` created via POS belongs to exactly one `PosSale`. |
| `payment_id` | `uuid` | → `payments(tenantId, id)`, `ON DELETE RESTRICT`, `@@unique([tenantId, paymentId])` — `payments` gained its first `@@unique([tenantId, id])` in this same migration (its first FK consumer, same situation `customers`/`taxes`/`suppliers` were in before Sales/Purchasing). |
| `idempotency_key` | `varchar(100)` | `@@unique([tenantId, companyId, idempotencyKey])` — the real constraint that satisfies `docs/ROADMAP.md` §10's exit criterion ("Reintentos de terminal no duplican ventas/pagos") for the case that matters in practice: a terminal that resends the exact same request after losing the response. See docs/SECURITY.md "POS" for the documented boundary of this guarantee under a genuinely simultaneous (not sequential) multi-request race. |
| `payment_method` / `amount` | `PaymentMethod` / `numeric(14,4)` | Snapshotted from the real `Payment` at creation time so `CloseShiftUseCase` can sum a shift's cash sales with one indexed query instead of joining out to `payments` per row — same "snapshot a fact that must never silently drift" reasoning `SalesOrderLine.unitPrice` already established. |
| `amount_tendered` / `change_due` | `numeric(14,4)?` | Cashier-facing only (cash handed over vs. change to return) — informational, never re-derived from `amount`. |
| `created_at` | `timestamptz(6)` | |

### `pos_returns`

Mirrors `pos_sales`: created only after the real `SalesReturn` (and, if
`refunded`, the real `RefundPaymentUseCase` call against the original
sale's `Payment`) succeed.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `shift_id` | `uuid` | `shift_id` → `pos_shifts(tenantId, id)`, `ON DELETE RESTRICT`. |
| `pos_sale_id` | `uuid` | → `pos_sales(tenantId, id)`, `ON DELETE RESTRICT`. |
| `sales_return_id` | `uuid` | → `sales_returns(tenantId, id)`, `ON DELETE RESTRICT`, `@@unique([tenantId, salesReturnId])`. |
| `idempotency_key` | `varchar(100)` | `@@unique([tenantId, companyId, idempotencyKey])`, same reasoning as `pos_sales.idempotency_key`. |
| `refunded` | `boolean` | `false` by default — a return can legitimately be goods-only (no money back). |
| `refund_amount` / `refund_method` | `numeric(14,4)?` / `PaymentMethod?` | Set only when `refunded`; always the *original* payment's full amount — this codebase has no partial-refund capability yet (`docs/DECISIONS.md` ADR-009) — so at most one `pos_returns` row per `pos_sale` can ever have `refunded = true`; a second, goods-only return against the same sale is how a sale is returned more than once without attempting to refund an already-`REFUNDED` payment. |
| `reason` | `varchar(500)?` | |
| `created_at` | `timestamptz(6)` | |

### Migration

`packages/database/prisma/migrations/20260901194057_pos/` — same
non-interactive `prisma migrate diff --script` workaround, applied cleanly
to real Postgres on the first attempt: five new tables, two new enums
(`PosShiftStatus`, `PosCashMovementType`), and `@@unique([tenantId, id])`
added to `payments` (its first FK consumer).

## Commerce tables (Phase 7A, 2026-09-02)

Scope: `docs/ROADMAP.md` §11 — Storefront, catalog publication, Cart,
Checkout. `apps/api/src/modules/commerce`. Like POS, `CheckoutUseCase`
owns almost no domain data of its own beyond bookkeeping: a completed
checkout *is* a real `SalesOrder` (channel `ECOMMERCE`) plus, optionally, a
real `Payment`, created through Sales'/Payments' own public contracts;
`commerce_orders` exists to give a storefront its own reporting surface
and idempotency guarantee, not to duplicate those tables.

### `storefronts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `default_warehouse_id` | `uuid?` | → `warehouses(tenantId, id)`, `ON DELETE RESTRICT` — required only if a cart line's product actually tracks inventory (validated at checkout, the same conditional-requirement style `sales_order_lines.warehouse_id` already uses); a storefront selling only non-tracked products never needs one. |
| `code` | `varchar(63)` | `@unique` **globally**, not tenant-scoped — the one deliberate exception to this codebase's tenant-scoped-uniqueness convention, with a direct precedent (`tenants.slug` is globally unique for the identical reason: a public request needs a bare handle to resolve tenant/company scope from, with no session or header to trust — docs/ARCHITECTURE.md §7). |
| `name` | `varchar(200)` | |
| `domain` | `varchar(255)?` | Purely informational metadata — no real DNS/hosting routing is wired to this column (see docs/SECURITY.md "Commerce" Known limitations). |
| `currency` | `varchar(3)` | Every `Cart` created under this storefront inherits it. |
| `status` | `StorefrontStatus` | `ACTIVE` / `INACTIVE` — the public API rejects every read/write for an `INACTIVE` storefront with `409 STOREFRONT_NOT_ACTIVE`. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `storefront_products`

The publication join — a `Product` is never visible through the public API
unless it has a `PUBLISHED` row here for that exact storefront, keeping
the full internal Catalog decoupled from what a given storefront chooses
to show.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `storefront_id` / `product_id` | `uuid` | `@@unique([tenantId, storefrontId, productId])`. |
| `status` | `StorefrontProductStatus` | `PUBLISHED` / `UNPUBLISHED`. `PublishProductUseCase` is idempotent — publishing an already-published product just refreshes `published_at` rather than erroring or duplicating. |
| `published_at` | `timestamptz(6)` | |

### `carts`

Anonymous by design — no session, no authentication. `id` itself is the
public "cart token" a shopper's browser holds (see docs/SECURITY.md
"Commerce" Assets for why this is an acceptable public identifier).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Doubles as the public cart token. |
| `tenant_id` / `company_id` / `storefront_id` | `uuid` | |
| `currency` | `varchar(3)` | Inherited from the storefront at creation time. |
| `status` | `CartStatus` | `OPEN` → `CONVERTED`, exactly once, on a successful checkout — never reversible. No `ABANDONED` state: there is no abandonment job in this slice (MASTER_SPEC §59 — no state with no real code path behind it), so an inactive cart simply stays `OPEN` forever. |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `cart_lines`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `cart_id` / `product_id` / `product_variant_id` | `uuid` / `uuid?` | `product_variant_id` nullable, same conditional pattern as `sales_order_lines`. One line per (cart, product, variant) is an application-level rule (`AddCartLineUseCase` increases `quantity` on a match instead of inserting a second row) — deliberately **no** DB unique constraint for it, unlike `inventory_balances`'s partial unique indexes: a cart is not money-critical data on its own (the real invariant, order totals, is locked in at checkout time by the already-battle-tested `AddSalesOrderLineUseCase`), so an application-level rule is a proportionate, not a corner-cut, choice. |
| `quantity` | `numeric(14,4)` | |
| `unit_price` | `numeric(14,4)` | Snapshotted from the Catalog at add-time — the same "don't silently recompute a snapshotted fact" reasoning `sales_order_lines.unit_price` already established; a price change after adding to cart never silently changes what the shopper already sees. Never accepted from the caller (see docs/SECURITY.md "Commerce" Threats). |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `commerce_orders`

The Commerce-owned record of a completed checkout — mirrors `pos_sales`
closely, created only after a real `SalesOrder` (channel `ECOMMERCE`) is
confirmed through Sales' own public contract. Two deliberate differences
from `pos_sales`, both ratified in `docs/DECISIONS.md` ADR-011: (1)
idempotency is keyed by `cart_id` itself (`@@unique([tenantId, cartId])`),
not a caller-supplied string — a `Cart` converts at most once, so it
already is the natural dedup key; (2) `payment_id` is nullable and the
order is never auto-fulfilled here — an online order routinely gets paid
(`BANK_TRANSFER`, a self-declared reference) and fulfilled (warehouse
pick/pack) at a *later* time, through the very same Sales/Payments screens
already built for every other channel.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` / `storefront_id` / `cart_id` | `uuid` | `@@unique([tenantId, cartId])` — the idempotency constraint. |
| `sales_order_id` | `uuid` | → `sales_orders(tenantId, id)`, `ON DELETE RESTRICT`, `@@unique([tenantId, salesOrderId])`. |
| `payment_id` | `uuid?` | → `payments(tenantId, id)`, `ON DELETE RESTRICT`, `@@unique([tenantId, paymentId])` — `null` means "awaiting payment", a normal, expected state, never an error condition (docs/DECISIONS.md ADR-011). |
| `customer_id` | `uuid` | → `customers(tenantId, id)` — resolved by email via the new `FindCustomerByEmailUseCase` (Customers module), or created fresh for a genuinely new guest. |
| `guest_email` | `varchar(200)` | Snapshotted at checkout time, independent of whatever the linked `Customer.email` might later become — same "snapshot a fact that must never silently drift" philosophy as `sales_order_lines.unit_price`. |
| `total` | `numeric(14,4)` | The authoritative, final charge amount — computed server-side from the real `SalesOrder`'s own lines, never the cart's own informational `subtotal` preview. |
| `currency` | `varchar(3)` | |
| `created_at` | `timestamptz(6)` | |

### Migration

`packages/database/prisma/migrations/20260902095223_commerce/` — same
non-interactive `prisma migrate diff --script` workaround already
established, applied cleanly to real Postgres on the first attempt: five
new tables, three new enums (`StorefrontStatus`, `StorefrontProductStatus`,
`CartStatus`), and `@@unique([tenantId, paymentId])` added to
`commerce_orders` itself (required by Prisma for the one-to-one optional
relation from `payments`, its first genuinely optional FK consumer).

## Accounting tables (Phase 8, 2026-09-02)

Scope: `docs/ROADMAP.md` §12 — Chart of Accounts, Fiscal Periods, Journal
Entries/Lines. `apps/api/src/modules/accounting`. The only business
module's tables in this codebase with **no FK to any other business
module** — every reference here is either to Foundation (`tenants`,
`companies`, `users`) or within Accounting's own tables.

### `accounts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `parent_account_id` | `uuid?` | Self-referencing FK (`@relation("AccountParent")`), the same shape already used by `categories.parent_id` — purely organizational (a display/grouping tree); no automatic balance rollup from children to parents in this slice. |
| `code` | `varchar(50)` | `@@unique([tenantId, companyId, code])`. |
| `name` | `varchar(150)` | The only field `UpdateAccountUseCase` can change — see docs/SECURITY.md "Accounting" Assets for why `type`/`code` are immutable after creation. |
| `type` | `AccountType` | `ASSET` / `LIABILITY` / `EQUITY` / `REVENUE` / `EXPENSE`. Determines the domain entity's derived `normalBalance` — never a stored column, so it can never drift out of sync with `type`. |
| `status` | `MasterDataStatus` | Reused shared enum (`ACTIVE`/`INACTIVE`), same as `taxes`/`warehouses`. Only an `ACTIVE` account can receive a new posting (`AccountNotActiveError`). |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `fiscal_periods`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `code` | `varchar(50)` | `@@unique([tenantId, companyId, code])`. |
| `name` | `varchar(150)` | |
| `start_date` / `end_date` | `date` | Civil dates, not instants — same `@db.Date` convention already used by `price_lists.valid_from`/`valid_until` and `supplier_invoices.issue_date`/`due_date`. `CreateFiscalPeriodUseCase` rejects any range overlapping an existing period for the company, so at most one `OPEN` period ever covers a given date. |
| `status` | `FiscalPeriodStatus` | `OPEN` → `CLOSED`, terminal — no `ReopenFiscalPeriodUseCase` exists (see the domain entity's own docstring and docs/SECURITY.md "Accounting" Known limitations). |
| `closed_at` | `timestamptz(6)?` | |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `journal_entries`

Append-only (MASTER_SPEC §32) — the domain entity's own docstring carries
the full "never edit, only reverse" philosophy. `reversal_of_entry_id`/
`reversed_by_entry_id` are the two ends of the reversal pointer: a
reversing entry's `reversal_of_entry_id` points backward to what it
reverses; the original's `reversed_by_entry_id`/`reversed_at` are appended
once, after the fact, purely as a lifecycle pointer — the same "append
metadata about what happened to a fact, never rewrite the fact itself"
precedent `payments.refunded_at`/`file_objects.deleted_at` already
established.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `fiscal_period_id` | `uuid` | → `fiscal_periods(tenantId, id)`, `ON DELETE RESTRICT`. Resolved fresh from `entry_date` at posting time, never trusted from the caller. |
| `entry_date` | `date` | Civil date — the value `GetOpenFiscalPeriodForDateUseCase` resolves a covering `OPEN` period against. |
| `description` | `varchar(500)` | |
| `source_type` / `source_id` | `varchar(100)?` / `varchar(100)?` | Both null together (a manual entry) or both set together (an idempotent source-linked posting, docs/DECISIONS.md ADR-012). `@@unique([tenantId, companyId, sourceType, sourceId])` — Postgres treats every `NULL` as distinct for uniqueness, so unlimited manual entries coexist freely while a genuine pair can never double-post. |
| `reversal_of_entry_id` / `reversed_by_entry_id` | `uuid?` / `uuid?` | The two reversal pointers described above. Not FK-constrained to `journal_entries` itself (a self-reference would require a nullable, deferred, or separate-migration FK for no real integrity gain here — the ids are only ever set by `ReverseJournalEntryUseCase` itself, never accepted from a caller). |
| `reversed_at` | `timestamptz(6)?` | |
| `created_by_user_id` | `uuid` | → `users(id)`, `ON DELETE RESTRICT` — same pattern as `inventory_movements.created_by_user_id`/`pos_shifts.opened_by_user_id`: a real actor, not a tenant-scoped FK, since `User` is a global Foundation entity. |
| `correlation_id` | `varchar(100)` | Same `varchar(100)` (not `uuid`) convention already used by `audit_entries`/`outbox_messages`/`inventory_movements` — a client-supplied `X-Correlation-Id` header is never guaranteed to be a well-formed UUID. |
| `created_at` | `timestamptz(6)` | |

### `journal_entry_lines`

One side of a double-entry posting — read-only from the application's
perspective; every row is created exclusively by
`JournalEntryRepository.saveWithLines`, atomically with its parent entry
inside one transaction (a partially-saved unbalanced entry would be a real
integrity violation, not just a display glitch).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `journal_entry_id` / `account_id` | `uuid` | `journal_entry_id` → `journal_entries(tenantId, id)`; `account_id` → `accounts(tenantId, id)`, both `ON DELETE RESTRICT`. |
| `line_number` | `int` | `@@unique([tenantId, journalEntryId, lineNumber])` — a stable, deterministic order for a given entry's lines. |
| `debit` / `credit` | `numeric(14,4)` | Exactly one positive, the other zero — enforced in the domain (`JournalEntryLine.create()`), never both zero (a no-op line) or both positive (an ambiguous line). |
| `description` | `varchar(300)?` | |
| `created_at` | `timestamptz(6)` | |

### Migration

`packages/database/prisma/migrations/20260902142615_accounting/` — same
non-interactive `prisma migrate diff --script` workaround already
established, applied cleanly to real Postgres on the first attempt: four
new tables and two new enums (`AccountType`, `FiscalPeriodStatus`). No
extension to any existing table was needed — the first business-module
migration in this codebase to be purely additive with zero touches to
tables owned by another module, a direct consequence of Accounting having
no cross-module FK at all (docs/DECISIONS.md ADR-012).

## CRM tables (Phase 9, 2026-09-02)

Scope: `docs/ROADMAP.md` §13 — Lead, Pipeline/PipelineStage, Opportunity,
Activity. `apps/api/src/modules/crm`. Second business module (after Sales)
with a genuine FK-backed reference into Customers (`leads.converted_customer_id`,
`opportunities.customer_id`, `activities.related_customer_id`), never a
duplicated Party/Customer concept — see the `Lead` model's own docstring.

### `leads`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `name` | `varchar(200)` | |
| `company_name` | `varchar(200)?` | |
| `email` / `phone` | `varchar(200)?` / `varchar(40)?` | |
| `source` | `varchar(100)?` | Free text (e.g. "Sitio web", "Referido") — no fixed catalog. |
| `status` | `LeadStatus` | `NEW` / `CONTACTED` / `QUALIFIED` / `CONVERTED` / `LOST`. `CONVERTED`/`LOST` are terminal (`Lead.isTerminal`) — no code path moves a lead out of either. |
| `owner_id` | `uuid` | → `users(id)`, `ON DELETE RESTRICT`. Defaults to the creating user (`CreateLeadUseCase`), reassignable via update. |
| `consent_marketing` | `boolean` | Default `false`. |
| `consented_at` | `timestamptz(6)?` | Set whenever `consent_marketing` is toggled. |
| `converted_customer_id` | `uuid?` | → `customers(tenantId, id)`, `ON DELETE RESTRICT`. Set exactly once, by `ConvertLeadUseCase`, never cleared or reassigned. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `pipelines`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `code` | `varchar(50)` | `@@unique([tenantId, companyId, code])`. |
| `name` | `varchar(150)` | |
| `status` | `MasterDataStatus` | Reused shared enum (`ACTIVE`/`INACTIVE`), same as `taxes`/`warehouses`/`accounts`. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `pipeline_stages`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `pipeline_id` | `uuid` | `pipeline_id` → `pipelines(tenantId, id)`, `ON DELETE RESTRICT`. |
| `name` | `varchar(100)` | |
| `sort_order` | `int` | Always appended at the end by `AddPipelineStageUseCase` (`existingStages.length`) — no reorder use case, so no unique constraint on this column. |
| `is_won` / `is_lost` | `boolean` | Default `false` each. Never both `true` on the same stage — enforced in the domain (`PipelineStage.create()`). |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `opportunities`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `name` | `varchar(200)` | |
| `pipeline_id` / `stage_id` | `uuid` | → `pipelines(tenantId, id)` / `pipeline_stages(tenantId, id)`, both `ON DELETE RESTRICT`. `MoveOpportunityStageUseCase` rejects a target stage whose own `pipeline_id` doesn't match the opportunity's. |
| `customer_id` / `lead_id` | `uuid?` / `uuid?` | → `customers(tenantId, id)` / `leads(tenantId, id)`, both `ON DELETE RESTRICT`. Both optional and never mutually exclusive — an opportunity can have neither, either, or both. |
| `amount` | `numeric(14,4)` | Non-negative, validated via the module's own dependency-free BigInt decimal arithmetic (`crm/domain/decimal.ts`) — never a JavaScript float. |
| `currency` | `varchar(3)` | ISO 4217-shaped, not validated against a real currency list — same scope boundary already accepted for `price_lists.currency`. |
| `expected_close_date` | `date?` | Civil date, not an instant. |
| `status` | `OpportunityStatus` | `OPEN` → `WON` \| `LOST`, terminal — `UpdateOpportunityUseCase`/`MoveOpportunityStageUseCase` both reject once `status !== "OPEN"`. |
| `owner_id` | `uuid` | → `users(id)`, `ON DELETE RESTRICT`. Defaults to the creating user. |
| `closed_at` | `timestamptz(6)?` | Set once, when `status` transitions away from `OPEN`. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `activities`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `type` | `ActivityType` | `CALL` / `EMAIL` / `MEETING` / `NOTE` / `TASK`. |
| `subject` | `varchar(200)` | |
| `notes` | `varchar(2000)?` | |
| `related_lead_id` / `related_opportunity_id` / `related_customer_id` | `uuid?` each | → `leads(tenantId, id)` / `opportunities(tenantId, id)` / `customers(tenantId, id)`, all `ON DELETE RESTRICT`. Exactly one non-null, enforced in the domain (`Activity.create()`) and pre-validated in the application layer (`CreateActivityUseCase`) before ever reaching it — no database-level constraint expresses "exactly one of three columns", since Postgres has no direct equivalent short of a `CHECK` constraint this schema does not add. |
| `owner_id` | `uuid` | → `users(id)`, `ON DELETE RESTRICT`. Defaults to the creating user. |
| `due_at` | `timestamptz(6)?` | |
| `completed_at` | `timestamptz(6)?` | Set once, by `CompleteActivityUseCase`; `Activity.complete()` rejects a second completion. |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### Migration

`packages/database/prisma/migrations/20260902195127_crm/` — same
non-interactive `prisma migrate diff --script` workaround already
established, applied cleanly to real Postgres on the first attempt: five
new tables and three new enums (`LeadStatus`, `OpportunityStatus`,
`ActivityType`), plus `@@unique([tenantId, id])` on `leads`, `pipelines`,
`pipeline_stages` and `opportunities` (each a real FK consumer within this
same migration — `opportunities.lead_id`, `activities.related_*`). No
extension to any table owned by another module was needed beyond the FKs
into `customers`/`users`, both pre-existing tables.

## Manufacturing tables (Phase 10, 2026-09-03)

Scope: `docs/ROADMAP.md` §14 — BOM with versioning, Production Orders with
material requirements/operations/finished goods, all posted through
Inventory's real ledger. `apps/api/src/modules/manufacturing`. Three direct,
cycle-free dependencies (Catalog, Warehouses, Inventory); no dependency on,
or from, Sales/Purchasing/POS/Commerce/Accounting/CRM.

### `bill_of_materials`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `company_id` | `uuid` | |
| `product_id` | `uuid` | → `products(tenantId, id)`, `ON DELETE RESTRICT`. The finished good; validated via `ResolveManufacturingProductTargetUseCase` (must be `trackInventory: true` and company-owned). |
| `code` | `varchar(50)` | `@@unique([tenantId, companyId, code])`. |
| `name` | `varchar(150)` | |
| `version` | `int` | Default `1`, auto-assigned by `CreateBillOfMaterialUseCase` as `existingCount(product) + 1` — never user-supplied. `@@unique([tenantId, companyId, productId, version])`. Immutable once created; a revision is a new row, never an edit. |
| `status` | `MasterDataStatus` | `ACTIVE` / `INACTIVE`, reused shared enum. Only `ACTIVE` BOMs can be used by `CreateProductionOrderUseCase`. |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### `bill_of_material_components`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `bill_of_material_id` | `uuid` | `bill_of_material_id` → `bill_of_materials(tenantId, id)`, `ON DELETE CASCADE` — the one true parent-owns-child relation in this module. |
| `component_product_id` / `component_variant_id` | `uuid` / `uuid?` | → `products(tenantId, id)` (relation `BomComponentProduct`) / `product_variants(tenantId, id)`, both `ON DELETE RESTRICT`. Validated the same way as the finished good — must be `trackInventory: true`, company-owned, and cannot equal the BOM's own `product_id` (no self-referencing recipe). |
| `quantity_per_unit` | `numeric(14,4)` | Amount required to produce exactly one unit of the BOM's finished good; scaled by `quantityPlanned` when snapshotted into `production_order_materials`. |
| `created_at` | `timestamptz(6)` | Created together with its parent, never mutated afterward — no `updated_at`. |

### `production_orders`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `@@unique([tenantId, id])` — this table's first real FK consumer is its own children below. |
| `tenant_id` / `company_id` | `uuid` | |
| `bill_of_material_id` | `uuid` | → `bill_of_materials(tenantId, id)`, `ON DELETE RESTRICT`. |
| `product_id` | `uuid` | → `products(tenantId, id)`, `ON DELETE RESTRICT`. Denormalized from the BOM at creation for convenient querying, never re-derived afterward. |
| `warehouse_id` | `uuid` | → `warehouses(tenantId, id)`, `ON DELETE RESTRICT`. Resolved via Warehouses' real `GetWarehouseUseCase`. |
| `quantity_planned` | `numeric(14,4)` | Positive, validated via the module's own dependency-free BigInt decimal arithmetic (`manufacturing/domain/decimal.ts`). |
| `status` | `ProductionOrderStatus` | `DRAFT` / `CONFIRMED` / `CLOSED` / `CANCELLED`. `DRAFT -> CONFIRMED -> CLOSED`; `CANCELLED` only from `DRAFT`/`CONFIRMED`, and only if no real material movement or finished-goods receipt exists yet (`ProductionOrderHasActivityError`). No stored `quantity_completed` column — always summed fresh from `production_order_finished_goods_receipts`. |
| `version` | `int` | |
| `created_at` / `updated_at` | `timestamptz(6)` | |
| `confirmed_at` / `closed_at` / `cancelled_at` | `timestamptz(6)?` each | Set once, on the matching transition. |

### `production_order_materials`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `@@unique([tenantId, id])` — consumed by `production_order_material_movements` below. |
| `tenant_id` / `production_order_id` | `uuid` | `production_order_id` → `production_orders(tenantId, id)`, `ON DELETE CASCADE`. |
| `component_product_id` / `component_variant_id` | `uuid` / `uuid?` | → `products(tenantId, id)` (relation `ProductionOrderMaterialProduct`) / `product_variants(tenantId, id)`, both `ON DELETE RESTRICT`. |
| `quantity_required` | `numeric(14,4)` | Snapshotted once, at order-creation time, from `bill_of_material_components.quantity_per_unit × quantity_planned` — never re-derived from the BOM afterward. No stored "issued"/"returned" columns; every use case sums the real ledger below instead. |
| `created_at` | `timestamptz(6)` | |

### `production_order_material_movements`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `production_order_material_id` | `uuid` | `production_order_material_id` → `production_order_materials(tenantId, id)`, `ON DELETE CASCADE`. |
| `type` | `ProductionOrderMaterialMovementType` | `ISSUE` / `RETURN` — the direction is carried by `type`, not by a signed `quantity` (mirrors `InventoryMovement`'s own typed-ledger shape, not its signed-quantity convention). |
| `quantity` | `numeric(14,4)` | Always positive regardless of `type`. Each row is created in the same call that posts the matching real Inventory ledger movement (`referenceType: "PRODUCTION_ORDER"`) via `RecordIssueUseCase`/`RecordReturnUseCase`. |
| `created_at` | `timestamptz(6)` | Append-only — no update/delete. |

### `production_order_operations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `production_order_id` | `uuid` | `production_order_id` → `production_orders(tenantId, id)`, `ON DELETE CASCADE`. |
| `name` | `varchar(150)` | Free text — a simple named process step, no work-center/routing model. |
| `sort_order` | `int` | Always appended at the end (`existingOperations.length`) — no reorder use case, no unique constraint on this column, same "always append" precedent as `pipeline_stages.sort_order`. |
| `completed_at` | `timestamptz(6)?` | Set once by `CompleteProductionOrderOperationUseCase`; no way to un-complete. |
| `created_at` | `timestamptz(6)` | |

### `production_order_finished_goods_receipts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `tenant_id` / `production_order_id` | `uuid` | `production_order_id` → `production_orders(tenantId, id)`, `ON DELETE CASCADE`. |
| `quantity` | `numeric(14,4)` | Validated against `quantity_planned` minus the running sum of prior receipts — genuinely partial across multiple calls, same pattern as `purchase_receipt_lines`. |
| `created_at` | `timestamptz(6)` | Append-only. Each row is created in the same call that posts the matching real Inventory `RECEIPT` movement (`referenceType: "PRODUCTION_ORDER"`) via `RecordReceiptUseCase`. |

### Migration

`packages/database/prisma/migrations/20260903032203_manufacturing/` — same
non-interactive `prisma migrate diff --script` workaround already
established, applied cleanly to real Postgres on the first attempt: seven
new tables and two new enums (`ProductionOrderStatus`,
`ProductionOrderMaterialMovementType`), plus `InventoryMovementReferenceType`
extended with `PRODUCTION_ORDER` and `@@unique([tenantId, id])` added to
`bill_of_materials` and `production_orders` (each a real FK consumer within
this same migration). No extension to any table owned by another module
was needed beyond the FKs into `products`/`product_variants`/`warehouses`,
all pre-existing tables — the first migration of a business module since
Accounting (Phase 8) to touch no table it doesn't itself own, beyond
`inventory_movements`' own `InventoryMovementReferenceType` enum.
