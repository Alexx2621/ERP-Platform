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

There is deliberately **no `inbox_messages` table yet** (`docs/EVENTS.md`
§9) — see docs/SECURITY.md "Event Bus" for why: the only consumer today is
the in-process `DomainEventBus`, invoked synchronously by the same
dispatcher (now running inside `apps/worker`, see ADR-004's amendment) that
just claimed the row, so there is no cross-process re-delivery path yet
that would need per-consumer dedupe. Add it before any real cross-process
consumer exists.

### Migration

`packages/database/prisma/migrations/20260827232432_event_bus_outbox/` —
generated and applied via `prisma migrate dev --name event_bus_outbox`
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
| `status` | enum `ACTIVE`/`DELETED` | Deliberate, explicit soft-delete (MASTER_SPEC §33) rather than a generic `deleted_at`-on-every-table policy — see `docs/SECURITY.md` "Files" for why `DELETE /files/:id` does not synchronously remove the storage object. |
| `created_at` | `timestamptz(6)` | |
| `deleted_at` | `timestamptz?` | Set once, by `FileObject.markDeleted` — idempotent (deleting twice keeps the first timestamp). |

`@@unique(storageKey)` makes a duplicate/colliding object key impossible at
the database level, not just by convention. `@@index([tenantId, companyId])`
supports the primary read pattern (a tenant's, optionally a company's, file
listing).

### Migration

`packages/database/prisma/migrations/20260827235703_files_foundation/` —
generated and applied via `prisma migrate dev --name files_foundation`
against the real `erp_platform` Postgres container, confirmed applying
cleanly both there and against the ephemeral Testcontainers instance used by
`apps/api/test/integration`.

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
