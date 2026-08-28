# Security

Estado: **living document, built incrementally per module** (`docs/ROADMAP.md`
Fase 0 calls for a threat model here before coding; this file was empty when
FOUNDATION-001 started, so this first section — Authentication — was written
as part of that task, scoped to what it built). Other modules must add their
own sections here as they are implemented; this file is not yet a complete
platform threat model.

---

## Authentication (FOUNDATION-001)

Scope: password credentials, login, sessions, refresh, logout, session
revocation. Excludes MFA, OAuth/SSO, API keys (deferred, see
`docs/tasks/FOUNDATION-001.md`). Design decisions and their rationale are in
`docs/DECISIONS.md` ADR-006 — this section covers threats and controls, ADR-006
covers *why* each control looks the way it does.

### Assets

- Password hashes (`user_credentials.password_hash`).
- Session tokens, in transit and their hashes at rest (`sessions.*_hash`).
- User identity/status (`users.status` gates all access).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| Password database compromise | Argon2id hashing (OWASP baseline params, ADR-006); no reversible storage; no plaintext ever logged. |
| Credential stuffing / brute force on login | `@nestjs/throttler` on `/api/v1/auth/*` (`LOGIN_RATE_LIMIT_MAX`/`_WINDOW_SECONDS`), backed by Redis (`@nest-lab/throttler-storage-redis`) since 2026-08-26 — the limit holds across multiple API instances, not just per-process. |
| Timing-based user enumeration via login | `LoginUseCase` always runs a password verification, even against a dummy hash when the email doesn't exist, before returning `INVALID_CREDENTIALS`. |
| Status-based user enumeration via login | Account-disabled is only reported *after* a correct password; a wrong-password guess gets the same `INVALID_CREDENTIALS` whether the account exists, is disabled, or the password is simply wrong. |
| Stolen/leaked access token | Short TTL (15 min default) bounds the exposure window; immediate server-side revocation is possible because sessions are opaque DB-backed rows, not self-contained JWTs (ADR-006). |
| Stolen/replayed refresh token | Single-use rotation: using a refresh token invalidates it immediately (new hash overwrites the old one on the same row). A replayed old token finds no matching row and fails closed. Reuse-detection/family-revocation is a known gap — see below. |
| Token guessing | Tokens are 256 bits of `crypto.randomBytes`, base64url-encoded — not guessable. |
| Token leakage via logs/DB dumps | Only SHA-256 hashes of tokens are persisted (`sessions.access_token_hash`/`refresh_token_hash`); the raw token exists only in the HTTP response and the client's hands. Passwords, tokens and secrets are never written to logs (`HttpExceptionFilter` logs only `code`/`correlationId`/stack for 5xx, never request bodies). |
| Disabled user continuing to act on an old token | `ValidateSessionUseCase` re-checks `user.status` on every use of an access token, not only at login — a disabled account's tokens stop working within one access-token TTL without needing an event/notification path (ADR-006 §6). |
| Malformed/oversized input (DoS via huge payloads, injection) | `class-validator` DTOs (`LoginDto`, `RefreshDto`) with explicit `@MaxLength`; global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` rejects unexpected fields; Prisma parameterizes all queries (no raw SQL in this module). |
| Cross-tenant data exposure via this module | Not directly applicable: `User`/`Credential`/`Session` are global-identity data with no `tenant_id` (`docs/MULTITENANCY.md` §4.8) — see Tenant isolation below for what that does and does not guarantee. |
| Internal errors leaking stack traces / implementation details | `HttpExceptionFilter` maps every error to the standard envelope (`statusCode`, `code`, `message`, `details`, `correlationId`); unmapped exceptions become a generic `INTERNAL_ERROR` with no internal detail, logged server-side only. |

### Known limitations (accepted for this Foundation slice, not silently ignored)

- ~~Rate limiting is per-process, in-memory.~~ Closed 2026-08-26: now backed
  by Redis (`apps/api/src/shared/redis`), so the limit holds across multiple
  API instances.
- **No refresh-token reuse-detection/family revocation.** A replayed stale
  refresh token fails (session lookup misses), but the system does not treat
  that as a signal to revoke the rest of the session's lineage, because there
  is no lineage tracked beyond the single current token pair. Documented
  as a deliberate Foundation trade-off in ADR-006, not an oversight.
- **No account lockout after N failed attempts** beyond the rate limiter.
  A persistent lockout policy is a product decision (support/unlock flow
  implications) out of scope for this task.
- ~~No audit log entries yet for login/logout/revocation~~ — closed
  2026-08-27: `AuthController` now records `user.registered`,
  `auth.login.succeeded`/`auth.login.failed`, `auth.logout` and
  `auth.sessions.revoked_all`. Recorded at the controller layer (not inside
  `LoginUseCase`/`LogoutUseCase`/`RevokeAllSessionsUseCase` themselves) to
  avoid changing those use cases' already-tested signatures — see "Audit"
  below for the full design and its trade-offs.
- **No password strength/breach-list policy enforced** beyond an 8-character
  minimum on `RegisterDto` (`core/auth/presentation/dto/register.dto.ts`,
  added 2026-08-26 with the `/auth/register` endpoint). `SetPasswordUseCase`
  itself still enforces nothing — a future password-reset flow reusing it
  directly should apply the same DTO-level bound. Complexity rules and a
  breach-list check remain a deferred product/UX decision.

### Tenant isolation review (FOUNDATION-001)

`User`, `UserCredential` and `Session` are intentionally **not** tenant-scoped
(`docs/MULTITENANCY.md` §4.8: User is a global identity; a Membership — owned
by the Access Control / Tenancy tracks, not this task — is what scopes a user
into a tenant). Consequences for this module specifically:

- There is no `tenant_id` column to isolate here, and no cross-tenant query
  path exists in this module: every repository method takes a specific
  `userId`/token hash, never a bare "list everything" call.
- This module does **not** implement or guarantee tenant-level authorization.
  A valid session proves "this is user X," not "user X may act on tenant Y" —
  that check belongs to Access Control (Membership + RoleAssignment,
  `docs/MULTITENANCY.md` §9), which does not exist yet. Any endpoint built on
  top of `SessionAuthGuard` before Access Control lands must not assume
  tenant-scoped authorization is already handled.

## Tenant Context HTTP integration (2026-08-26)

Scope: `TenantContextGuard`, `POST /api/v1/tenants` (provisioning), `GET
/api/v1/tenants` (list mine), `GET /api/v1/tenants/current`, `POST
/api/v1/auth/register` — the pieces connecting Authentication to Tenancy
(`docs/WORK_QUEUE.md`).

| Threat | Control |
| --- | --- |
| Client claims a tenant it has no access to via the `X-Tenant-Slug` header | `TenantContextGuard` never trusts the header alone: it calls `ResolveTenantContextUseCase`, which re-checks an *active* `Membership` for the *authenticated* user (from `SessionAuthGuard`, not the header) against that tenant. A guessed/arbitrary slug for a tenant the user has no membership in fails closed (`MEMBERSHIP_INACTIVE`/`TENANT_NOT_FOUND`), regardless of what the header says. |
| Guard ordering bypass (resolving tenant context without authenticating first) | `TenantContextGuard.canActivate` throws a 500 (`TENANT_CONTEXT_REQUIRES_AUTH`) if `request.authContext` is absent, rather than silently treating the request as unscoped — this fails loud in development if a controller applies the guards out of order, instead of silently accepting unauthenticated tenant access in production. |
| Company id from another tenant via `X-Company-Id` | Rejected: `ResolveTenantContextUseCase` looks the company up scoped to the already-resolved `tenantId`, so a company id belonging to a different tenant is simply not found (`CompanyContextUnavailableError`) — exercised in `resolve-tenant-context.use-case.spec.ts`. |
| Tenant provisioning abuse (unauthenticated or scripted account+tenant creation) | `POST /api/v1/tenants` requires a valid session (`SessionAuthGuard`) — no anonymous tenant creation. **Gap:** unlike `/auth/*`, this route and `/auth/register` are not rate-limited (`ThrottlerGuard` is only applied to `AuthController`). Acceptable for now (both still require either no prior state or an authenticated session), but should be revisited once Access Control lands and tenant creation has a real cost/quota model (MASTER_SPEC §56 licensing). |
| Weak passwords at registration | `RegisterDto` enforces an 8-character minimum (see Known limitations above) — a floor, not a full policy. |

### Required tests (from `docs/tasks/FOUNDATION-001.md`) and where they live

All under `apps/api/src/core/auth/application/use-cases/*.spec.ts`:
valid login, invalid password, disabled user (`login.use-case.spec.ts`);
expired session (`validate-session.use-case.spec.ts`,
`refresh-session.use-case.spec.ts`); revoked session
(`validate-session.use-case.spec.ts`, `refresh-session.use-case.spec.ts`,
`logout.use-case.spec.ts`).

## Access Control / RBAC (2026-08-27)

Scope: `Permission`, `Role`, `RoleAssignment`, `PermissionGuard`,
`@RequirePermission()` (`apps/api/src/core/access-control`) — this is what
closes the gap the previous section flagged: "a valid session proves *this
is user X*, not *user X may act on tenant Y*." Design in
`docs/MULTITENANCY.md` §9; schema in `docs/DATABASE.md`.

### Assets

- Role → permission mappings (`role_permissions`) and role → membership
  grants (`role_assignments`) — these are the actual authorization boundary
  for every future business endpoint, not just this module's own routes.
- The permission catalog itself (`permissions`) — code-owned, not
  user-writable, so it cannot be used as a privilege-escalation vector via
  the API (there is no `POST /api/v1/permissions`).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A membership with no role acts anyway (fail-open) | Deny-by-default: `HasPermissionUseCase` returns `false` unless an active `RoleAssignment` whose role includes the key and whose scope covers the request context is found. Exercised directly (`has-permission.use-case.spec.ts`: "denies by default when the membership has no role assignments") and end-to-end against real Postgres+HTTP in a live smoke test (fresh membership with zero assignments → `GET /api/v1/roles` → `403 PERMISSION_DENIED`). |
| `PermissionGuard` applied without a permission requirement, or run before tenant context is resolved | Both fail closed with a `500` (`PERMISSION_METADATA_MISSING` / `PERMISSION_GUARD_REQUIRES_TENANT_CONTEXT`) rather than silently allowing the request through — a misconfigured route is loud in development, not a silent authorization bypass in production. `permission.guard.spec.ts` covers both. |
| A `COMPANY`-scoped grant is used to act on a different company | `RoleAssignment.covers({ companyId })` only returns `true` when `scopeId === companyId`; a `TENANT`-scoped grant always covers, by design (`role-assignment.entity.spec.ts`, plus the integration test's cross-tenant assertions). |
| Cross-tenant role/assignment access via a guessed id | Every table in this module is tenant-scoped and referenced through the composite `(tenantId, id)` FK pattern (`docs/MULTITENANCY.md` §8): `roles`, `role_permissions`, and `role_assignments` all carry `tenant_id`, so a role or assignment belonging to tenant B is structurally invisible to a query scoped to tenant A, not just filtered out by a `WHERE` clause that could be forgotten. Verified against real Postgres in `apps/api/test/integration/prisma-repositories.integration-spec.ts`. |
| Assigning a role to a `membershipId` that does not belong to the tenant | This module never imports Tenancy to pre-validate the membership (that would create a module dependency cycle, see `access-control.module.ts`). Instead, the composite FK `role_assignments(tenant_id, membership_id) → memberships(tenant_id, id)` is the actual control: `PrismaRoleAssignmentRepository` catches the resulting `P2003` violation and rethrows it as the domain-level `MembershipNotFoundInTenantError` (mapped to `404 MEMBERSHIP_NOT_FOUND`), so a bad membership id is rejected by the database, not merely by application logic that could have a gap. Verified against real Postgres (not the in-memory fake, which deliberately does not simulate this FK — see its own comment). |
| A brand-new tenant's owner has an active membership but zero permissions | `SeedOwnerRoleUseCase` runs immediately after `ProvisionTenantUseCase` succeeds (`TenantsController.provision`), creating a system "Owner" role with every permission that exists at that moment and assigning it at `TENANT` scope. Confirmed against real infra in a live smoke test: `POST /api/v1/tenants` → `GET /api/v1/roles` returns the seeded Owner role with all three current permission keys. |
| Privilege escalation via the role-management endpoints themselves | `POST /api/v1/roles` and `POST /api/v1/roles/:id/assignments` are gated by `access.roles.manage` through the same `PermissionGuard` as every other protected route — there is no separate, less-guarded path to grant roles. A membership cannot grant itself a permission it does not already effectively have unless it already holds `access.roles.manage`. |
| Unknown/typo'd permission key accepted when creating a role | `CreateRoleUseCase` validates every requested key against the `permissions` table and rejects the whole request (`UnknownPermissionKeysError` → `400`) if any key is unrecognized — a role can never reference a permission that doesn't exist in the catalog. |

### Known limitations (accepted for this slice, not silently ignored)

- **No `BRANCH`/`WAREHOUSE` scope.** `RoleAssignmentScope` is only `TENANT`/
  `COMPANY` because those are the only organizational entities that exist
  yet (`docs/ARCHITECTURE.md`'s Organization Structure context). Accepting a
  `scope_id` for an entity type with nothing to validate it against would be
  an unenforced access claim, not a real control — deferred until those
  entities are built, not forgotten.
- **No membership-invitation endpoint yet.** There is currently no
  `POST /api/v1/tenants/:id/memberships` (or similar) to add a second user to
  an existing tenant through the API — the live smoke test for this module
  had to insert a `Membership` row directly via Prisma to exercise the
  deny-by-default path with a second, real user. This is a real gap in
  Organization/Tenancy, not in RBAC itself, and should be closed before
  multi-user tenants are usable end-to-end.
- **No retroactive permission backfill.** `SeedOwnerRoleUseCase` grants
  "every permission that exists at provisioning time." If a new permission
  is added to the catalog later, existing tenants' Owner roles are **not**
  automatically updated to include it — a future migration/backfill job, not
  something this use case does implicitly on every boot (which would make
  role contents silently drift underneath whatever a tenant admin
  configured).
- ~~No audit log entries yet for role creation or assignment~~ — closed
  2026-08-27: `RolesController` now records `access_control.role.created`
  and `access_control.role_assignment.created`; the Owner-role auto-seed at
  provisioning is also recorded (`access_control.owner_role.seeded`, actor
  `null` since it is system-initiated). See "Audit" below.
- **Owner-role seeding is not transactional with tenant provisioning.**
  Documented already in `TenantsController.provision`'s own comment and
  repeated here because it is a security-relevant gap, not just a technical
  one: if `SeedOwnerRoleUseCase` throws after `ProvisionTenantUseCase`
  commits, the tenant exists with an active owner membership that can
  authenticate but cannot yet manage anything (including granting itself a
  role), since no role is assigned. No saga/outbox exists yet to make this
  atomic or auto-retry it.

## Typed Configuration (2026-08-27)

Scope: `SettingDefinition`, `SettingValue`, `UserPreference`, `SettingsController`,
`PreferencesController` (`apps/api/src/core/configuration`) — implements
`docs/ARCHITECTURE.md` §8.2 / MASTER_SPEC §28-29.

### Assets

- Tenant/company setting overrides (`setting_values`) — currently only
  localization values (currency/timezone/locale), but the mechanism will
  carry higher-stakes configuration (tax behavior, document series, default
  warehouse, ...) once those modules exist.
- The setting catalog itself (`setting_definitions`) — code-owned, not
  user-writable; there is no `POST /api/v1/settings/definitions`.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A tenant admin overwrites the platform-wide default for every tenant | `SetSettingValueDto.scopeType` only accepts `"TENANT"`/`"COMPANY"` (`@IsIn`) — `PLATFORM` is a real, domain-modeled scope (`SetSettingValueUseCase`/`SettingValue` both support it) but **no HTTP endpoint accepts it**, because no system-administration plane exists yet (`docs/ARCHITECTURE.md` §10). This is a deliberate gap, not an oversight — see "Known limitations" below. |
| Setting a value at a scope the definition doesn't declare (e.g. a key meant to be TENANT-only set at COMPANY) | `SetSettingValueUseCase` checks `definition.allowsScope(scopeType)` before writing and rejects with `400 SETTING_SCOPE_NOT_ALLOWED` otherwise. |
| A value that doesn't match its declared data type (e.g. a string where a number is expected) reaches storage | `SettingDefinition.assertValidValue` runs before every write; a mismatch is `400 INVALID_SETTING_VALUE`. Because `value` is stored as `jsonb`, this is the only type enforcement that exists — Postgres itself accepts any valid JSON in that column, so the application-layer check is load-bearing, not a redundant belt-and-suspenders check. |
| A `companyId` from a different tenant is used to set a COMPANY-scoped value | Same DB-enforced pattern as RBAC's `role_assignments`: the composite FK `setting_values(tenant_id, company_id) → companies(tenant_id, id)` rejects it at the database level; `PrismaSettingValueRepository` catches the `P2003` and rethrows as `CompanyNotFoundInTenantError` (`404 COMPANY_NOT_FOUND`). Verified against real Postgres in `apps/api/test/integration/prisma-repositories.integration-spec.ts`. |
| Cross-tenant leakage of a TENANT/COMPANY-scoped value | `GetEffectiveSettingUseCase` only ever queries `setting_values` with the caller's own `tenantId`/`companyId` (from `TenantExecutionContext`, never trusted from the request body) — a value set for tenant A is structurally unreachable when resolving for tenant B, exercised in the integration suite with two real tenants. |
| Reading/writing settings or the catalog without authorization | `SettingsController` requires `SessionAuthGuard` + `TenantContextGuard` + `PermissionGuard`, gated by the new `configuration.settings.read`/`configuration.settings.manage` permissions (same deny-by-default `PermissionGuard` as RBAC — no new authorization mechanism was introduced). |
| One user reading or overwriting another user's preferences | `PreferencesController` derives `userId` exclusively from `CurrentAuth()` (the authenticated session), never from a request parameter — there is no way to address another user's preference through this API at all, by construction, not by a permission check that could be misconfigured. |

### Known limitations (accepted for this slice, not silently ignored)

- **No PLATFORM-scope write endpoint.** The domain and application layers
  fully support it (`SetSettingValueUseCase` accepts `scopeType: "PLATFORM"`,
  the schema has no obstacle to it), but exposing it today — before a
  separate system-administration plane with its own authorization exists —
  would mean *any* tenant's admin could change the default for every tenant
  on the platform through the same tenant-scoped API. This is a genuine gap
  to close when `docs/ARCHITECTURE.md` §10's "system administration usa un
  plano y credenciales separados" is actually built, not before.
- **No new permissions retroactively granted to existing tenants' Owner
  roles.** `configuration.settings.read`/`configuration.settings.manage`
  were added to `FOUNDATION_PERMISSIONS` in this change; per the
  already-documented RBAC limitation above ("No retroactive permission
  backfill"), any tenant provisioned *before* this change keeps whatever
  permission set its Owner role was seeded with and will not automatically
  gain these two. Not a concern in Foundation/dev with no real tenants yet,
  but a real migration/backfill concern before this platform has customers.
- ~~No audit log entries yet for setting changes~~ — closed 2026-08-27:
  `SettingsController.set()` now records a `configuration.setting.changed`
  entry (with the previously-effective value and its source scope as
  `previousValues`) after every successful write. See "Audit" below.
- **No `CHECK` constraint enforcing `value` against `data_type` at the
  database level** — see the corresponding row in the threats table above;
  this is an accepted application-layer-only control, consistent with how
  `allowed_scopes` is also validated only in code (`docs/DATABASE.md`).

## Audit (2026-08-27)

Scope: `AuditEntry`, `RecordAuditEntryUseCase`, `ListAuditEntriesUseCase`,
`AuditEntriesController` (`apps/api/src/core/audit`) — implements
MASTER_SPEC §10 for the actions already flagged as gaps elsewhere in this
file: authentication, user status changes, tenant provisioning, RBAC
changes, configuration changes.

### Design decision: where entries are recorded, and why

Every existing use case this change instruments (`LoginUseCase`,
`LogoutUseCase`, `RevokeAllSessionsUseCase`, `ProvisionTenantUseCase`,
`CreateRoleUseCase`/`AssignRoleUseCase`, `SetSettingValueUseCase`) already
had callers and existing unit test suites. Recording entries at the
**controller layer**, right after each use case's own write already
succeeded — rather than injecting `RecordAuditEntryUseCase` into those use
cases and threading actor/correlation-id/ip/user-agent through their public
input contracts — kept every one of those contracts and their existing
tests unchanged, at the cost of the audit write not sharing a database
transaction with the state change it describes. The one exception is
`SetUserStatusUseCase`, which has no HTTP caller yet (see below) — there,
`RecordAuditEntryUseCase` is injected directly since there is no controller
to do it from, and the use case had no other caller/test to disturb.

### Assets

- The audit trail itself (`audit_entries`) — the record of who did what,
  when, and from where, for every tenant-scoped action this change covers.
- `previousValues`/`newValues` snapshots, which can contain business data
  (e.g. a tenant's currency setting) — not secrets, but not meant to be
  public either; access is gated the same as everything else.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A user reads another tenant's audit trail | `AuditEntriesController` derives `tenantId` exclusively from `TenantExecutionContext` (never from a query parameter), and `ListAuditEntriesUseCase`/`PrismaAuditEntryRepository.findByTenant` filter by that value at the database level. Verified against two real tenants in `apps/api/test/integration`. |
| Reading the audit trail without authorization | Gated by the new `audit.entries.read` permission through the same deny-by-default `PermissionGuard` as every other protected route — no new authorization mechanism introduced. |
| An audit-write failure breaks the user-facing action it was recording | `RecordAuditEntryUseCase.execute()` catches any repository error internally, logs it server-side, and never rejects — verified with both a mocked repository failure and (in the integration suite) a **real** Postgres foreign-key violation, confirming the guarantee holds against actual database errors, not just simulated ones. |
| A failed-login audit entry leaks whether an email is registered | The failure-path entry never resolves or stores a `userId` for an unknown email — only the attempted email itself, in `newValues`, which does not by itself change the login endpoint's external behavior (still returns the same `401 INVALID_CREDENTIALS` either way, per the existing anti-enumeration design in the Authentication section above). |
| Tampering with existing audit rows | No application code path exposes update or delete for `AuditEntry` at any layer — domain, application, or repository interface (`docs/ARCHITECTURE.md` §8.3). This is an application-level control, not a database-level one (no `REVOKE UPDATE/DELETE` or trigger) — see "Known limitations". |

### Known limitations (accepted for this slice, not silently ignored)

- **Audit write is not atomic with the action it records.** Recorded
  immediately after the primary write succeeds, in the same
  request/use-case flow, but as a separate statement — not inside a shared
  database transaction with it (see "Design decision" above). If the
  process crashes in the narrow window between the two, the primary action
  persists without a corresponding audit entry. Building a real
  cross-repository transaction for this would require restructuring how
  repositories receive their Prisma client across every touched module — a
  disproportionate change for what Foundation actually needs right now, and
  the same class of trade-off already accepted for Owner-role seeding not
  being transactional with provisioning (see above).
- **No database-level append-only enforcement** (no `REVOKE UPDATE, DELETE`
  on the table, no trigger) — immutability is enforced only by never
  exposing an update/delete code path, not by the database refusing one. A
  future hardening step for when this matters operationally, not a gap
  introduced by oversight.
- **`SetUserStatusUseCase` has no HTTP caller yet**, so `user.status_changed`
  entries can only be produced by whatever future admin endpoint calls it
  (which must pass an `actorUserId`) or by a script/seed that omits one
  (recorded with `userId: null`). The use case itself and its audit call are
  real and tested; there is simply nothing wired to reach it yet.
- **Login/logout/user-status entries are not reachable through any read
  endpoint.** They are recorded with `tenantId: null` (Authentication and
  User status are not tenant-scoped — `docs/MULTITENANCY.md` §4.8), and
  `AuditEntriesController` only ever returns tenant-scoped entries. A "my
  activity" view for a user's own auth history, or a platform-admin view
  across all untenanted entries, would need a new, deliberately separate
  endpoint — not built here to avoid scope creep beyond the five action
  categories this change set out to cover.
- **No pagination beyond a `limit` query parameter** (default 50, capped at
  200) — matches `docs/ARCHITECTURE.md` §9's pagination guidance in spirit
  (never load unbounded rows) without building full cursor-based pagination
  for a table with, at Foundation scale, very little data yet. Revisit once
  real usage shows entries accumulating fast enough for `limit` alone to be
  insufficient.

## Event Bus (2026-08-27, topology updated 2026-08-28)

Scope: `OutboxMessage`, `appendOutboxMessage`, `DomainEventBus`,
`DispatchOutboxBatchUseCase`, `OutboxDispatcherScheduler` (`packages/events`,
`@erp/events`) — implements `docs/EVENTS.md`'s V1 design (transactional
outbox + in-process domain event bus). No HTTP surface: this is pure
backend infrastructure other modules use as producers, not something a
client calls directly. **As of 2026-08-28** the producer and dispatcher
sides run in separate processes: `apps/api` calls `appendOutboxMessage`
(still inside its own producer's transaction, unchanged) but no longer
hosts `DomainEventBus` or the scheduler at all; `apps/worker` imports
`@erp/events`'s `OutboxDispatcherModule` and is the only process that
claims/publishes/marks outbox rows. See ADR-004's amendment
(`docs/DECISIONS.md`) for the full rationale.

### Assets

- The outbox itself (`outbox_messages`) — a durable, ordered record of every
  integration event a producer has committed, including its full payload
  until it is eventually purged (no retention policy exists yet — see
  "Known limitations").
- The atomicity guarantee between a producer's state write and its outbox
  insert — if that guarantee were silently broken, a tenant could exist
  without ever having emitted `tenancy.tenant.provisioned.v1`, and nothing
  downstream would know the tenant exists.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A producer's state change commits but its event is silently lost (or vice versa: an event fires for a change that then rolls back) | `appendOutboxMessage` only ever accepts the caller's own transaction client (`PrismaClientLike`, structurally typed to whatever `$transaction` hands the callback) — its own doc comment and every real call site (`PrismaTenantProvisioningRepository.create()`) insert the outbox row inside the *same* `$transaction` as the state write. Verified against real Postgres: a full provisioning flow produces exactly one PENDING row with the correct payload, in the same commit (`apps/api/test/integration`). |
| Two dispatcher instances (or two ticks of the same scheduler racing) process the same message twice, causing a duplicate side effect | `PrismaOutboxMessageRepository.claimBatch` uses `SELECT ... FOR UPDATE SKIP LOCKED` inside its own transaction to atomically select-and-mark-PROCESSING — a row locked by one claimant is invisible to a concurrent one until released. Verified against real Postgres with two literally-concurrent `claimBatch` calls (`Promise.all`) claiming from a shared pool of rows: every row was claimed by exactly one caller, zero overlap. |
| A dispatcher crashes after claiming a batch (PROCESSING) but before publishing or marking the outcome — the message is stuck forever | A `PROCESSING` row whose `locked_at` is older than the configured lease becomes claimable again by the next `claimBatch` call — no separate cleanup job, no operator intervention. Verified against real Postgres: a row force-set to `PROCESSING` with a stale lock is unclaimable while the lease is still "valid" and claimable once it is treated as expired. |
| A handler throws and the message is lost | `DispatchOutboxBatchUseCase` catches any error from `DomainEventBus.publish()` per-message and calls `OutboxMessage.markFailed`, which returns the row to `PENDING` with exponential backoff (capped at 300s) until `maxAttempts` (5) is exceeded, at which point it becomes `FAILED` (dead-letter, `docs/EVENTS.md` §11) rather than retrying forever. One message failing does not stop the rest of the batch from being processed. |
| A tenant's event data leaks to a consumer with no business relationship to that tenant | Every producer call site passes the real `tenantId` (or explicitly `null` for a genuinely untenanted fact); nothing in `DomainEventBus`/`DispatchOutboxBatchUseCase` filters by tenant because, in V1, the only subscriber is in-process code within the same trusted backend — there is no cross-tenant boundary to cross yet. This must be revisited before any external-facing consumer (webhook, external integration) exists. |
| Sensitive data (passwords, tokens, full entities) ends up in a payload that later gets logged or exposed | `appendOutboxMessage` does not enforce a payload schema — this is an application-layer discipline each producer must follow (`docs/EVENTS.md` §6: "no contiene passwords, tokens, secretos, PAN, CVV ni PII innecesaria"), not something the infrastructure can verify structurally. The one producer built so far (`tenancy.tenant.provisioned.v1`) only includes IDs, the slug/name and codes — no credentials. |

### Known limitations (accepted for this slice, not silently ignored)

- **Single producer today.** `tenancy.tenant.provisioned.v1` is the only
  integration event actually emitted — deliberately not inventing more
  producers speculatively (MASTER_SPEC §59/§93) before a real business
  module needs to announce a fact to another module. The full mechanism
  (outbox, claim/lock/retry/dead-letter, in-process bus) is built and
  tested end-to-end regardless, so the next producer is a small, well-worn
  addition, not new infrastructure.
- **No cross-process *consumer*, and therefore still no `inbox_messages`
  table**, even though the dispatcher itself is now a separate process from
  the API. `DomainEventBus`'s delivery to a registered handler is still
  purely in-process *within `apps/worker`* — the dispatcher claims a row and
  calls registered handlers synchronously, in that one process, before
  marking the outcome. There is still no BullMQ/re-delivery path that could
  hand the same message to two different consumer processes, so there is
  still no present need for per-consumer idempotency tracking. This must be
  added before any handler with a non-idempotent side effect is registered
  — see `docs/DATABASE.md` "Event Bus / transactional outbox table".
- **`apps/worker`'s `/health` endpoint is liveness-only**, not a readiness
  check against Postgres — it confirms the Nest process is up, not that the
  dispatcher is successfully reaching the database. A DB outage surfaces in
  the dispatcher's own tick logs (`Outbox dispatch tick failed`), not in
  `/health`'s response. Acceptable for Foundation; revisit if this process
  is ever put behind an orchestrator that acts on health check failures.
- **No retention/purge policy** for `PUBLISHED`/`FAILED` rows — the table
  grows unbounded. `docs/EVENTS.md` §8.2 calls for retention/purge as an
  "operative job, audited, not ad-hoc deletion" — not built yet, since
  Foundation-scale data volume does not need it today.
- **No observability beyond application logs.** `docs/EVENTS.md` §15 asks
  for outbox pending count/age, throughput, DLQ growth, etc. as metrics —
  none are exported yet; only structured `Logger` calls exist
  (`OutboxDispatcherScheduler`/`DispatchOutboxBatchUseCase`), consistent
  with the rest of this codebase's current observability level.
- **`causation_id` is modeled but never populated.** No producer today is
  itself reacting to a consumed event, and no `DomainEventBus` handler is
  registered in production yet at all (confirmed live: dispatching a real
  `tenancy.tenant.provisioned.v1` message logs "No handlers registered" and
  still correctly marks the row `PUBLISHED` — see `docs/WORK_QUEUE.md`), so
  there is nothing to set `causation_id` to yet.

## Files (2026-08-27)

Scope: `FileObject`, `UploadFileUseCase`, `GetFileDownloadUrlUseCase`,
`ListFilesUseCase`, `DeleteFileUseCase`, `S3FileStorageAdapter`,
`S3BucketBootstrapper` (`apps/api/src/core/files`) — implements
MASTER_SPEC §22 ("Storage compatible con S3... Nunca depender del
almacenamiento local del servidor"). `FilesController` exposes
`POST/GET /api/v1/files`, `GET /api/v1/files/:id/download-url`,
`DELETE /api/v1/files/:id`.

### Assets

- The uploaded bytes themselves, held in the configured S3-compatible
  bucket (MinIO locally, S3 in production) — never on the API process's
  local disk (`FileInterceptor` uses Multer's in-memory storage, not
  `diskStorage`).
- `file_objects` metadata — ownership (`tenant_id`, `company_id`,
  `owner_user_id`) and the `storage_key` needed to fetch/sign/delete the
  real object.
- Signed download URLs — a time-boxed capability to read one specific
  object without further authentication; anyone holding the URL can use it
  until it expires, so issuing one is itself a security-relevant action.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A caller downloads a file belonging to a different tenant by guessing/enumerating a `fileId` | `GetFileDownloadUrlUseCase` looks the file up by id and only proceeds if `file.tenantId === ctx.tenantId` — a match failure and a genuinely missing id both return the identical `FileNotFoundError` (404), so a caller cannot distinguish "doesn't exist" from "exists but isn't yours" (MULTITENANCY.md's IDOR-resistance pattern, same shape as `GetFileDownloadUrlUseCase`'s tenant check). Verified against real Postgres and MinIO in this session's manual smoke test: a second real tenant requesting the first tenant's real `fileId` received `404 FILE_NOT_FOUND`, not the file. |
| A permanent/public link to a file leaks and grants indefinite access | Every download link is a signed URL from `S3FileStorageAdapter.getSignedDownloadUrl`, valid for `FILES_DOWNLOAD_URL_TTL_SECONDS` (default 300s) — never a bare/public object URL. `FileObject`'s `storage_key` is only ever resolved to a URL after the tenant/ownership check above, so a leaked *metadata* id alone (without an active session in the right tenant) grants nothing. |
| Uploading an oversized file exhausts API process memory | Two independent limits: Multer's `limits.fileSize` (a coarse, fixed 100 MiB framework-level guard, rejected by Nest as a plain HTTP 413 before the body is fully buffered) and the real, configurable business limit `FILES_MAX_SIZE_BYTES` enforced inside `UploadFileUseCase` and reported as `400 FILE_TOO_LARGE` through the standard error envelope. The upload buffer is in-memory only — never written to local disk regardless of size. |
| A storage-key collision lets one tenant's upload silently overwrite another tenant's object | `storage_key` is `tenants/{tenantId}/files/{id}` where `id` is a fresh UUIDv7 generated per upload — never derived from the original filename — and `file_objects.storage_key` carries a database-level `UNIQUE` constraint, so a collision is structurally impossible, not merely astronomically unlikely. |
| The original filename is used to build a path and enables path traversal (`../../etc/passwd`) | `original_filename` is stored purely as display metadata and never concatenated into `storage_key` or any filesystem path — the storage key is always `tenants/{tenantId}/files/{id}`, independent of anything the client supplied. |
| A request with no `file` field (or a malformed multipart body) crashes the handler and leaks an internal error | **Found in this session's own manual smoke test**: the initial implementation read `file.originalname` without checking `file` was defined, producing an uncaught `TypeError` that the global exception filter turned into a bare `500 INTERNAL_ERROR` — not a security leak (no stack trace reached the client) but a correctness gap inconsistent with MASTER_SPEC §61. Fixed by an explicit `if (!file)` check in `FilesController.upload` that throws a proper `400 FILE_REQUIRED` through the standard envelope. Re-verified against the real running server after the fix. |
| A tenant admin deletes a file, and the caller assumes the bytes are gone immediately for compliance/legal purposes | `DELETE /files/:id` is a soft-delete only (`FileObject.markDeleted` — MASTER_SPEC §33): the row moves to `DELETED` and disappears from listings/downloads, but `S3FileStorageAdapter.deleteObject` is never called by `DeleteFileUseCase`. See "Known limitations" below — this is a deliberate scope cut, not an oversight, but it means "deleted" today means "no longer reachable through the API," not "erased from storage." |

### Known limitations (accepted for this slice, not silently ignored)

- **Deleting a file's metadata does not delete the storage object.**
  `DeleteFileUseCase` only calls `FileObject.markDeleted` — the real bytes
  remain in the bucket under their `storage_key` indefinitely. This was a
  deliberate choice (MASTER_SPEC §33: don't destroy critical data
  immediately) rather than an oversight, but it means there is currently no
  path to actually reclaim storage or fully purge a file for a legal/GDPR
  deletion request. A real purge job (soft-deleted past a retention window
  → `deleteObject` → hard-delete the row) is future work, not built yet.
- **No per-file access control beyond tenant scope.** Any membership with
  `files.read` in the tenant can download *any* file in that tenant,
  including ones uploaded by a different user or scoped to a different
  company than the caller's current context — there is no "only the
  uploader" or strict company-scoped read enforced at the use-case level
  (`ListFilesUseCase`/`GetFileDownloadUrlUseCase` filter by tenant, and
  optionally by company when the caller asks, but do not require it).
  Acceptable for Foundation; revisit if a module needs stricter per-file
  visibility.
- **No content-type or file-type allowlist.** Any `contentType` the
  uploading client reports is trusted and stored as-is — there is no
  virus/malware scanning and no MIME-sniffing validation that the bytes
  actually match the declared type. Fine for internal/trusted-tenant
  documents at this stage; revisit before accepting uploads from a
  lower-trust surface (e.g. a public storefront).
- **The bucket is auto-created on boot but never verified for public
  access settings.** `S3BucketBootstrapper` calls plain `CreateBucketCommand`
  with no bucket policy — correct for MinIO's default (private) behavior
  locally, but a production S3 deployment should confirm "Block Public
  Access" is on for this bucket as part of its own infrastructure setup,
  not something this code enforces or can enforce from the application
  side.
- **No dedicated "file too large" or "wrong type" audit trail entry** —
  only successful uploads and deletes are audited (`file.uploaded`,
  `file.deleted`); a rejected upload attempt is not recorded. Consistent
  with how other modules only audit successful state changes today, not
  rejected attempts.

## Notifications (2026-08-28)

Scope: `Notification`, `NotificationDelivery`, `RequestNotificationUseCase`,
`ListNotificationsUseCase`, `MarkNotificationReadUseCase`
(`apps/api/src/core/notifications`) — implements MASTER_SPEC §48. Read
endpoints (`GET /api/v1/notifications`, `PUT /api/v1/notifications/:id/read`)
live in `NotificationsController`, physically inside `tenants/presentation/`
for the same module-cycle reason as `RolesController`/`AuditEntriesController`.

### Assets

- Notification content (`title`/`body`/`data`) — potentially informative
  about what happened in a tenant (e.g. that it was just provisioned), so
  read access must stay scoped to the actual recipient, not merely the
  tenant.
- `RequestNotificationUseCase` itself as a capability — anything that can
  call it can notify an arbitrary user with arbitrary content. Deliberately
  **not exposed over HTTP** (see the first threat row below).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| Any authenticated user spams or phishes another user via a public "create notification" endpoint | There is no `POST /api/v1/notifications`. `RequestNotificationUseCase` is only reachable as a direct application call from another module's own code (today: `TenantsController.provision()`) — never as a public request handler, so no caller-supplied recipient/content ever reaches it without that module's own logic deciding what to send and to whom. |
| A user reads another user's notifications by tenant membership alone | `ListNotificationsUseCase`/`MarkNotificationReadUseCase` always filter by `recipientUserId = ctx.actor.userId` in addition to `tenantId` — there is no way to pass an arbitrary recipient from the HTTP layer (`NotificationsController` never accepts one), so a caller can only ever see their own notifications, not a co-worker's. Verified against real Postgres in this session's manual smoke test: a second real tenant's user only ever saw their own provisioning notification. |
| A user marks another user's (or another tenant's) notification as read, or discovers whether it exists, via `PUT /:id/read` | `MarkNotificationReadUseCase` loads the notification first and requires both `tenantId` and `recipientUserId` to match before touching anything — a mismatch on either and a genuinely missing id both surface as the identical `404 NOTIFICATION_NOT_FOUND` (same IDOR-resistant shape as `GetFileDownloadUrlUseCase`). Verified against real Postgres: a second real tenant received `404` attempting to mark the first tenant's real notification read. |
| A handler with a non-idempotent side effect (creating a `Notification` row) is registered on `DomainEventBus`, and a retried outbox dispatch creates duplicate notifications | Not built this way on purpose: `TenantsController.provision()` calls `RequestNotificationUseCase` as a direct, synchronous application call, not as a `DomainEventBus` subscriber to `tenancy.tenant.provisioned.v1` — ADR-004 point 5 requires an inbox/idempotency table (not built yet, see `docs/WORK_QUEUE.md`) before any Event Bus handler with this kind of side effect is registered. Revisit once that inbox exists. |
| Sensitive data (passwords, tokens, full entities) ends up in `data` and later gets logged or exposed | `RequestNotificationUseCase` does not enforce a payload schema for `data` — this is an application-layer discipline each caller must follow, not something the infrastructure verifies structurally. The one producer built so far (tenant provisioning) only includes the tenant's id and slug — no credentials. |

### Known limitations (accepted for this slice, not silently ignored)

- **Only `IN_APP` has a real adapter.** `EMAIL`/`SMS`/`WHATSAPP`/`PUSH` are
  reserved `NotificationChannel` values (MASTER_SPEC §48 lists all five) with
  no delivery mechanism built — requesting one produces a `FAILED` delivery
  row with an explanatory `failure_reason`, not a thrown error, so a caller
  requesting multiple channels still gets the ones that work. Building a
  real Email adapter needs an SMTP/provider integration that does not exist
  in this codebase yet.
- **Single producer today.** `tenancy.tenant_provisioned` is the only
  notification type actually requested — deliberately not inventing more
  producers speculatively (MASTER_SPEC §59/§93) before a real business
  module needs to notify a user of something. The mechanism (request,
  per-channel delivery, list, mark-read) is built and tested end-to-end
  regardless.
- **Not wired to the Event Bus.** Despite `tenancy.tenant.provisioned.v1`
  already existing as a real integration event, the tenant-provisioned
  notification is requested via a direct call from `TenantsController`, not
  a `DomainEventBus` subscriber — see the Event Bus row above and
  `docs/WORK_QUEUE.md`'s inbox/idempotency backlog item for why.
- **No delivery retry.** A `FAILED` delivery (today: any non-`IN_APP`
  channel) stays `FAILED` permanently — there is no retry/backoff like the
  outbox's, since V1 dispatch is synchronous and there is nothing async to
  retry yet. Revisit once a real async channel (e.g. Email via a worker)
  exists.
- **No notification preferences or opt-out.** Every requested channel is
  attempted for every notification; there is no per-user setting to
  suppress a channel or a type. `UserPreference` (Configuration module)
  exists as generic per-user key/value storage that a future iteration
  could use for this, but nothing reads it for notification delivery today.
- **No pagination beyond a hard 200-row limit** on `GET /api/v1/notifications`
  — same `DEFAULT_LIMIT`/`MAX_LIMIT` pattern as `ListAuditEntriesUseCase`,
  acceptable at Foundation data volume, revisit if a recipient's history
  grows large enough to need cursor-based paging.
