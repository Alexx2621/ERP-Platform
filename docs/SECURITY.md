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
