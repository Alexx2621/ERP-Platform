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
