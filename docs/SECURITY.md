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

## Tenant Context HTTP integration (2026-08-26, company discovery added 2026-08-31)

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

### Real bug found and fixed: no way to discover a tenant's companies (2026-08-31)

`ResolveTenantContextUseCase` (and `GET /api/v1/tenants/current`) never
invents a `companyId` on its own — by design (see the threat row above),
it only ever *echoes back* a `companyId` the caller already supplied via
`X-Company-Id`. This is correct for cross-tenant isolation, but exposed a
real, user-reported gap: **no endpoint anywhere in the platform could list
a tenant's companies**, so a `companyId` could only ever be learned once,
client-side, from the direct response of `POST /api/v1/tenants`
(provisioning). `TenantListPage.openTenant()` — the only other place a
user opens an existing tenant, e.g. from "Tus espacios" after navigating
away — called `getTenantContext` with no `companyId` at all and simply
discarded whatever company the tenant had. Every company-scoped module
(Sales, Inventory, Catalog's company-dependent views, Comercial) then
permanently showed "Selecciona una empresa..." for that session, even for
a tenant with exactly one real, already-provisioned company — reported by
the user against a real "Web Space" tenant.

Fixed with a new, minimal company-discovery endpoint:
`GET /api/v1/tenants/companies` (`TenantsController.companies()`), gated
by the same `TenantContextGuard` already used by `current()` — it only
requires `X-Tenant-Slug` (`X-Company-Id` is optional on this guard), so it
can be called *before* a `companyId` is known, which is exactly the
chicken-and-egg problem it solves. `ListCompaniesUseCase` calls the new
`CompanyRepository.listByTenant(tenantId)` and returns only companies with
`status: ACTIVE` — same tenant-scoping guarantee as every other
tenant-owned query in this codebase (`docs/ARCHITECTURE.md` §8.3), just
newly exposed for listing rather than single lookup. The response
(`CompanyResponseDto[]`: `id`, `code`, `name`) intentionally exposes no
more than a picker UI needs.

`TenantListPage.openTenant()` now calls `listCompanies` first: zero or one
company resolves immediately without any extra step (the overwhelmingly
common case, kept to the original single click); two or more companies
open a picker modal so the user chooses explicitly, instead of the
frontend guessing or the backend inventing an implicit "first company"
that could silently point a user at the wrong company's data. Verified
against real infrastructure with a new Playwright E2E scenario
(`apps/e2e/tests/onboarding.spec.ts`, "reopening an existing tenant from
the tenant list resolves its company automatically"): register → onboard
with a company → leave the workspace via "Cambiar espacio" → reopen the
same tenant from "Tus espacios" → confirm the workspace no longer shows
"Sin selección específica" and that a company-scoped module (Ventas)
shows real content instead of the "selecciona una empresa" guard.

## Access Control / RBAC (2026-08-27, Owner role permission sync added 2026-08-31)

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
- ~~No membership-invitation endpoint yet~~ — closed 2026-08-28:
  `POST /api/v1/tenants/memberships` (+ list/accept/pending) now exists. See
  "Membership Invitations" below.
- ~~No retroactive permission backfill~~ — closed 2026-08-31, see "Real bug
  found and fixed: stale Owner roles never gained newer permissions" below.
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

### Real bug found and fixed: stale Owner roles never gained newer permissions (2026-08-31)

Reported by the user against a real tenant ("Web Space", provisioned
2026-08-27): every module screen — Apps, Catálogo → Productos, and by the
same mechanism every other module gated by a permission added after that
date — showed "No tienes permiso para realizar esta acción." for the
tenant's own Owner. The "Asignar Owner" modal also silently degraded to
its manual-ID-entry fallback ("No fue posible cargar el listado de
miembros"), because `GET /api/v1/tenants/memberships` (gated by
`tenants.memberships.read`, a permission added session 15) was itself
failing with `403`.

Root cause, confirmed directly against Postgres before writing any fix:
`SeedOwnerRoleUseCase` grants a tenant's Owner role every permission that
exists *at provisioning time* only — its own docstring already said so.
"Web Space" was provisioned 2026-08-27 (session 5, when the permission
catalog held only 3 keys); by session 28 the catalog held 46, spanning
every module shipped since (Configuration, Audit, Files, Notifications,
Platform Admin, Membership Invitations, App Registry, Catalog, Customers/
Suppliers, Taxes/Warehouses/Pricing, Inventory, Sales, Payments). A direct
query confirmed the Owner role had exactly 3 of 46 granted. This was the
"No retroactive permission backfill" gap already documented above,
reached for the first time by a real tenant actively used across many
sessions — previously accepted because "sin impacto real hoy: no hay
tenants de producción" (`docs/WORK_QUEUE.md` session 7), an assumption
that stopped holding once the user began working inside a real,
long-lived tenant rather than only ever creating fresh ones per session.

Fixed with a real, permanent mechanism rather than a one-off manual grant
for this one tenant: `SyncOwnerRolePermissionsUseCase`
(`apps/api/src/core/access-control/application/use-cases/`) — the one
deliberate cross-tenant query in this module
(`RoleRepository.findSystemRolesByName`, same justification as
`UserRepository.findAll`, ADR-007), filtered to `isSystem: true` so a
tenant's own custom role that happens to share the "Owner" name is never
touched. Runs on every API boot via `OwnerRolePermissionSyncSeeder`,
registered alongside `PermissionCatalogSeeder` in `AccessControlModule`;
explicitly awaits `PermissionCatalogSeeder.seed()` first rather than
relying on NestJS's same-module `onModuleInit` ordering between two
providers (the RolesController module-cycle lesson from session 5 made
this codebase distrust implicit framework ordering here). Idempotent —
a role already holding every current key is left unsaved, verified by a
dedicated test asserting `save()` is never called in that case, so a
tenant admin's own role edits are never silently overwritten by unrelated
permission grants beyond the union of what already existed plus what is
missing.

**Verified against real Postgres, not just fakes**: on the real API
reboot that shipped this fix, the boot log reported "Owner role
permission sync: 14 of 17 tenant Owner role(s) updated" against the real
development database — confirming this was not an isolated "Web Space"
problem but affected the large majority of tenants ever provisioned
across this project's many sessions. A direct query immediately after
confirmed "Web Space"'s Owner role at exactly 46 of 46 granted
permissions. A new integration test
(`apps/api/test/integration/prisma-repositories.integration-spec.ts`,
"syncs a real, already-provisioned tenant's stale Owner role against a
grown permission catalog") reproduces the exact scenario against real
Postgres: seed an Owner role when only 2 permissions exist, add 2 more to
the catalog, confirm the stale role still lacks them, run the sync,
confirm it now has all 4 while its original grant is preserved, and
confirm a tenant's custom non-system role sharing the "Owner" name is
never touched.

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
| A tenant admin overwrites the platform-wide default for every tenant | `SettingsController`'s own `SetSettingValueDto.scopeType` still only accepts `"TENANT"`/`"COMPANY"` (`@IsIn`) — a tenant-scoped caller can never reach `PLATFORM` through that endpoint. The only path to `PLATFORM` writes is `PUT /api/v1/platform/settings/:key`, gated by `SessionAuthGuard` + `PlatformAdminGuard` (docs/DECISIONS.md ADR-007) — see "Platform Administration" below. |
| Setting a value at a scope the definition doesn't declare (e.g. a key meant to be TENANT-only set at COMPANY) | `SetSettingValueUseCase` checks `definition.allowsScope(scopeType)` before writing and rejects with `400 SETTING_SCOPE_NOT_ALLOWED` otherwise. |
| A value that doesn't match its declared data type (e.g. a string where a number is expected) reaches storage | `SettingDefinition.assertValidValue` runs before every write; a mismatch is `400 INVALID_SETTING_VALUE`. Because `value` is stored as `jsonb`, this is the only type enforcement that exists — Postgres itself accepts any valid JSON in that column, so the application-layer check is load-bearing, not a redundant belt-and-suspenders check. |
| A `companyId` from a different tenant is used to set a COMPANY-scoped value | Same DB-enforced pattern as RBAC's `role_assignments`: the composite FK `setting_values(tenant_id, company_id) → companies(tenant_id, id)` rejects it at the database level; `PrismaSettingValueRepository` catches the `P2003` and rethrows as `CompanyNotFoundInTenantError` (`404 COMPANY_NOT_FOUND`). Verified against real Postgres in `apps/api/test/integration/prisma-repositories.integration-spec.ts`. |
| Cross-tenant leakage of a TENANT/COMPANY-scoped value | `GetEffectiveSettingUseCase` only ever queries `setting_values` with the caller's own `tenantId`/`companyId` (from `TenantExecutionContext`, never trusted from the request body) — a value set for tenant A is structurally unreachable when resolving for tenant B, exercised in the integration suite with two real tenants. |
| Reading/writing settings or the catalog without authorization | `SettingsController` requires `SessionAuthGuard` + `TenantContextGuard` + `PermissionGuard`, gated by the new `configuration.settings.read`/`configuration.settings.manage` permissions (same deny-by-default `PermissionGuard` as RBAC — no new authorization mechanism was introduced). |
| One user reading or overwriting another user's preferences | `PreferencesController` derives `userId` exclusively from `CurrentAuth()` (the authenticated session), never from a request parameter — there is no way to address another user's preference through this API at all, by construction, not by a permission check that could be misconfigured. |

### Known limitations (accepted for this slice, not silently ignored)

- ~~No PLATFORM-scope write endpoint~~ — closed 2026-08-29:
  `PUT /api/v1/platform/settings/:key` now exists, gated by
  `PlatformAdminGuard` (ADR-007). See "Platform Administration" below.
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
- ~~`SetUserStatusUseCase` has no HTTP caller yet~~ — closed 2026-08-28:
  `PUT /api/v1/platform/users/:id/status` (docs/DECISIONS.md ADR-007) is now
  its first real caller.
- ~~Login/logout/user-status entries are not reachable through any read
  endpoint...~~ — closed 2026-08-29: `GET /api/v1/platform/audit-entries`
  (behind `PlatformAdminGuard`) now exists as exactly the deliberately
  separate, platform-scoped view this limitation called for. See "Platform
  Administration" below.
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
- ~~No cross-process *consumer*, and therefore still no `inbox_messages`
  table...~~ — the mechanism itself is built (2026-08-29, ADR-008,
  `inbox_messages` + `consumeIdempotently`). See "Inbox / Consumer
  Idempotency" below. Still no real business handler registered yet — no
  producer/consumer pair actually needs this table in production today,
  only the tests exercise it.
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

## Files (2026-08-27, real storage purge added 2026-08-29)

Scope: `FileObject`, `UploadFileUseCase`, `GetFileDownloadUrlUseCase`,
`ListFilesUseCase`, `DeleteFileUseCase`, `PurgeDeletedFilesUseCase`,
`FilePurgeScheduler`, `S3FileStorageAdapter`, `S3BucketBootstrapper`
(`apps/api/src/core/files`) — implements MASTER_SPEC §22 ("Storage
compatible con S3... Nunca depender del almacenamiento local del
servidor"). `FilesController` exposes `POST/GET /api/v1/files`,
`GET /api/v1/files/:id/download-url`, `DELETE /api/v1/files/:id`.

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
| A tenant admin deletes a file, and the caller assumes the bytes are gone immediately for compliance/legal purposes | `DELETE /files/:id` is a soft-delete only (`FileObject.markDeleted` — MASTER_SPEC §33): the row moves to `DELETED` and disappears from listings/downloads immediately. The real bytes are deleted later, once `FilePurgeScheduler` reaches the row (see the closed limitation below) — "deleted" means "no longer reachable through the API" right away, and "erased from storage" after the retention window, not instantly. |
| ~~A `DELETED` file's storage object is never actually removed, so storage grows unbounded~~ | **Closed 2026-08-29.** `FilePurgeScheduler` polls every `FILES_PURGE_INTERVAL_MS` (default 1h) and `PurgeDeletedFilesUseCase` finds `DELETED` rows past `FILES_PURGE_RETENTION_DAYS` (default 30), calls the real `S3FileStoragePort.deleteObject` for each, and only then transitions the row to a new terminal `PURGED` status (`purged_at` set) — the metadata row itself is never hard-deleted, so it stays resolvable by anything (e.g. an audit entry) that references its id. A single file's storage failure is logged and skipped, not fatal to the batch — the row stays `DELETED` and is retried on the next tick, same "isolate one failure from the rest" reasoning as `DomainEventBus.publish`. Verified against real Postgres (integration test, real repos + fake storage) and against a real MinIO object in this session's manual smoke test: a real uploaded-then-deleted file, backdated past retention via a direct DB write (the same sanctioned mechanism as every other manual smoke test in this project), was actually removed from the real bucket by the real running scheduler. |

### Known limitations (accepted for this slice, not silently ignored)

- **The purge scheduler runs in-process inside `apps/api`, not `apps/worker`.**
  Same starting shape the outbox dispatcher itself once had before its own
  extraction (ADR-004's amendment) — a deliberate, precedented choice to
  avoid paying the cost of a shared-package extraction before there is a
  real need for `FilePurgeScheduler` to scale independently. Revisit only if
  purge volume ever needs it.
- **Retention is a single global setting (`FILES_PURGE_RETENTION_DAYS`),
  not configurable per tenant or per file.** Fine for Foundation; a future
  compliance requirement (e.g. a tenant needing a shorter/longer legal hold)
  would need a per-tenant or per-file override this slice does not have.
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

## Notifications (2026-08-28, extracted to `@erp/notifications` 2026-08-29)

Scope: `Notification`, `NotificationDelivery`, `RequestNotificationUseCase`,
`ListNotificationsUseCase`, `MarkNotificationReadUseCase` — moved from
`apps/api/src/core/notifications` into the shared `@erp/notifications`
package (same extraction pattern as `@erp/events`, ADR-004's amendment) so
`apps/worker` can request a notification from its own event handlers, not
just `apps/api`. Implements MASTER_SPEC §48. HTTP presentation
(`NotificationResponseDto`, the error mapper) stays in `apps/api` — only
domain/application/infrastructure moved. Read endpoints
(`GET /api/v1/notifications`, `PUT /api/v1/notifications/:id/read`) still
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
| Any authenticated user spams or phishes another user via a public "create notification" endpoint | There is no `POST /api/v1/notifications`. `RequestNotificationUseCase` is only reachable as a direct application call from trusted code — either another module's own controller (`MembershipsController.invite()`, invitation notifications) or `apps/worker`'s `TenantProvisionedNotificationHandler` (`tenancy.tenant.provisioned.v1` consumer) — never as a public request handler, so no caller-supplied recipient/content ever reaches it without that caller's own logic deciding what to send and to whom. |
| A user reads another user's notifications by tenant membership alone | `ListNotificationsUseCase`/`MarkNotificationReadUseCase` always filter by `recipientUserId = ctx.actor.userId` in addition to `tenantId` — there is no way to pass an arbitrary recipient from the HTTP layer (`NotificationsController` never accepts one), so a caller can only ever see their own notifications, not a co-worker's. Verified against real Postgres in this session's manual smoke test: a second real tenant's user only ever saw their own provisioning notification. |
| A user marks another user's (or another tenant's) notification as read, or discovers whether it exists, via `PUT /:id/read` | `MarkNotificationReadUseCase` loads the notification first and requires both `tenantId` and `recipientUserId` to match before touching anything — a mismatch on either and a genuinely missing id both surface as the identical `404 NOTIFICATION_NOT_FOUND` (same IDOR-resistant shape as `GetFileDownloadUrlUseCase`). Verified against real Postgres: a second real tenant received `404` attempting to mark the first tenant's real notification read. |
| ~~A handler with a non-idempotent side effect (creating a `Notification` row) is registered on `DomainEventBus`, and a retried outbox dispatch creates duplicate notifications~~ | **Closed 2026-08-29.** `apps/worker`'s `TenantProvisionedNotificationHandler` subscribes to `tenancy.tenant.provisioned.v1` and wraps the `RequestNotificationUseCase` call in `consumeIdempotently` (ADR-008's inbox, `consumerName: "notifications.tenant-provisioned"`) — a redelivered outbox row is a no-op the second time, verified against real Postgres (new integration test) and a real manual smoke test (provision a real tenant, confirm exactly one `Notification` row created by the worker process, not `apps/api`). |
| Sensitive data (passwords, tokens, full entities) ends up in `data` and later gets logged or exposed | `RequestNotificationUseCase` does not enforce a payload schema for `data` — this is an application-layer discipline each caller must follow, not something the infrastructure verifies structurally. The producers built so far (tenant provisioning, membership invitation) only include ids/slugs — no credentials. |
| SMTP credentials (`EMAIL_SMTP_USER`/`EMAIL_SMTP_PASSWORD`) leak via logs or error messages | `SmtpEmailDispatcher` never logs its own config; a send failure's `Error.message` (surfaced as `NotificationDelivery.failureReason`) comes from `nodemailer`/the SMTP server, not from this code echoing the credentials back — same "don't log secrets" discipline as `docs/ARCHITECTURE.md` §11. Credentials live only in `EnvironmentVariables`/process env, never in the database. |

### Known limitations (accepted for this slice, not silently ignored)

- ~~**Only `IN_APP` has a real adapter.**~~ **Partially closed 2026-08-29:**
  `EMAIL` now has a real `SmtpEmailDispatcher` (works with any
  SMTP-compatible provider — Gmail, SendGrid, Mailgun, Postmark, AWS SES's
  SMTP interface, a local Mailhog/Mailpit for dev — this app never picks a
  vendor SDK, same reasoning as Files/S3). It is provided globally via
  `apps/api`'s `EmailModule`, but only actually dispatches when both
  `EMAIL_SMTP_HOST` is configured **and** the caller supplied
  `recipientEmail` — `RequestNotificationUseCase` deliberately has no
  dependency on Users/a lookup port to resolve an email address itself, so
  the caller (already holding the `User` it just looked up, e.g.
  `MembershipsController.invite()`) must pass it explicitly. Neither
  condition being met still produces a `FAILED` delivery with an
  explanatory reason, not a thrown error — verified for real in this
  session's manual smoke test (`EMAIL_SMTP_HOST` unset in this environment:
  a real invite produced a real `FAILED` delivery, `failureReason: "No
  email adapter configured."`). `apps/worker`'s
  `TenantProvisionedNotificationHandler` does not supply `EMAIL` at all yet
  (it would need its own way to resolve the tenant owner's email —
  deliberately out of scope for this block, same "don't extract a User
  lookup path across the process boundary before something needs it"
  reasoning `docs/DECISIONS.md` ADR-008 used for its own deferred item).
  `SMS`/`WHATSAPP`/`PUSH` remain reserved with no adapter at all.
- **Two producers today.** `tenancy.tenant_provisioned` (event-driven, from
  `apps/worker`) and the membership-invitation notification (still a direct
  call from `MembershipsController.invite()` — a real-time, user-triggered
  action with no corresponding outbox event, so a direct call remains the
  right shape for it, not a gap). Deliberately not inventing more producers
  speculatively (MASTER_SPEC §59/§93) before a real business module needs
  to notify a user of something.
- ~~**Not wired to the Event Bus.**~~ **Closed 2026-08-29** for the
  tenant-provisioned notification: `TenantsController.provision()` no
  longer knows Notifications exists at all — the owner notification is now
  a pure side effect of `tenancy.tenant.provisioned.v1` being published and
  consumed by `apps/worker`. See the closed threat row above for the
  idempotency mechanism.
- **No delivery retry.** A `FAILED` delivery — including a real transient
  SMTP failure, e.g. the mail server being briefly unreachable — stays
  `FAILED` permanently — there is no retry/backoff like the outbox's, since
  dispatch is synchronous with the request that triggered it and there is
  no queue to retry from. Revisit once Email dispatch itself moves to an
  async job.
- **No notification preferences or opt-out.** Every requested channel is
  attempted for every notification; there is no per-user setting to
  suppress a channel or a type. `UserPreference` (Configuration module)
  exists as generic per-user key/value storage that a future iteration
  could use for this, but nothing reads it for notification delivery today.
- **No pagination beyond a hard 200-row limit** on `GET /api/v1/notifications`
  — same `DEFAULT_LIMIT`/`MAX_LIMIT` pattern as `ListAuditEntriesUseCase`,
  acceptable at Foundation data volume, revisit if a recipient's history
  grows large enough to need cursor-based paging.

## Membership Invitations (2026-08-28, expiry + revocation added 2026-08-29)

Scope: `InviteMembershipUseCase`, `AcceptMembershipInvitationUseCase`,
`RevokeMembershipInvitationUseCase`, `ListMembershipsUseCase`,
`ListPendingInvitationsUseCase`, `MembershipsController`
(`apps/api/src/core/tenants`) — closes the RBAC gap flagged above: adding a
second real user to a tenant, and that user accepting on their own, using
the `Membership` state machine (`INVITED` → `ACTIVE`) that already existed
in the domain model (`docs/MULTITENANCY.md`). `Membership.isExpiredInvitation`/
`Membership.reinvite` and `MEMBERSHIP_INVITATION_TTL_SECONDS` (default 7
days) close the expiry/revocation gap this section originally documented.

### Assets

- The ability to add a membership to a tenant — gated by the new
  `tenants.memberships.manage` permission, same `PermissionGuard` pattern as
  every other write in this module.
- The accept-invitation action itself — must be usable by exactly the
  invited user and no one else, even though (unlike every other tenant-scoped
  endpoint in this codebase) it cannot be gated by `TenantContextGuard`,
  because the caller has no ACTIVE membership yet.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| Inviting an email to auto-create a pending account (bypassing real signup/credentials) | `InviteMembershipUseCase` requires an existing, active `User` — `InvitedUserNotFoundError` (`404`) for an unknown email, `InvitedUserDisabledError` (`409`) for a disabled one. There is no deferred/passwordless account creation (MASTER_SPEC §90 "no simular integraciones"). |
| A different real user accepts someone else's invitation by guessing/reusing a `membershipId` (IDOR) | `AcceptMembershipInvitationUseCase` checks `membership.userId === callerId` in addition to existence; a mismatch and a genuinely unknown id both surface as the identical `404 MEMBERSHIP_NOT_FOUND` via `MembershipNotFoundForUserError` — same shape as `GetFileDownloadUrlUseCase`/`MarkNotificationReadUseCase`. Verified in both the integration suite (real Postgres, a real second user rejected) and a dedicated Playwright E2E test using two isolated browser contexts. |
| Accept-invitation endpoint requiring `TenantContextGuard` would lock the invitee out (they have no ACTIVE membership yet to resolve one) | `POST /tenants/memberships/:id/accept` is deliberately the one write endpoint in this module guarded only by `SessionAuthGuard`, not `TenantContextGuard`/`PermissionGuard` — it re-resolves the target tenant by slug internally (`AcceptMembershipInvitationUseCase`, duplicating the small amount of lookup logic `ResolveTenantContextUseCase` also does, since that use case's own contract requires an already-ACTIVE membership and cannot be reused here). |
| Duplicate invitation to a user who is already a member (any status) | `InviteMembershipUseCase` checks `findByUserId` first and rejects with `409 MEMBERSHIP_ALREADY_EXISTS` — a tenant cannot end up with two membership rows for the same user. |
| `GET /tenants/memberships` (member list) or `GET /tenants/memberships/pending` (my invitations) leaking cross-tenant data | The member list is tenant-scoped through the same `TenantContextGuard` + `tenants.memberships.read` permission pattern as every other tenant-scoped GET. The pending-invitations list is intentionally cross-tenant (same reasoning as `GET /tenants`/`ListMyTenantsUseCase`: the caller has no tenant context yet) but is filtered to `findPendingByUserId(callerId)` — never accepts a caller-supplied user id, so it can only ever show the authenticated caller's own pending invitations. |
| The in-app notification sent at invite time leaks tenant internals to the invitee before they accept | The notification body is generic ("Fuiste invitado a un espacio de trabajo") and its `data` payload carries only `tenantId`/`membershipId` — no organization/company details, financial data, or other members' identities. |
| A stale, long-forgotten invitation is accepted years later by someone who no longer should have access | **Closed 2026-08-29.** `AcceptMembershipInvitationUseCase` checks `membership.isExpiredInvitation(now, ttlSeconds)` before activating and rejects with `410 INVITATION_EXPIRED`; `ListPendingInvitationsUseCase` also filters expired ones out of the invitee's own "pending" list, so a stale invitation cannot be accepted through either the direct endpoint or a link surfaced from that list. Verified against real Postgres (integration test with a genuinely backdated `updatedAt`). |
| A tenant admin revokes a membership that is not actually a pending invitation (e.g. an ACTIVE member), using this endpoint as an undocumented "remove member" backdoor | `RevokeMembershipInvitationUseCase` explicitly checks `status === "INVITED"` before calling the domain's own (deliberately more permissive) `Membership.revoke()`, rejecting anything else with `409 MEMBERSHIP_NOT_INVITED` — "revoke a pending invitation" and "remove an active member" stay two different, differently-sensitive operations, and only the former is exposed today. |
| `DELETE /tenants/memberships/:id` lets a tenant admin discover whether a membership id exists in a different tenant | Revoke is tenant-scoped the same way every other write in this module is: `RevokeMembershipInvitationUseCase.execute` looks the membership up via `findById(tenantId, membershipId)`, so an id belonging to a different tenant is indistinguishable from a genuinely unknown one — both surface as `404 MEMBERSHIP_NOT_FOUND` via `MembershipInvitationNotFoundError`. |

### Known limitations (accepted for this slice, not silently ignored)

- **No retroactive permission backfill (same limitation as RBAC's).** The two
  new permissions (`tenants.memberships.read`, `tenants.memberships.manage`)
  are seeded into the global catalog and granted automatically to the Owner
  role of any tenant provisioned *after* this change, but a tenant
  provisioned before it does not retroactively gain them on its existing
  Owner role. No production tenants exist yet, so this has no real impact
  today.
- ~~**No invitation expiry or revocation.**~~ **Closed 2026-08-29:**
  `RevokeMembershipInvitationUseCase` (`DELETE /tenants/memberships/:id`,
  same `tenants.memberships.manage` permission as inviting) cancels a
  pending invitation, and `MEMBERSHIP_INVITATION_TTL_SECONDS` (default 7
  days, configurable) makes a forgotten invitation stop being acceptable on
  its own without requiring anyone to remember to revoke it.
- ~~**No re-invitation of a `REVOKED` membership.**~~ **Closed 2026-08-29:**
  `InviteMembershipUseCase` now checks whether an existing membership is
  `REVOKED` or a stale (past-TTL) `INVITED` row and, if so, calls
  `Membership.reinvite()` on that same row (resetting its expiry clock)
  instead of blocking with `MembershipAlreadyExistsError` — a person can be
  invited again after being revoked, or after simply letting an old
  invitation lapse, without any direct database change. An `ACTIVE` or
  `SUSPENDED` existing membership is still correctly blocked — this only
  reopens a genuinely non-participating row. Still no explicit "remove an
  active member" flow — revisit alongside that, which does not exist yet.
- **`ListMembershipsUseCase`/`ListPendingInvitationsUseCase` resolve their
  joined `User`/`Tenant` one at a time (N+1), not via a batch lookup** — same
  accepted tradeoff as `ListMembershipsUseCase`'s own docstring: Foundation-scale
  tenants have at most a handful of members, so this is not the premature
  optimization MASTER_SPEC §45/§93 warns against yet.

## Platform Administration (2026-08-28, extended 2026-08-29)

Scope: `isPlatformAdmin` on `User`, `PlatformAdminGuard`, `ListUsersUseCase`,
`PlatformUsersController`, `ListPlatformSettingsUseCase`,
`PlatformSettingsController`, `ListPlatformAuditEntriesUseCase`,
`PlatformAuditEntriesController` (`apps/api/src/core/platform-admin`) — the
"system administration usa un plano ... separado" requirement from
`docs/ARCHITECTURE.md` §10, unblocking three previously-deferred backlog
items. Full design rationale in `docs/DECISIONS.md` ADR-007.

### Assets

- The `isPlatformAdmin` flag itself — the actual privilege boundary for
  every route under `/api/v1/platform/*`. There is no other check.
- Every user's account status platform-wide, and the ability to change it —
  a platform admin can disable *any* user's account, in any tenant,
  regardless of role/permission assignments there.
- The global user list (`GET /api/v1/platform/users`) — emails and display
  names across every tenant, information a tenant-scoped role could never
  see even with every permission granted.
- The PLATFORM-scoped value of every setting in the catalog
  (`PUT /api/v1/platform/settings/:key`) — this is the default every tenant
  without its own TENANT/COMPANY override silently inherits
  (`GetEffectiveSettingUseCase`'s fallback chain), so a bad or malicious
  write here has blast radius across the entire platform, not one tenant.
- Every login/logout/user-status-change audit entry across the whole
  platform (`GET /api/v1/platform/audit-entries`) — a genuine security log
  (who logged in/out, whose account was disabled and by whom) that no
  tenant-scoped role can ever see, since these entries have no tenant to
  begin with.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A regular authenticated user reaches `/api/v1/platform/*` | `PlatformAdminGuard` runs after `SessionAuthGuard` and checks `authContext.user.isPlatformAdmin` on every request to this controller; a `false`/missing flag is `403 PLATFORM_ADMIN_REQUIRED`. Verified directly (`platform-admin.guard.spec.ts`: rejects a non-admin, allows an admin) and via `app.module.spec.ts`/`platform-admin.module.spec.ts` confirming the guard is actually wired into the real module graph, not just unit-tested in isolation. |
| A user self-promotes to platform admin via registration or any other public endpoint | `CreateUserUseCase` hardcodes `isPlatformAdmin: false` for every new account (`POST /auth/register` is the only way to create a `User`); there is no HTTP endpoint anywhere that sets this flag to `true` — it can only be changed by a direct database operation performed by whoever operates the deployment (ADR-007 point 2). |
| `PlatformAdminGuard` applied without `SessionAuthGuard` running first | Fails closed with a `500` (`PLATFORM_ADMIN_GUARD_REQUIRES_AUTH`) rather than silently treating a missing `authContext` as "not admin, deny" or, worse, crashing in a way that could be misread — same "loud misconfiguration, not silent bypass" pattern as `PermissionGuard`. |
| A platform admin action on a user bypasses audit trail | `PUT /api/v1/platform/users/:id/status` calls the existing `SetUserStatusUseCase`, which already recorded `user.status_changed` (with `previousValues`/`newValues`) before this controller had any caller — this slice is the first real HTTP path to it, not new audit logic. |
| Platform-admin capabilities creep beyond what was reviewed | Minimal by design: list/disable users, and now PLATFORM setting reads/writes (2026-08-29) — each new capability under this guard gets its own threat-model review before being added, not folded in silently. No tenant suspension, no impersonation, no data export yet (ADR-007 point 5). |
| A `PLATFORM` write reaches a scope the setting's definition doesn't declare (e.g. a hypothetical TENANT-only key) | `PlatformSettingsController` calls the exact same `SetSettingValueUseCase.execute({ scopeType: "PLATFORM", ... })` as any other caller — `definition.allowsScope("PLATFORM")` is checked identically, rejecting with `400 SETTING_SCOPE_NOT_ALLOWED` if the catalog doesn't allow it. No separate/weaker validation path for platform-admin callers. |
| A `PLATFORM` write with a value of the wrong data type reaches storage | Same `SettingDefinition.assertValidValue` check as `SettingsController`'s own TENANT/COMPANY writes — verified in this session's smoke test (a numeric value against a STRING-typed key was rejected with `400 INVALID_SETTING_VALUE`). |
| `GET /api/v1/platform/audit-entries` leaks a tenant's own business data to a platform admin who shouldn't need it | Scoped structurally to `tenantId: null` only — `AuditEntryRepository.findPlatformScoped` filters `WHERE tenant_id IS NULL` at the query level, so a tenant's `tenant.provisioned`/`configuration.setting.changed`/etc. entries (all tenant-scoped) can never appear here, verified against real Postgres in the integration suite and in this session's smoke test (a real tenant's provisioning entry was confirmed absent from the platform view). |

### Known limitations (accepted for this slice, not silently ignored)

- **No separate credential system, by design.** A platform admin logs in
  through the exact same `POST /api/v1/auth/login` as any other user — a
  compromised password/session for that account is a compromised
  platform-admin session too. Accepted for Foundation (no production
  tenants, no destructive platform capability exists yet); revisit
  (mandatory MFA for `isPlatformAdmin=true` accounts, or a genuinely
  separate credential store) before tenant deletion, impersonation, or data
  export are ever built behind this guard. See ADR-007's "Alternatives
  considered".
- **Granting the first platform admin is an undocumented-by-the-API manual
  step** — a direct `UPDATE users SET is_platform_admin = true` against the
  database, not a seed script or CLI command shipped with this slice. No
  real deployment runbook exists yet to record this against; intentionally
  not building tooling for an operational need that hasn't materialized
  (MASTER_SPEC §59/§93).
- **No self-protection against a platform admin disabling their own
  account.** `PUT /api/v1/platform/users/:id/status` does not check
  `id !== auth.user.id` — an admin can lock themselves out via `DISABLED`.
  Recoverable only via the same manual database step used to grant the
  flag in the first place. Not a security gap (the actor is already
  privileged) but worth UX-hardening later.
- **`GET /api/v1/platform/users` has no search/filter, only a `limit`
  (default 50, max 200)** — same `DEFAULT_LIMIT`/`MAX_LIMIT` pattern as
  `ListAuditEntriesUseCase`/`ListNotificationsUseCase`, acceptable at
  Foundation's current user count, revisit once cursor-based paging or a
  search endpoint is actually needed.
- **PLATFORM setting changes use a distinct audit action
  (`configuration.platform_setting.changed`) from tenant-scoped changes
  (`configuration.setting.changed`)**, deliberately, so `GET
  /api/v1/platform/audit-entries` can tell them apart without inspecting
  `tenantId` — but they are recorded with `tenantId: null` like every other
  platform-scoped action, so they appear in that view, not a dedicated
  "settings history" endpoint.
- **No confirmation/dry-run before a PLATFORM write.** Unlike a TENANT/
  COMPANY write, which only affects the caller's own tenant, a PLATFORM
  write silently changes the fallback every tenant on the platform inherits
  the instant it commits — there is no staged rollout, canary, or
  confirmation step. Acceptable at Foundation scale (no production
  tenants); revisit before this endpoint is used against a populated
  platform.
- **`GET /api/v1/platform/audit-entries` has no search/filter beyond
  `limit`** (default 50, max 200) and mixes every action type (auth
  success/failure, status changes, PLATFORM setting writes) in one
  chronological list with no `action`/date-range filter — same accepted
  tradeoff as `ListAuditEntriesUseCase`, revisit once real volume needs
  cursor-based paging or filtering.

## Inbox / Consumer Idempotency (2026-08-29)

Scope: `InboxMessage`, `InboxMessageRepository`, `consumeIdempotently`
(`packages/events`) — implements `docs/EVENTS.md` §9, the mechanism
ADR-004 point 5 required before any `DomainEventBus` handler with a
non-idempotent side effect could be registered. Full design rationale in
`docs/DECISIONS.md` ADR-008. No real business handler uses it yet — see
ADR-008's "Deferred" section.

### Assets

- The claim itself (`(consumer_name, message_id)` in `inbox_messages`) —
  the only thing standing between an at-least-once outbox redelivery and a
  duplicated side effect (a second welcome email, a second charge, etc.,
  once real consumers exist).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| The same event delivered twice (outbox retry, or a manual redelivery) causes a consumer's effect to run twice | `consumeIdempotently` claims `(consumerName, messageId)` via `tryClaim` before running the effect at all; a second delivery within the lease window returns `"duplicate"` without invoking the effect. Verified against real Postgres (integration suite) that a real outbox-driven publish followed by a manually replayed publish of the exact same event produces exactly one consumer-side effect. |
| Two consumer instances (e.g. two `apps/worker` replicas) race to claim the same message | `PrismaInboxMessageRepository.tryClaim` locks an existing row with `SELECT ... FOR UPDATE` inside a transaction, and relies on the `(consumer_name, message_id)` unique constraint to arbitrate a brand-new row between concurrent first-time claimants — verified against real Postgres with genuinely concurrent claimants (`Promise.all`), confirming exactly one caller ever wins for a shared message id. |
| A handler that fails is silently dropped forever (message never retried) | Failure never marks the row `PROCESSED` — it stays `PROCESSING` with `attempt_count`/`last_error_code` updated, so once its lease expires it becomes reclaimable again, same recovery path already proven for the outbox's own crashed-dispatcher case. Verified: an immediate retry within the lease window is still a `"duplicate"` (correctly refuses to hammer a failing effect), and a retry after the lease expires is `"processed"`. |
| A consumer's failing effect throws and aborts delivery to *other* handlers subscribed to the same event | `consumeIdempotently` catches the effect's exception itself and returns `"failed"` rather than letting it propagate — `DomainEventBus.publish` runs handlers sequentially and stops at the first throw, so this is what keeps one consumer's bug from silently starving every handler registered after it. |
| A `messageId` claimed by one consumer blocks a different consumer from processing the same event | The claim key is `(consumer_name, message_id)`, not `message_id` alone — verified that two different `consumerName` values processing the same message id are fully independent claims, matching `docs/EVENTS.md` §12 ("el consumer es dueño de su ... inbox"). |

### Known limitations (accepted for this slice, not silently ignored)

- **Claim and effect are not in one shared database transaction**, despite
  `docs/EVENTS.md` §9's literal wording suggesting they should be. See
  ADR-008 point 2 and its "Consequences" for the full reasoning: doing so
  would require every existing use case to accept an externally supplied
  Prisma transaction client instead of DI-injecting its own repositories, a
  much larger change than the inbox mechanism itself. This leaves a narrow
  crash window (claimed but not yet marked processed) where the message is
  stuck until its lease expires — not lost, not duplicated under normal
  operation, but not a formal two-phase-commit guarantee either.
- **No dead-letter/terminal `FAILED` state.** A handler that fails
  indefinitely just keeps getting reclaimed and retried forever once its
  lease expires each time — there is no attempt cap or alerting at the
  inbox level (unlike the outbox's own `maxAttempts` dead-letter). Deferred
  until a real failing consumer in production shows this is needed — see
  ADR-008's "Alternatives considered".
- **No real business handler connected yet.** This entire mechanism is
  currently exercised only by its own unit/integration tests — no
  production code path invokes `consumeIdempotently` today. Connecting
  Notifications to `tenancy.tenant.provisioned.v1` remains a separate,
  not-yet-done backlog item (`docs/WORK_QUEUE.md`) that additionally
  requires extracting Notifications into a package `apps/worker` can
  import.
- **No observability/metrics** on inbox claim rate, duplicate rate, or
  stuck (long-`PROCESSING`) rows — `docs/EVENTS.md` §15 calls these out as
  eventual requirements; not built ahead of a real consumer that would
  produce meaningful values for them.

## App Registry (2026-08-30)

Scope: `AppDefinition`/`TenantApp`/`AppConfiguration`
(`apps/api/src/core/app-registry`) — implements `docs/PLUGINS.md` at the
"mínimo" scope ratified in `docs/DECISIONS.md` ADR-005. Closes the last
item of the original `docs/WORK_QUEUE.md` backlog.

### Assets

- `apps.read`/`apps.manage` permissions — gate visibility of the catalog
  and a tenant's own enablement state, and the ability to enable/disable an
  app or change its configuration, respectively.
- `TenantApp.status` — the source of truth for whether an app's future
  routes/jobs (once any exist) would be allowed to run for a tenant. No
  route or job actually checks this yet (see "Known limitations" below).
- `AppConfiguration.value` — arbitrary JSON scoped to one tenant's one
  enabled app; never validated against a schema (no per-app setting
  catalog exists yet).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A tenant enables an app whose required dependency isn't enabled, leaving the platform in an inconsistent state | `EnableAppUseCase` checks every `dependsOnKeys` entry is itself `ENABLED` for the same tenant before enabling — verified against real Postgres with a real fixture dependency graph, both the rejection and the success-after-dependency-enabled path. |
| A tenant disables an app that another enabled app still depends on, breaking that dependent silently | `DisableAppUseCase` scans the full catalog for any `ENABLED` app whose `dependsOnKeys` includes the one being disabled, and rejects with `AppHasActiveDependentsError` naming the blocking app(s) — verified against real Postgres, including the case where disabling becomes possible again once the dependent is disabled first. |
| Tenant A's enablement, dependency graph, or configuration values leak into or are affected by Tenant B | `TenantApp`/`AppConfiguration` are always queried and written scoped to the caller's resolved `tenantId` from `TenantExecutionContext`, never from request-body input; `@@unique([tenantId, appDefinitionId])` makes a cross-tenant row structurally impossible to conflate. Verified against real Postgres with two real tenants sharing the same catalog. |
| A catalog entry with a duplicate key, a dependency on a nonexistent app, or a dependency cycle gets seeded | `validateAppCatalog` runs before any write in `AppCatalogSeeder.onModuleInit` and throws, failing the whole application boot rather than allowing a partially-invalid catalog into the database — matches `docs/PLUGINS.md` §5's "un catálogo inválido impide el build/deployment; no se descubre el error durante una activación tenant." Verified with fixture catalogs covering duplicate keys, unknown dependencies, direct cycles and indirect cycles. |
| Configuring an app that isn't enabled for the tenant | `SetAppConfigurationUseCase`/`ListAppConfigurationUseCase` both require a `TenantApp` row with `status === "ENABLED"`; a disabled or never-enabled app rejects with `AppNotEnabledError`, never silently persisting orphaned configuration. |
| Enabling/disabling an app without a permission grant, or across a tenant a membership doesn't belong to | Same `PermissionGuard`/`TenantContextGuard` stack as every other tenant-scoped controller — `apps.manage` required for enable/disable/configure, `apps.read` for the read endpoints, deny-by-default. |

### Known limitations (accepted for this slice, not silently ignored)

- **`FOUNDATION_APPS` ships empty in production.** No business module
  beyond the Platform Core exists yet to register — this is the reason
  this backlog item was deferred for 21 sessions before being built
  (`docs/WORK_QUEUE.md`, ADR-005). The mechanism is validated with fixture
  apps in tests and one manual smoke test against the real dev database
  (cleaned up afterward), never with a fabricated production entry.
- **No route/job actually checks `TenantApp.status` yet.** `docs/PLUGINS.md`
  §8's "a central guard verifies app enablement" backend extension model is
  not built — there is no app-specific route or job in the codebase today
  to gate. Enabling/disabling an app currently has no observable effect
  beyond the App Registry's own state and audit trail. Must be built
  alongside the first real business app that needs it.
- **No SemVer range compatibility checking.** `AppDefinition.version` is a
  plain informational string; `dependsOnKeys` matches by key only, not by
  version range. Acceptable with exactly one version per app in the
  catalog today (ADR-005); revisit once any app actually ships a second
  version.
- **No entitlement/plan gating.** Any tenant with `apps.manage` can enable
  any catalog app it can see — `docs/PLUGINS.md` §3.6's "Entitlement"
  concept (a commercial/technical right granted by plan) is not connected
  to enablement at all. Acceptable with no SaaS billing yet (MASTER_SPEC
  §56, still deferred); must be revisited before any paid plan
  differentiation is real.
- **No frontend contribution registries.** `apps/erp-web`'s new "Apps"
  page (`/apps`) only lists/toggles apps — no module can yet register a
  route, menu item, dashboard widget, or settings page conditional on its
  own enablement (`docs/PLUGINS.md` §9). Zero business apps exist to need
  this yet.
- **No backfill of `apps.read`/`apps.manage` for tenants provisioned before
  this change**, same accepted gap already documented for every prior
  permission addition (Typed Configuration, Files, Membership Invitations)
  — `SeedOwnerRoleUseCase` only grants the permission catalog as it exists
  *at provisioning time*.

## Catalog (Master Data — Phase 2, 2026-08-31)

Scope: `UnitOfMeasure`/`Category`/`Brand`/`Product`/`ProductVariant`
(`apps/api/src/modules/catalog`) — the first Phase 2 (Master Data) module
and the first business module in this codebase (`docs/ARCHITECTURE.md`
§5.2), living under `apps/api/src/modules/` as a sibling of `core/`, never
inside it.

### Assets

- `catalog.units-of-measure.read`/`.manage`,
  `catalog.categories.read`/`.manage`, `catalog.brands.read`/`.manage`,
  `catalog.products.read`/`.manage` — 8 new permissions, same read/manage
  split as every prior Foundation module.
- `Product.basePrice`/`.baseCost`, `ProductVariant.price`/`.cost` — the
  first genuinely monetary fields in this codebase (MASTER_SPEC §30/§82).
- `Product.barcode`/`ProductVariant.sku` — used for point-of-sale/inventory
  lookups by future modules; both have real database-level uniqueness
  (scoped to company for barcode, tenant-wide for SKU).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A request without an active company context (`X-Company-Id`) writes or reads Master Data | Unlike Foundation, `companyId` is **required** here, not an optional scope refinement — every controller calls `requireCompanyId(ctx)`, throwing `400 COMPANY_CONTEXT_REQUIRED` if absent, before any use case runs. |
| A product/category/brand/unit from Company A is read, updated, or referenced by a request scoped to Company B in the same tenant | Every Update/SetStatus use case checks `entity.companyId !== input.companyId` in addition to tenant, throwing the same `NotFoundError` a genuinely-missing entity would — the established IDOR-resistant pattern from every prior Foundation module, verified against real Postgres with two real companies under one tenant. |
| Cross-tenant reference: a product references a category/brand/unit belonging to a different tenant | Every FK (`Product.category`/`.brand`/`.unitOfMeasure`, `ProductVariant.product`, `Category.parent`) is a composite `(tenantId, ...Id) → (tenantId, id)` reference — structurally impossible at the database level, not just filtered by application code. |
| A partial `PUT` (updating one field) silently wipes other optional fields the caller didn't intend to touch | **A real bug, found via manual HTTP smoke testing, not caught by unit tests** (which always supplied every field): `UpdateProductUseCase`/`UpdateProductVariantUseCase` originally treated "field omitted from the request body" as "clear to null" for every optional field, including `baseCost`/`cost` — a genuine data-loss risk for values used in margin calculations. Fixed with a three-state contract: **omit** → keep current value; **empty string `""`** → explicitly clear to `null`; **a real value** → replace. DTOs relaxed from bare `@IsNumberString()` to `@ValidateIf((o) => o.field !== "") @IsNumberString()` so the `""` clear-signal passes validation instead of being rejected as malformed input. Regression tests lock in both branches; re-verified against real Postgres and a fresh HTTP smoke test after the fix. |
| A `hasVariants` product is given its own `basePrice`/`baseCost`, or a non-variant sellable product is given none | Both directions are rejected by `Product.create`'s domain invariant (`ProductDoesNotSupportVariantsError`-adjacent validation), re-checked on every `update()` call too, not just at creation — a variant-tracked product's price must live on its variants, and a sellable non-variant product must always be priced. |
| Decimal precision silently drifts between what Postgres stores and what the API returns | **A real bug, found via manual HTTP smoke testing against real Postgres**: `PrismaProductRepository`/`PrismaProductVariantRepository` originally used Decimal.js's `.toString()`, which strips trailing zeros (`"24.9900"` from the `numeric(14,4)` column came back as `"24.99"`). Fixed to `.toFixed(4)`, confirmed via a direct `psql` comparison and new integration-test round-trip assertions. |
| A duplicate product code, barcode, unit-of-measure code, category code, brand code, or variant SKU is registered within the same scope | Real database-level unique constraints (`@@unique([tenantId, companyId, code])` etc., `@@unique([tenantId, sku])`, `@@unique([tenantId, companyId, barcode])`) back every uniqueness check the application layer performs — verified against real Postgres, not just an in-memory fake. |
| A category is reparented to be its own parent, directly | Rejected by `Category.create`/`.reparent()`'s domain invariant. **Known gap**: a longer cycle formed across several `reparent()` calls (A→B, then B→A) is not currently blocked — see "Known limitations". |

### Known limitations (accepted for this slice, not silently ignored)

- **Multi-level category reparent cycles are not blocked.** Only the
  direct "a category can't be its own parent" case is checked. A cycle
  formed across two or more `reparent()` calls would currently succeed and
  produce an unwalkable tree. Low real-world likelihood (requires a
  deliberate sequence of admin actions) but a genuine gap; revisit if
  Category ever grows a "move subtree" UI action that could trigger it
  more easily.
- **No Price Lists / multi-tier pricing.** `Product.basePrice` is a single
  price per product — `docs/ARCHITECTURE.md` §5.2's "Pricing" sub-domain
  (customer-tier, quantity-break, currency-specific price lists) is
  entirely out of scope for this slice. `basePrice`/`ProductVariant.price`
  are a placeholder single-currency price, not a pricing engine.
- **No Kit/Bundle product types.** `ProductType` covers
  `PHYSICAL_GOOD`/`SERVICE`/`DIGITAL_PRODUCT`/`RAW_MATERIAL` only —
  MASTER_SPEC §19's `Kit`/`Bundle` composite-product types are deferred.
- **No lot/serial/expiration tracking.** MASTER_SPEC §19's
  `trackLots`/`trackSerialNumbers`/`trackExpiration` flags don't exist on
  `Product` yet — inventory-level tracking granularity is Phase 3
  (Inventory) scope, not Catalog.
- **No tax rules engine.** `docs/ARCHITECTURE.md` §5.2's "Taxes" sub-domain
  (a `Tax`/`TaxRate` model products could reference) doesn't exist yet;
  `Product` has no tax association at all in this slice.
- **No import/export.** MASTER_SPEC §83's bulk CSV/Excel product import
  (with per-row validation and Worker-based processing for large files) is
  not built — every Catalog entity is created one row at a time through the
  UI or API today.
- **`ProductVariant.attributes` has no attribute-definition catalog.**
  Any string key/value pair is accepted — there's no equivalent of
  `SettingDefinition` constraining which attribute names or values are
  valid for a given product/category. A future "Attribute Sets" concept
  (MASTER_SPEC §19) would close this.
- **No backfill of the 8 new `catalog.*` permissions for tenants
  provisioned before this change**, same accepted gap already documented
  for every prior permission addition.

## Customers / Suppliers (Master Data — Phase 2, 2026-08-31)

Scope: `Customer`/`Supplier` (`apps/api/src/modules/customers`,
`apps/api/src/modules/suppliers`) — second Phase 2 block, following
Catalog. Two structurally-identical-today but deliberately separate
modules — see `docs/DATABASE.md` "Customers / Suppliers tables" and the
`schema.prisma` docstring on `Customer` for why they are not a shared
"Party" abstraction.

### Assets

- `customers.read`/`.manage`, `suppliers.read`/`.manage` — 4 new
  permissions, same read/manage split as every prior Foundation/Catalog
  module.
- `Customer.taxId`/`Supplier.taxId` — a real-world tax identifier; not
  itself sensitive like a password, but a genuine business record subject
  to the same tenant/company isolation as everything else in this module.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A request without an active company context writes or reads a customer/supplier | `requireCompanyId(ctx)` (duplicated per module, same helper as Catalog) throws `400 COMPANY_CONTEXT_REQUIRED` before any use case runs. |
| A customer/supplier from Company A is read, updated, or its status toggled by a request scoped to Company B in the same tenant | `UpdateCustomerUseCase`/`SetCustomerStatusUseCase` (and their Supplier equivalents) check `entity.tenantId !== input.tenantId \|\| entity.companyId !== input.companyId` and throw the same `NotFoundError` a genuinely-missing entity would — the established IDOR-resistant pattern, verified against real Postgres with two real companies under one tenant. |
| Two customers (or two suppliers) in the same company register the same tax id | Real database-level `@@unique([tenantId, companyId, taxId])` backs the application check — verified against real Postgres, not just an in-memory fake. Multiple records with **no** tax id on file coexist freely (Postgres allows multiple `NULL`s in a unique index) — this is intentional, not a gap: not every counterparty has a tax id on record yet. |
| A partial `PUT` (updating one field) silently wipes other optional fields the caller didn't intend to touch | Learned from the real bug found in Catalog's `UpdateProductUseCase` this same session — applied here from the start, not retrofitted after a repeat incident. Both `UpdateCustomerUseCase`/`UpdateSupplierUseCase` use the three-state contract (omit → keep, `""` → clear, value → replace) for every optional field, with matching unit-test regressions and an E2E scenario that edits a real customer and clears its tax id via `""`. |
| A customer's tax id collides with a supplier's tax id for the same company | Does not happen — `customers` and `suppliers` are genuinely separate tables with independent unique constraints; a real business that is both a customer and a supplier of the counterparty can register the same tax id on both sides without conflict (verified against real Postgres). |

### Known limitations (accepted for this slice, not silently ignored)

- **No shared "Party" identity between a Customer and a Supplier that are
  the same real business.** Creating both requires two separate records
  with no cross-reference; MASTER_SPEC's broader Party concept (if ever
  built) would need its own migration to reconcile these later. Deliberate
  — see the `schema.prisma` docstring on `Customer`.
- **No credit limit, payment terms, price list assignment, or any other
  Sales/Purchasing-specific field.** This slice is Master Data only —
  those belong to Phase 4 (Sales) and Phase 5 (Purchasing) respectively,
  per `docs/ROADMAP.md` §6.
- **`country` is a free 2-character string, not validated against a real
  ISO 3166-1 list.** A typo (`"XX"`) is accepted silently. Acceptable for
  this slice; revisit if a country-dependent feature (tax rules, shipping)
  ever needs to trust this field.
- **A single flat address (`addressLine`/`city`/`country`), not a
  multi-address or structured `Address`/`Location` model.** A
  customer/supplier with billing and shipping addresses, or multiple
  branches, has nowhere to record that distinction yet. Warehousing
  master data (still pending in Phase 2) has its own, unrelated `Location`
  concept for warehouses — not reused here.
- **No import/export.** Same gap already documented for Catalog — every
  customer/supplier is created one at a time through the UI or API today.
- **No backfill of the 4 new `customers.*`/`suppliers.*` permissions for
  tenants provisioned before this change**, same accepted gap already
  documented for every prior permission addition.

## Taxes / Warehouses / Pricing (Master Data — Phase 2, closing block, 2026-08-31)

Scope: `Tax` (`apps/api/src/modules/taxes`), `Warehouse`
(`apps/api/src/modules/warehouses`), `PriceList`/`PriceListItem`
(`apps/api/src/modules/pricing`) — the third and final Phase 2 block. This
section covers all three since they share the same Master Data threat
model already established by Catalog/Customers/Suppliers; only what is
genuinely new (the Pricing↔Catalog cross-module dependency, the
hard-delete item model) gets its own analysis.

### Assets

- `taxes.read`/`.manage`, `warehouses.read`/`.manage`,
  `pricing.price-lists.read`/`.manage` — 6 new permissions, same
  read/manage split as every prior module. `pricing.price-lists.manage`
  covers both `PriceList` CRUD and `PriceListItem` CRUD, matching how
  `catalog.products.manage` already covers both `Product` and
  `ProductVariant`.
- `Tax.rate`, `PriceListItem.price` — the third and fourth genuinely
  monetary/rate-bearing fields in this codebase (after `Product.basePrice`/
  `.baseCost` and `ProductVariant.price`/`.cost`), same canonical-decimal-
  string discipline applied from the start this time (no repeat of the
  Catalog session's `.toString()` bug — verified directly against
  Postgres in this block's own smoke test before ever being at risk of it).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A request without an active company context writes or reads a tax/warehouse/price list | `requireCompanyId(ctx)` (duplicated per module, same helper pattern as every other Master Data module) throws `400 COMPANY_CONTEXT_REQUIRED` before any use case runs. |
| A tax/warehouse/price list from Company A is read, updated, or its status toggled by a request scoped to Company B in the same tenant | Every Update/SetStatus use case checks `entity.companyId !== input.companyId` and throws the same `NotFoundError` a genuinely-missing entity would — verified against real Postgres with two real companies under one tenant (`UpdateWarehouseUseCase` specifically, in the integration suite). |
| A tenant-scoped `PriceList`/`PriceListItem` id is guessed or reused across tenants | `PrismaPriceListRepository.findById` uses the real `@@unique([tenantId, id])` compound key — a mismatched tenant simply finds no row, not an application-level filter that could be forgotten. |
| A price list item is added for a product that doesn't exist, or belongs to a different company | `AddPriceListItemUseCase` calls the real cross-module `GetProductUseCase` and checks `product.companyId !== input.companyId`, throwing `PriceListItemProductNotFoundError` — verified against real Postgres with a real product genuinely scoped to a different company. |
| A price list item is added for a `hasVariants` product, which this slice cannot price correctly (no per-variant list pricing) | `AddPriceListItemUseCase` checks `product.hasVariants` and rejects with `PriceListItemProductHasVariantsError` — verified with a real Catalog product created via the real `CreateProductUseCase`, not a hand-built fixture. |
| Two items for the same product are added to the same price list | Real database-level `@@unique([tenantId, priceListId, productId])` backs the application check — verified against real Postgres, not just an in-memory fake. |
| A price list's `validFrom` is set after its `validUntil` | Domain-level check in `PriceList.create`/`.update`, rejected before any write — `validFrom === validUntil` is explicitly allowed (a single-day promotion is a real use case). |
| Removing a price list item leaves an orphaned or recoverable row | `RemovePriceListItemUseCase` performs a genuine `DELETE` (`PrismaPriceListItemRepository.remove`, `deleteMany` scoped to `(tenantId, id)` as defense in depth even though the use case already verified ownership) — verified against real Postgres that the row count drops to zero, not just that it's excluded from listings. |

### Known limitations (accepted for this slice, not silently ignored)

- **No tax rules engine.** `Tax` is a flat rate lookup — no jurisdiction
  logic, no compound/cascading tax composition (e.g. a state tax computed
  on top of a federal tax), no per-product-category applicability rules,
  no association with `Product`/`Sales` yet at all. MASTER_SPEC §31's "Tax
  Engine desacoplado" remains fully deferred; this is master data a future
  engine could reference, not the engine itself.
- **No per-variant price list pricing.** A `hasVariants` product cannot be
  added to a price list in this slice — see the schema.prisma docstring on
  `PriceListItem` for the concrete reason (a partial unique index Prisma
  cannot express declaratively, with no validated use case to justify the
  complexity yet).
- **No price list resolution/application logic.** Nothing in this codebase
  yet picks a `PriceList` for a given sale based on date, customer, or
  channel — that is Sales-phase (Phase 4) business logic. This slice is
  storage only, the same split already used for Typed Configuration.
- **No Branch/Location association for `Warehouse`.** Neither entity
  exists in this schema yet; see the schema.prisma docstring on
  `Warehouse`.
- **`currency` and `country` are unvalidated free strings**, same accepted
  gap already documented for Customer/Supplier.
- **No backfill of the 6 new permissions for tenants provisioned before
  this change**, same accepted gap already documented for every prior
  permission addition.

## Inventory (Phase 3, 2026-08-31)

Scope: `apps/api/src/modules/inventory` — Movement Ledger,
on-hand/reserved/available balances, reservations/releases, and transfers
with explicit state. The first module in this codebase where correctness
depends on genuine concurrency control, not just tenant/company scoping —
this section's threat model centers on that.

### Assets

- `inventory.balances.read`, `inventory.movements.read`/`.manage`,
  `inventory.reservations.read`/`.manage`, `inventory.transfers.read`/
  `.manage` — 7 new permissions.
- `InventoryMovement.quantity`, `InventoryBalance.onHandQuantity`/
  `.reservedQuantity`, `InventoryTransfer.quantity`,
  `InventoryReservation.quantity` — the first genuinely concurrency-
  sensitive numeric fields in this codebase; a bug here means real
  oversell (promising stock that does not exist), not just a display
  glitch.
- The ledger itself: `inventory_movements` is the only append-only,
  audit-adjacent table in Master Data so far (mirroring `audit_entries`'
  own append-only guarantee) — its integrity is the module's real source
  of truth, more load-bearing than the `inventory_balances` projection
  built from it.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| Two concurrent requests both issue/reserve stock from the same (warehouse, product) balance, each individually valid but together driving on-hand or available negative (oversell) | `PrismaInventoryBalanceRepository.applyMovement` locks the target balance row with `SELECT ... FOR UPDATE` inside a transaction before checking the invariant, so a second concurrent writer blocks until the first commits and sees the updated figures — not a check-then-write race. Verified against **real concurrent Postgres connections**, not reasoned about in isolation: `apps/api/test/integration/inventory.integration-spec.ts` fires 7 concurrent issues of 2 units each against 10 real units of on-hand stock and asserts exactly 5 succeed, exactly 2 are rejected, and on-hand never goes negative — repeated for concurrent reservations. This is `docs/ROADMAP.md` §7's own exit criteria, verified directly rather than assumed from the code reading correct. |
| Two concurrent requests are both the *first* movement ever posted for a (warehouse, product) pair, so neither sees an existing balance row to lock | Both attempt to `INSERT` into `inventory_balances`; the hand-written partial unique index (see docs/DATABASE.md "Inventory tables") lets exactly one succeed, and Postgres blocks the second `INSERT` until the winner commits, then raises a real `P2002` conflict — the loser's entire transaction (including the ledger row it already inserted) rolls back atomically and retries as an `UPDATE` path, bounded to 3 attempts. Same shape as `PrismaInboxMessageRepository.tryClaim` (ADR-008). |
| A movement is recorded against a warehouse or product belonging to a different company | `ResolveWarehouseTargetUseCase`/`ResolveProductTargetUseCase` (shared by every write use case) check `warehouse.companyId !== companyId` / `product.companyId !== companyId` and throw the same `NotFoundError` a genuinely-missing entity would — verified against real Postgres with a real warehouse/product scoped to a different company. |
| A movement is recorded against a product with inventory tracking disabled, or a `hasVariants` product with no variant specified (or a non-variant product with a variant id supplied) | `ResolveProductTargetUseCase` enforces all three cases explicitly (`ProductInventoryNotTrackedError`, `ProductVariantRequiredError`, `ProductVariantNotAllowedError`) before any ledger write is attempted. |
| A variant id that belongs to a *different* product than the one specified is supplied | `ResolveProductTargetUseCase` checks `variant.productId !== product.id`, not just that the variant exists at all — `ProductVariant` carries no `companyId` of its own (it is scoped through its parent `Product`), so this check is what actually prevents cross-product variant confusion. |
| Reserved stock is issued or transferred out from under the reservation holder | The single balance invariant (`onHand >= reserved`, enforced under the same row lock as oversell prevention) rejects any `ISSUE`/`TRANSFER_OUT`/downward `ADJUSTMENT` that would drop on-hand below the currently-reserved quantity — verified with a real reservation followed by a real issue attempt that exceeds only-just-available stock. |
| A reservation is released, or a transfer is completed/cancelled, by a request scoped to a different company | `ReleaseReservationUseCase`/`CompleteTransferUseCase`/`CancelTransferUseCase` all check `entity.companyId !== input.companyId` and throw the same `NotFoundError` a genuinely-missing entity would (IDOR-resistant, same pattern as every prior module). |
| A transfer is completed or cancelled twice, or a reservation is released twice | Both transitions require the entity's current state (`IN_TRANSIT` / `ACTIVE`); a second attempt is rejected with `InventoryTransferNotInTransitError`/`InventoryReservationNotActiveError`, not silently treated as a no-op — a double-release or double-complete would double-count the movement otherwise. |
| A transfer is created between a warehouse and itself | Both the domain entity (`InventoryTransfer.create`) and the use case (`CreateTransferUseCase`, before any warehouse lookup) reject this — `SameWarehouseTransferError`, mapped to `400`. |
| A caller submits a zero, negative, or malformed quantity where a positive value is required | DTOs enforce the shape (`@Matches(/^\d+(\.\d{1,4})?$/)`) before any use case runs, giving a proper `400` — a deliberate improvement over this codebase's earlier convention (Pricing/Catalog) of only checking shape loosely at the DTO layer and letting the domain's stricter check surface as a generic `500`. |
| A financially/operationally significant correction (`ADJUSTMENT`) is posted with no explanation | `InventoryMovement.create` requires a non-empty `reason` for every `ADJUSTMENT` row (domain-level, cannot be bypassed by any use case), and `AdjustInventoryDto.reason` is itself mandatory at the transport layer — belt and suspenders, not redundant: the DTO gives a clean `400`, the domain check is what actually prevents a malformed direct call from slipping through. |
| The ledger itself is edited or deleted after the fact, hiding what really happened | `InventoryMovementRepository` exposes no `save`/`update`/`delete` method at all from the application layer's point of view — the only write path is `InventoryBalanceRepository.applyMovement`, which only ever `INSERT`s a new row, mirroring `audit_entries`' own append-only guarantee. A transfer cancellation is always a **new** `TRANSFER_CANCELLED` row, never a mutation of the original `TRANSFER_OUT`. |

### Known limitations (accepted for this slice, not silently ignored)

- **No warehouse locations/bins, no lot/serial/expiration tracking.**
  `docs/ROADMAP.md` §7 explicitly scopes both as "solo según alcance
  aprobado" and no such approval exists — MASTER_SPEC §20's fuller vision
  (multiple locations, lots, serials, expirations, picking/packing) stays
  fully deferred. This slice tracks stock at (warehouse, product/variant)
  granularity only.
- **No partial reservation release.** Releasing a reservation always frees
  its entire `quantity`; partial fulfillment tracking belongs to whatever
  module actually consumes reservations (Sales, Phase 4), not to
  Inventory itself.
- **A narrow, accepted non-transactional window** between applying a
  reservation/transfer's ledger movement and saving its own
  reservation/transfer row (and the reverse ordering for
  complete/cancel) — see docs/DATABASE.md "Inventory tables" → "Accepted
  non-transactional trade-off" for the full reasoning and why growing
  every repository interface to accept an externally supplied transaction
  client was judged disproportionate to this specific, narrow risk.
- ~~No connection to Sales, Purchasing, or POS yet~~ — **closed 2026-09-01,
  Phase 5** (Sales closed it first, 2026-08-31, Phase 4): Purchasing is now
  a real caller of `RecordReceiptUseCase` (receiving) and `RecordIssueUseCase`
  (returns to a supplier) — `CreatePurchaseReceiptUseCase`/
  `CreatePurchaseReturnUseCase` — the same way Sales became the first real
  business caller before it. Only POS (Phase 6) remains deferred.
- **No backfill of the 7 new permissions for tenants provisioned before
  this change**, same accepted gap already documented for every prior
  permission addition.

## Sales (Phase 4A, 2026-08-31)

Scope: `apps/api/src/modules/sales` — Quotes, Sales Orders and lines,
Returns. The most heavily cross-cutting module yet: directed, cycle-free
dependencies on Catalog, Warehouses, Taxes, Pricing, Customers, and
Inventory (docs/ARCHITECTURE.md §6).

### Assets

- `sales.quotes.read`/`.manage`, `sales.orders.read`/`.manage`,
  `sales.returns.read`/`.manage` — 6 new permissions.
- `QuoteLine`/`SalesOrderLine.unitPrice`/`.discountAmount`/`.taxRate`/
  `.lineTotal` — the first genuinely monetary computation this codebase
  performs on write (Catalog/Pricing/Taxes only ever stored/validated
  already-given decimal strings; Sales is the first module that
  multiplies and applies a percentage to derive one).
- `SalesOrderLine.reservationId` — the pointer that ties a sold line to
  the real inventory it earmarked; losing or corrupting it would leave a
  reservation that can never be released or fulfilled correctly through
  normal channels.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A quote/order line is added, or an order is confirmed/fulfilled/cancelled/returned, for a resource (quote, order, customer, product, warehouse, tax) belonging to a different company | Every use case re-verifies `entity.companyId !== input.companyId` before acting and throws the same `NotFoundError` a genuinely-missing entity would (IDOR-resistant, same pattern every prior module uses) — verified with real cross-company fixtures in both the unit and integration suites. |
| Confirming a multi-line order partially reserves inventory (some lines succeed) before a later line fails for insufficient stock, leaving the order in an inconsistent, partially-committed state | `ConfirmSalesOrderUseCase` implements the compensating-transaction pattern `docs/ROADMAP.md` §8's exit criteria explicitly names ("Confirm/cancel/return tienen invariantes y compensaciones probadas"): every reservation already made in the current attempt is released again before the `InsufficientInventoryForOrderError` is thrown, and the order itself is never marked `CONFIRMED`. Verified against **real concurrent Postgres**, not reasoned about in isolation: `apps/api/test/integration/sales.integration-spec.ts` confirms a real multi-line order where the second line's reservation genuinely fails, then asserts every prior reservation was released, the balance is back to fully available, and the order stays `DRAFT`. |
| A quote is converted into a sales order, and the converted line for a product that does **not** track inventory is nonetheless given a warehouse, causing a later confirm to attempt an invalid reservation | Real bug found and fixed before this module's first commit — see docs/DATABASE.md "Sales tables" for the full account. `ConvertQuoteToSalesOrderUseCase` now resolves each line's product via Catalog's `GetProductUseCase` and only carries the warehouse through when `product.trackInventory` is true. |
| A return is recorded for more than was ever fulfilled for a given order line, either in one request or by accumulating several separate return requests over time | `CreateSalesReturnUseCase` computes the already-returned quantity as a running sum over **every** prior `SalesReturnLine` for that order line (`listBySalesOrderLine`, a ledger read, not a stored counter that could drift — same philosophy as `InventoryBalance`), and rejects with `SalesReturnExceedsFulfilledQuantityError` the moment the cumulative total would exceed the line's fulfilled quantity. Verified with three sequential returns against the same line: two that fit exactly, a third that doesn't. |
| A return is recorded against an order that was never fulfilled, or is recorded with no lines at all | `CreateSalesReturnUseCase` requires `order.status === "FULFILLED"` (`SalesOrderNotFulfilledError`) and `input.lines.length > 0` (`SalesReturnHasNoLinesError`) before doing anything else. |
| A sales order line is added, or a quote/order is confirmed, for a `hasVariants` product with no variant specified (or a non-variant product with a variant id supplied), or a tracked-inventory product with no warehouse (or a non-tracked product with a warehouse supplied) | `ResolveSalesLineTargetUseCase` enforces all four cases explicitly before any line is created — the same validation shape Inventory's own `ResolveProductTargetUseCase`/`ResolveWarehouseTargetUseCase` already established, duplicated (not reused directly) because Sales' line-target resolution genuinely differs (it also resolves an optional tax rate, and Quote lines skip the warehouse requirement entirely via `requireWarehouse: false`) — see the use case's own docstring for the explicit "bounded, accepted cost" reasoning. |
| A line's pricing snapshot silently changes after the fact — e.g. a later Catalog/Pricing update to the underlying product retroactively alters what a customer was already quoted or sold | `QuoteLine`/`SalesOrderLine.unitPrice`/`.discountAmount`/`.taxRate`/`.lineTotal` are computed exactly once at line-creation time and stored — no use case ever re-derives them from live Catalog/Pricing/Taxes data on read. `ConvertQuoteToSalesOrderUseCase` copies a QuoteLine's snapshot verbatim into the new SalesOrderLine via `.fromProps()`, never `.create()`, so conversion itself cannot silently recompute anything either. |
| A caller submits a zero, negative, or malformed quantity/price/discount where a valid decimal is required | DTOs enforce shape (`@Matches`) before any use case runs (`400`, not a generic `500`), and the domain's own `assertValidPositiveDecimal`/`assertValidNonNegativeDecimal` (`apps/api/src/modules/sales/domain/decimal.ts`) is the second, unbypassable layer — same belt-and-suspenders pattern Inventory already established. |

### Known limitations (accepted for this slice, not silently ignored)

- **No human-readable order/quote number** (`ORD-000001`/`QUO-000001`).
  MASTER_SPEC §34 frames these as optional; a safe generator needs the
  same bounded-retry-on-conflict machinery `inventory_balances`' partial
  unique indexes required, and building it half-safe would be worse than
  deferring it.
- **No real tax rules engine.** A line's `taxRate` is a flat percentage
  snapshot from an existing `Tax` record chosen by the caller — no
  jurisdiction logic, no tax composition, no automatic resolution of
  which tax applies. MASTER_SPEC §31's fuller vision stays deferred to
  whichever phase actually needs it.
- **No automatic price-list resolution.** `AddQuoteLineUseCase`/
  `AddSalesOrderLineUseCase` accept an explicit `priceListId` the caller
  chooses; nothing resolves "which price list applies to this customer/
  channel" automatically. Same gap already documented in Pricing's own
  "Known limitations".
- **No partial confirm/fulfill.** Confirming or fulfilling an order acts
  on every line at once; there is no way to confirm/fulfill a subset of
  an order's lines independently.
- **No Invoice, Shipment, or accounting posting** — deliberately out of
  scope per `docs/ROADMAP.md` §8's own closing line ("La facturación
  fiscal y accounting posting no se simulan dentro de Sales; se integran
  en sus fases").
- **No backfill of the 6 new permissions for tenants provisioned before
  this change**, same accepted gap already documented for every prior
  permission addition.

## Payments (Phase 4B, 2026-08-31)

Scope: `apps/api/src/modules/payments` — a `Payment` aggregate
independent of `SalesOrder`, real `CASH`/`BANK_TRANSFER` gateway adapters,
idempotent capture, and refund. The first module in this codebase to
touch real money movement end to end (not just store/validate a decimal
someone else computed).

### Assets

- `payments.read`/`.manage` — 2 new permissions.
- `Payment.amount`, `Payment.idempotencyKey` — a bug here means either a
  real financial discrepancy (wrong amount) or a duplicated real charge
  (broken idempotency), the highest-stakes fields in this codebase so
  far.
- `Payment.status`/`.capturedAt`/`.refundedAt` — the record of whether
  money genuinely moved; must never be forgeable into `CAPTURED` without
  a real gateway result backing it.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A retried capture request (client timeout, double-click, at-least-once delivery from an upstream caller) charges the customer twice | `CapturePaymentUseCase` pre-checks `findByIdempotencyKey` before ever calling the gateway (covers the common sequential-retry case) — but the real frontier is the `@@unique([tenantId, companyId, idempotencyKey])` Postgres constraint, not the pre-check alone. A genuine concurrent race between two first-time requests with the same key is caught by `PrismaPaymentRepository.save()` translating the real unique-constraint violation into `PaymentIdempotencyConflictError`, which the use case reacts to by re-fetching and returning the real winner. Verified against **real concurrent Postgres connections**, not reasoned about in isolation: `apps/api/test/integration/payments.integration-spec.ts` fires 5 genuinely concurrent captures with the same idempotency key and asserts all 5 resolve to the exact same `Payment.id`, with exactly one row ever created in the table — `docs/ROADMAP.md` §8's own exit criteria ("duplicar request/webhook no duplica orden, cargo ni refund"), verified directly. |
| A payment is captured for more (or a different currency) than the sales order it's paying against | `CapturePaymentUseCase` resolves the order via Sales' public `GetSalesOrderUseCase` and rejects a currency mismatch with `PaymentCurrencyMismatchError` before calling any gateway — the amount itself is caller-supplied and not currently cross-checked against the order's own line totals (see Known limitations). |
| A payment is captured or refunded against a sales order, or refunded for a payment, belonging to a different company | `CapturePaymentUseCase`/`RefundPaymentUseCase` check `order.companyId`/`payment.companyId !== input.companyId` and throw the same `NotFoundError` a genuinely-missing entity would (IDOR-resistant). |
| A `BANK_TRANSFER` capture is recorded with no way to reconcile it against a real bank statement later | `BankTransferPaymentGatewayAdapter.capture()` requires a non-empty `reference` (the transfer confirmation number) and returns a real, structured `FAILED` result — not a thrown exception, not a simulated success — when it's missing. A `CASH` capture never needs one, since cash has no external reference to reconcile against at all. |
| A payment is refunded twice, or a `FAILED` payment (which never actually took money) is refunded | `RefundPaymentUseCase` requires `payment.status === "CAPTURED"` before calling the gateway or mutating anything (`PaymentNotCapturedError` otherwise) — a `REFUNDED` or `FAILED` payment cannot be refunded again. |
| The gateway declines a refund attempt | `RefundPaymentUseCase` throws `PaymentRefundFailedError` and leaves the payment's status untouched (`CAPTURED`) — verified with a fake declining gateway that the payment is neither marked `REFUNDED` nor left in some intermediate state. |
| An idempotent capture replay is misrecorded in the audit trail as if it were a brand-new capture, making it look like the customer was charged twice when they were not | Real bug found and fixed by this module's own manual smoke test against real Postgres, before this session's commit — see docs/DATABASE.md "Payments table" for the full account. `CapturePaymentUseCase.execute()` now returns `{ payment, wasReplayed }`, and `PaymentsController.capture()` only writes the `payments.payment.captured` audit entry when `!wasReplayed`. |
| A fabricated payment gateway pretends to call a real, credential-requiring provider (Stripe, PayPal) without real credentials, giving a false impression of production-readiness | Deliberately never built — see `docs/DECISIONS.md`, Payments section. Only `CashPaymentGatewayAdapter`/`BankTransferPaymentGatewayAdapter` exist, both requiring no external credentials and never claiming to call a real network service (MASTER_SPEC §90: "no simular integraciones o operaciones exitosas"). |

### Known limitations (accepted for this slice, not silently ignored)

- **No credential-requiring gateway (Stripe, PayPal, etc.).** `docs/
  ROADMAP.md` §8 (4B) lists "primeros adapters aprobados" — only
  `CASH`/`BANK_TRANSFER` are approved for this slice; adding a real
  processor is a distinct, separately-scoped piece of work requiring real
  credentials and PCI-relevant handling this codebase has never needed
  before.
- **No webhook verification.** Both adapters are synchronous and
  terminal — there is no asynchronous confirmation step to verify a
  webhook signature for. Revisit once a real asynchronous gateway exists.
- **No provider-timeout reconciliation.** Same reasoning: nothing in
  this slice can time out mid-flight the way a real network call to an
  external processor could.
- **No cross-check between a captured amount and the sales order's own
  line totals.** `CapturePaymentUseCase` validates currency but not
  amount — a caller could in principle capture an amount that doesn't
  match what the order's lines actually sum to. Revisit once a real
  invoicing/payment-reconciliation workflow exists to define the correct
  behavior (partial payments are a legitimate real-world case that a
  naive equality check would wrongly reject).
- **No partial refund.** `RefundPaymentUseCase` always refunds a
  payment's entire `amount`; there is no way to refund a portion of it.
- **No backfill of the 2 new permissions for tenants provisioned before
  this change**, same accepted gap already documented for every prior
  permission addition.

## Purchasing (Phase 5, 2026-09-01)

Scope: `apps/api/src/modules/purchasing` — Purchase Orders and lines,
Receipts (partial-first-class), Returns to a supplier, Supplier Invoices.
Four direct, cycle-free dependencies on Catalog, Warehouses, Suppliers, and
Inventory (docs/ARCHITECTURE.md §6) — the fourth business module to close
out `docs/ROADMAP.md`'s phased backlog.

### Assets

- `purchasing.orders.read`/`.manage`/`.approve`,
  `purchasing.receipts.read`/`.manage`, `purchasing.returns.read`/`.manage`,
  `purchasing.invoices.read`/`.manage` — 9 new permissions. `.approve` is
  the load-bearing one: deliberately distinct from `.manage` so drafting a
  purchase order and approving it can require two different roles
  (docs/ROADMAP.md §9's "Permisos de aprobación y segregation of duties
  están probados" exit criterion, verified directly — see below).
- `PurchaseOrderLine.unitCost`/`.lineTotal` — real money, same class of
  risk as Sales' `unitPrice`/`.lineTotal` (session 27) or Payments'
  `amount` (also session 27); a bug here misstates what a company owes a
  supplier.
- `SupplierInvoice.amount`/`.invoiceNumber` — the supplier's own claim of
  what is owed, recorded as evidence; a bug here could misrepresent a real
  financial obligation or let one be recorded against the wrong supplier
  entirely (see `SupplierInvoiceOrderMismatchError` below).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A membership with only `purchasing.orders.manage` (create/add-line/close/cancel) approves (confirms) a purchase order, or a membership with only `purchasing.orders.approve` creates/edits one | `ConfirmPurchaseOrderUseCase` is gated by `purchasing.orders.approve` at the controller level (`PurchaseOrdersController.confirm`), a genuinely different permission key from the `purchasing.orders.manage` gating every other write endpoint on the same controller — `PermissionGuard`'s deny-by-default means a membership must hold each key separately. Verified against **real Postgres role assignments**, not reasoned about in isolation: `apps/api/test/integration/purchasing.integration-spec.ts` creates two real memberships with two real, disjoint `RoleAssignment`s and confirms via `HasPermissionUseCase` that the "Buyer" role can manage but not approve, and the "Approver" role can approve but not manage — the exit criterion verified directly, not just designed for. |
| A purchase order line, receipt, or return is created for a resource (order, supplier, product, warehouse) belonging to a different company | Every use case re-verifies `entity.companyId !== input.companyId` (or the equivalent tenant/company chain through `ResolveSupplierTargetUseCase`/`ResolvePurchaseLineTargetUseCase`) and throws the same `NotFoundError` a genuinely-missing entity would (IDOR-resistant, same pattern every prior module uses). |
| A receipt (or several partial receipts over time) records more than was ever ordered for a given line | `CreatePurchaseReceiptUseCase` computes the already-received quantity as a running sum over **every** prior `PurchaseReceiptLine` for that order line (`listByPurchaseOrderLine`, a ledger read, never a stored counter that could drift — same philosophy as Sales' `CreateSalesReturnUseCase`), and rejects with `PurchaseReceiptExceedsOrderedQuantityError` the moment the cumulative total would exceed what was ordered. Verified against **real Postgres** with two real sequential partial receipts that exactly exhaust the ordered quantity, then a third real attempt for even `0.0001` more, rejected. |
| A return to the supplier (or several returns over time) records more than was ever received minus what was already returned for a given line | `CreatePurchaseReturnUseCase` computes both the received-so-far and already-returned-so-far as running sums over the real ledgers (`PurchaseReceiptLineRepository`/`PurchaseReturnLineRepository`), never stored counters, and rejects with `PurchaseReturnExceedsReceivedQuantityError` once the cumulative returned total would exceed what was ever received. A return against a line with **zero** receipts is rejected the same way (received-so-far is `0`), not treated as a special case. |
| A `PurchaseOrder` with at least one real receipt is cancelled, silently pretending the physical goods that already arrived never did | `CancelPurchaseOrderUseCase` checks `PurchaseReceiptRepository.listByPurchaseOrder(...).length > 0` before ever touching the entity's own `cancel()` invariant, and rejects with `PurchaseOrderHasReceiptsError` — goods that physically arrived can only be corrected via a return, never erased via cancellation. Verified against real Postgres: a real receipt is posted, then a real cancel attempt against the same order is rejected. |
| A `SupplierInvoice` is recorded against a real purchase order that does not actually belong to the given supplier — e.g. by copy-paste error, an invoice ends up traced to a competitor's order | `CreateSupplierInvoiceUseCase` checks `order.supplierId !== input.supplierId` and rejects with `SupplierInvoiceOrderMismatchError` — a real, load-bearing cross-check, not a redundant one, verified with a real second supplier and a real order that genuinely belongs to the first. |
| A `SupplierInvoice`'s `status` is used to imply the invoice was ever actually paid | Deliberately never modeled that way — `status` only ever tracks `RECORDED -> CANCELLED` (whether the document itself is live), same "don't simulate" principle ADR-009 already applied to Payments: this codebase has no real accounts-payable/outgoing-payment flow yet, so pretending `SupplierInvoice` could track "paid" would be a fabricated guarantee. See `SupplierInvoice`'s own docstring. |
| A caller submits a zero, negative, or malformed quantity/cost/amount where a valid decimal is required | DTOs enforce shape (`@Matches`) before any use case runs (`400`, not a generic `500`), and the domain's own `assertValidPositiveDecimal`/`assertValidNonNegativeDecimal` (`apps/api/src/modules/purchasing/domain/decimal.ts`) is the second, unbypassable layer — same belt-and-suspenders pattern every prior monetary module already established. |

### Known limitations (accepted for this slice, not silently ignored)

- **No Purchase Requests.** `docs/ROADMAP.md` §9 explicitly conditions
  this deliverable on "cuando el workflow lo justifique" — unlike the
  other three deliverables in that section, which are unconditional. No
  distinct approval-chain workflow has been established that a Purchase
  Request would sit in front of; the real segregation-of-duties
  requirement is already satisfied by the `purchasing.orders.approve`
  gate on the `PurchaseOrder` itself (see above).
- **No cross-check between a `SupplierInvoice.amount` and the referenced
  order's own line totals or receipts.** A real supplier invoice can
  legitimately include freight, adjustments, or partial-shipment amounts
  that don't equal any subset of `PurchaseOrderLine.lineTotal` — see
  `SupplierInvoice`'s own docstring for the full reasoning.
- **No connection between `SupplierInvoice` and any real payment
  capture.** This codebase's `Payment` module (Phase 4B) only ever
  captures money coming *in* against a `SalesOrder`; a real
  accounts-payable/outgoing-payment flow is a distinct, unbuilt
  capability.
- **No human-readable order number** (`OC-000001`). Same reasoning
  already accepted for Sales' `SalesOrder`/`Quote` (MASTER_SPEC §34 frames
  these as optional; a safe generator needs its own design).
- **No tax on purchase order lines.** A supplier's own tax breakdown
  belongs on `SupplierInvoice` (a real document with a real `amount`),
  not computed by this codebase the way Sales computes `taxRate` from a
  `Tax` master-data record — see `PurchaseOrderLine`'s own docstring.
- **No backfill of the 9 new permissions for tenants provisioned before
  this change**, same accepted gap already documented for every prior
  permission addition — though `SyncOwnerRolePermissionsUseCase`
  (session 28) now closes this gap automatically on every API boot for
  every tenant's Owner role specifically, not just tenants provisioned
  after this change.

## POS (Phase 6, 2026-09-01)

Scope: `apps/api/src/modules/pos` — Registers, Shifts, Cash Movements,
Sales, Returns. Three direct, cycle-free dependencies (docs/ARCHITECTURE.md
§6): Warehouses (a register's home warehouse), Sales, and Payments —
`RingUpSaleUseCase`/`CreatePosReturnUseCase` orchestrate a real
`SalesOrder`/`Payment` end to end purely through those modules' own public
contracts, never a parallel write path. The fifth business module to close
out `docs/ROADMAP.md`'s phased backlog, and the first whose primary write
path is itself an orchestration of two *other* business modules rather
than owning its own transactional domain data.

### Assets

- `pos.registers.read`/`.manage`, `pos.shifts.read`/`.manage`,
  `pos.cash-movements.read`/`.manage`, `pos.sales.read`/`.manage`,
  `pos.returns.read`/`.manage` — 10 new permissions.
- `PosSale`/`PosReturn` — real money and real inventory movements, one
  level removed: a bug here doesn't corrupt `SalesOrder`/`Payment`
  directly, but can misrepresent which shift a real sale/refund belongs
  to, corrupting a shift's own cash reconciliation (see below).
- `PosShift.opening_cash`/`.closing_cash_counted`/`.closing_cash_expected`/
  `.cash_variance` — the numbers a cashier is held accountable to at the
  end of a shift; a bug here could show a false shortage or overage
  against a real person.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A POS sale is rung up against a shift that is `CLOSED`, or a register that was never opened at all | `RingUpSaleUseCase` re-validates `shift.status === "OPEN"` itself (never trusts a client-supplied "I have an open shift" claim) before touching Sales/Payments at all, throwing `PosShiftNotOpenError`/`PosShiftNotFoundError`. Same check in `RecordCashMovementUseCase`/`CreatePosReturnUseCase`. |
| A ring-up attempt fails partway (insufficient inventory, a declined `BANK_TRANSFER`, `amountTendered` below the total) and leaves a real `SalesOrder` reserved/confirmed with nothing to show for it | `RingUpSaleUseCase` compensates on **any** failure after the order is created by calling `CancelSalesOrderUseCase` — the same use case already handles both a still-`DRAFT` order (nothing to release) and a `CONFIRMED` one (releases the reservation), so one call covers every failure path. The compensating cancel is best-effort (its own failure is swallowed, never masking the real error). Verified against real in-memory fixtures for each failure mode (insufficient inventory, declined bank transfer, low `amountTendered`) confirming the order ends `CANCELLED` and no stock stays reserved. |
| A terminal retries the exact same ring-up/return request after losing the response (a network timeout, not a crash) | Both `RingUpSaleUseCase` and `CreatePosReturnUseCase` are idempotent by a caller-supplied `idempotencyKey`, mirroring `CapturePaymentUseCase`'s own contract exactly: a pre-check for the common sequential-retry case, plus a real `@@unique([tenantId, companyId, idempotencyKey])` constraint and a translated-conflict re-fetch for a genuine concurrent race. Verified against **real Postgres** with 5 genuinely concurrent `ringUpSale` calls sharing one idempotency key: all 5 resolve successfully, all 5 converge on the exact same `PosSale.id`, and exactly one row exists at the end (`apps/api/test/integration/pos.integration-spec.ts`). |
| **Known, documented boundary of that guarantee** — a *simultaneous* multi-request race (not a resend, but genuinely overlapping calls), as opposed to the realistic sequential-retry-after-timeout case | The idempotency pre-check runs once, at the very top of `RingUpSaleUseCase`, so every truly concurrent racer can pass it before any of them commits — each then independently creates and fulfills its own real `SalesOrder` (and its own real `Payment`, itself subject to the exact same convergence guarantee Payments' own concurrent-capture race already relies on). What is still guaranteed is that exactly one `PosSale` row ever survives and every caller's result converges on it (verified above) — **not** that only one underlying `SalesOrder`/`Payment` pair was ever created; the "losing" orders remain real, fulfilled, and orphaned (no `PosSale` references them) until an operator reconciles them by hand. This is deliberately not solved with a claim-before-effect mechanism (mirroring the inbox's claim-then-effect pattern, `docs/DECISIONS.md` ADR-008) in this phase — ratified as `docs/DECISIONS.md` ADR-010, which also covers `RingUpSaleUseCase`'s own docstring reasoning; a genuinely simultaneous double-submission (not a sequential retry) is judged to be a much rarer real-world event than what the exit criterion is actually about. |
| Closing a shift understates or overstates the expected cash, hiding a real shortage or falsely accusing a cashier of one | `CloseShiftUseCase` computes `closingCashExpected` fresh, at close time, as a running sum over this shift's own real ledger (`opening_cash` + every `pos_cash_movements` row + every `CASH` `pos_sales.amount` − every `CASH` `pos_returns.refund_amount`) using only POS's own dependency-free BigInt decimal arithmetic (`apps/api/src/modules/pos/domain/decimal.ts`) — never a stored running counter that could drift, and never JS floating point. This is `docs/ROADMAP.md` §10's exit criterion ("Cierres y cash movements son auditables y Decimal-safe"), verified against real Postgres with a shift carrying real cash movements, a real `CASH` sale, and a real fully-refunded return, confirming the computed expected cash exactly matches hand-calculated arithmetic. |
| A cash movement, sale, or return is recorded against a shift/register belonging to a different company | Every use case re-verifies `entity.companyId !== input.companyId` through the resource chain (shift → register → company) and throws the same `NotFoundError` a genuinely-missing entity would (IDOR-resistant, same pattern every prior module uses). |
| A second `PosReturn` against the same `PosSale` attempts to refund an already-`REFUNDED` payment a second time | Not specially guarded in POS itself — `RefundPaymentUseCase` already rejects refunding a non-`CAPTURED` payment with `PaymentNotCapturedError`, which propagates through unchanged. A second return with `issueRefund: false` (goods-only) is always safe and is the documented way to record further partial returns after the first refund. |
| A caller submits a zero, negative, or malformed cash amount | DTOs enforce shape (`@Matches`) before any use case runs (`400`, not a generic `500`), and the domain's own `assertValidPositiveDecimal`/`assertValidNonNegativeDecimal` is the second, unbypassable layer — same belt-and-suspenders pattern every prior monetary module already established. `openingCash`/`closingCashCounted` accept zero (a till can legitimately start/end with no cash); `PosCashMovement.amount` must be strictly positive (direction comes from `type`). |

### Known limitations (accepted for this slice, not silently ignored)

- **No hardware adapters** (barcode scanner, thermal printer, cash
  drawer, customer display). MASTER_SPEC §24 and this phase's own
  "Restricción" (`docs/ROADMAP.md` §10) explicitly defer these until real
  hardware exists to validate against — the same "don't simulate an
  integration nobody can verify" principle ADR-009 already applied to
  credentialed payment gateways. A USB barcode scanner behaves as a plain
  keyboard (HID) and needs no server-side code at all — the UI's product
  search field already works with one; ticket printing uses the browser's
  own print dialog (`window.print()`), not a fabricated thermal-printer
  SDK.
- **No offline mode.** `docs/ROADMAP.md` §10's own "Restricción" is
  explicit: "Offline transaccional no se incluye automáticamente. Antes
  requiere ADR sobre device identity, local ledger, conflict resolution,
  correlativos, reservas y reconciliación." None of that exists yet — POS
  is online-first only, exactly as the entry names it ("Web/PWA
  online-first").
- **The genuinely-simultaneous-race gap documented above** (as opposed to
  the realistic sequential-retry case, which is fully covered) — a
  deliberate, bounded scope decision for this phase, not an oversight.
- **No partial refund**, inherited directly from Payments (ADR-009) — a
  `PosReturn` either refunds the original payment's full amount or
  nothing at all.
- **No cash-drawer count reconciliation beyond a single closing count.**
  A shift closes with one `closingCashCounted` value; there is no
  mid-shift cash count/spot-check feature.
- **No human-readable sale/ticket number.** Same reasoning already
  accepted for Sales' `SalesOrder`/`Quote` and Purchasing's
  `PurchaseOrder` (MASTER_SPEC §34 frames these as optional; a safe
  generator needs its own design).
- **No backfill of the 10 new permissions for tenants provisioned before
  this change** — `SyncOwnerRolePermissionsUseCase` (session 28) closes
  this automatically on every API boot for every tenant's Owner role.

## Commerce (Phase 7A, 2026-09-02)

Scope: `apps/api/src/modules/commerce` — Storefront, StorefrontProduct
(catalog publication), Cart/CartLine, CommerceOrder. Six direct,
cycle-free dependencies (docs/ARCHITECTURE.md §6) — the widest fan-out of
any module in this codebase so far: Catalog, Warehouses, Customers, Sales,
Payments, and Users (for the seeded "Storefront System" actor,
`StorefrontSystemUserSeeder` — see docs/DECISIONS.md ADR-011 point 6).
`CheckoutUseCase` is, like POS's `RingUpSaleUseCase`, an orchestrator with
no transactional domain data of its own. Unique among every module built
so far: **this is the first genuinely public, unauthenticated API surface
in this codebase** (`StorefrontPublicController`, `/api/v1/storefront/
:storefrontCode/*`) — no session, no `X-Tenant-Slug`/`X-Company-Id`
headers, tenant/company/storefront scope resolved purely from the
storefront's own globally-unique `code` by a new guard,
`PublicStorefrontContextGuard`. `StorefrontsController` (admin,
`/api/v1/commerce/*`) is authenticated exactly like every other module.

### Assets

- `commerce.storefronts.read`/`.manage`, `commerce.orders.read` — 3 new
  permissions, admin-side only (the public side has no permission concept
  at all — see Threats below for how it's protected instead).
- `Storefront.code` — a globally unique (not tenant-scoped) public handle;
  the one deliberate exception to this codebase's tenant-scoped-uniqueness
  convention, with a direct precedent (`Tenant.slug` is globally unique
  too, for the same "a public request needs a bare handle to resolve
  scope from" reason, docs/ARCHITECTURE.md §7).
- `Cart.id` — doubles as the public "cart token" a shopper's browser
  holds; unguessable (UUIDv7) but carries no money and no PII beyond what
  a guest later types at checkout — a materially lower-stakes identifier
  than a `Session`'s own hashed token, the same precedent
  `FileObject.storageKey` already sets for "an unguessable UUID is
  public-identifier-safe".
- `CommerceOrder`/its linked real `SalesOrder`/`Payment` — real money and
  real inventory reservations, reachable from a fully anonymous caller.
- The seeded "Storefront System" `User` row — never given a
  `UserCredential`, so it can never authenticate; its only purpose is
  satisfying `InventoryMovement.createdByUserId`'s real `NOT NULL`
  constraint for an actor-less public checkout (ADR-011 point 6).

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A public request forges a tenant/company by supplying its own header, the way every other module's endpoints would normally trust an authenticated `TenantContextGuard` to resolve | The public side never reads `X-Tenant-Slug`/`X-Company-Id`/`Authorization` at all — `PublicStorefrontContextGuard` resolves `{tenantId, companyId, storefrontId}` exclusively from `:storefrontCode`, looked up server-side against the real `Storefront` row. There is structurally no header a client could forge to change which tenant a request resolves to. |
| A shopper enumerates or accesses a product the storefront hasn't chosen to sell (an internal-only SKU, a discontinued line, another company's catalog) | Every public catalog read (`ListPublishedProductsUseCase`/`GetPublishedProductUseCase`) requires a real `PUBLISHED` `StorefrontProduct` row for that exact storefront — the full internal `Catalog` is never reachable through the public surface regardless of a product's real id being known. |
| A shopper's cart/checkout call passes a `cartId`/`storefrontCode` combination that doesn't actually belong together (a stolen or guessed cart token used against a different storefront) | Every cart/checkout use case re-verifies `cart.storefrontId === storefront.id` (resolved server-side from the URL's own `:storefrontCode`, never trusted from the body) before touching it — same IDOR-resistant "404, not 403" pattern every other module already uses (`CartNotFoundError`). |
| A malicious or buggy client dictates its own price for a cart line | `AddCartLineUseCase` never accepts a caller-supplied `unitPrice` at all — the field doesn't exist on `AddCartLineInput`. Price is always resolved server-side from the real `Product.basePrice`/`ProductVariant.price` at add-time and snapshotted onto the `CartLine`, the same "the server is the only source of truth for price" rule `AddSalesOrderLineUseCase` already enforces for the authenticated ERP screens — just with no manual-override escape hatch here, since there is no legitimate staff member on the other end of a public request who could need one. |
| The public surface is used for volumetric abuse — scraping, cart-spam, checkout brute-forcing | `StorefrontPublicController` carries its own `ThrottlerGuard`, backed by a separate `ThrottlerModule` registration (Redis-backed, same `ThrottlerStorageRedisService` pattern as `AuthModule`'s own login limiter) — deliberately a *different* window/limit (`COMMERCE_RATE_LIMIT_MAX`/`_WINDOW_SECONDS`, default 60/60s) than login's, since a shopper browsing/adding-to-cart is a materially different traffic shape than a login attempt and conflating the two would either throttle real shoppers or under-protect login. |
| A checkout request is retried after a lost response (a network timeout on the shopper's side, not a crash) | `CheckoutUseCase` is idempotent by `Cart.id` itself, not a caller-supplied key — see docs/DECISIONS.md ADR-011 point 3 for why this is a structurally cleaner guarantee than POS's own caller-generated-key contract. Verified against **real Postgres** with 5 genuinely concurrent checkout calls sharing one `cartId`: all 5 resolve successfully, all 5 converge on the same `CommerceOrder.id`, and exactly one row exists at the end (`apps/api/test/integration/commerce.integration-spec.ts`). |
| **Known, documented boundary of that guarantee** — the same class of gap already ratified for POS (ADR-010): a genuinely *simultaneous* race, not a sequential retry | Identical shape and identical reasoning to POS's own documented limitation — see ADR-011 point 4. The idempotency pre-check runs once, at the top, so a truly concurrent racer can pass it before any commits; only the final `CommerceOrder` row is guaranteed unique and convergent, not the number of underlying `SalesOrder`s momentarily created. |
| Checkout fails partway (insufficient inventory, a cart-line/warehouse validation error) and leaves a real, reserved `SalesOrder` with nothing to show for it | `CheckoutUseCase` compensates on any failure after order creation by calling the existing `CancelSalesOrderUseCase` — the exact same best-effort compensating-cancel pattern POS's `RingUpSaleUseCase` already established, reused verbatim rather than reinvented. |
| A guest's email is used to silently create a duplicate `Customer` record on every repeat purchase | `CheckoutUseCase` tries `FindCustomerByEmailUseCase` (new this phase, Customers module) before creating one — a repeat guest with the same email converges on the same `Customer`. This required lowercasing `Customer.email` at write time (a real, small fix made during this phase — email was previously stored verbatim, which would have silently defeated case-insensitive matching for e.g. `Ada@x.com` vs. `ada@x.com`). |
| A payment is fabricated or implied for an order that was never actually paid | `CheckoutUseCase` only ever attempts a real `BANK_TRANSFER` capture (the same adapter ADR-009 already built) when the shopper actually provides a reference; otherwise `CommerceOrder.paymentId` stays `null` and the order is genuinely, visibly unpaid — see docs/DECISIONS.md ADR-011 points 1-2 for the full payment/fulfillment model and why no credentialed gateway or auto-fulfillment exists. |

### Known limitations (accepted for this slice, not silently ignored)

- **No credentialed payment gateway** (no Stripe/PayPal/etc.), inherited
  directly from ADR-009 and extended by ADR-011 — the only self-service
  payment path is a `BANK_TRANSFER` reference; anything else is a manual
  staff action through the existing Payments screen.
- **No automatic fulfillment.** Checkout only confirms (reserves) a real
  `SalesOrder`; picking/packing/shipping remains a deliberate, later,
  staff-driven action through Sales' existing screens — see ADR-011
  point 2.
- **The genuinely-simultaneous-race gap documented above** (as opposed to
  the realistic sequential-retry case, which is fully covered) — the same
  bounded, deliberate scope decision already ratified for POS (ADR-010),
  extended here by ADR-011 rather than re-litigated.
- **No promotions/discounts/coupons engine** — no such capability exists
  anywhere in this codebase yet (Sales included); a cart line's price is
  always the product/variant's own real price, with no discount field.
- **No real tax engine on the public side** — Commerce checkout never
  resolves or applies a `Tax`, matching the same "motor de reglas fiscales
  real" deferral already accepted for Sales/Purchasing.
- **No real multi-domain/hostname routing.** `Storefront.domain` is
  purely informational metadata — nothing in this codebase resolves an
  incoming request's hostname to a storefront; the public API is reached
  by `:storefrontCode` in the URL path, not by domain. The same
  "not simulated, just not built" honesty already applied to POS's
  hardware adapters (ADR-010) and to `docs/ROADMAP.md`'s own explicit
  non-goal for offline POS.
- **No customer-facing authentication/account/order-history-with-login.**
  Guest checkout only — this platform has no customer identity system
  distinct from staff `User`/`Session` (ADR-006) yet. A future customer
  portal is real future scope (MASTER_SPEC §23), not a gap being hidden.
- **No search beyond the plain published-product listing** — consistent
  with MASTER_SPEC §85's own "PostgreSQL primero, sin Elasticsearch hasta
  necesitarlo".
- **No cart abandonment job/notification** and **no `Cart` status beyond
  `OPEN`/`CONVERTED`** — an inactive cart simply stays `OPEN` forever;
  building an abandonment state with no real code path behind it yet
  would be exactly the premature machinery MASTER_SPEC §59/§93 warns
  against.

## Accounting (Phase 8, 2026-09-02)

Scope: `apps/api/src/modules/accounting` — Account (Chart of Accounts),
FiscalPeriod, JournalEntry/JournalEntryLine, and the Trial Balance/Account
Ledger reports. **The only business module in this codebase with zero
cross-module dependencies** — `AccountingModule` imports nothing from
Catalog/Sales/Payments/Purchasing/Inventory/Commerce/POS, and none of
those modules call into it either (docs/DECISIONS.md ADR-012). Every other
module built this session either orchestrates other modules
(`CheckoutUseCase`, `RingUpSaleUseCase`) or is called by one
(`GetTaxUseCase`, `RecordReceiptUseCase`); Accounting is neither, by
deliberate design — a complete, independently postable double-entry engine
with no real caller yet.

### Assets

- `accounting.accounts.read`/`.manage`, `accounting.periods.read`/
  `.manage`, `accounting.entries.read`/`.manage`, `accounting.reports.read`
  — 7 new permissions, all company-scoped like every other Master
  Data/business module (`requireCompanyId`).
- `Account.type`/`code` — immutable after creation
  (`UpdateAccountUseCase` only allows renaming) since every already-posted
  `JournalEntryLine` depends on them remaining what they were at posting
  time; the same "a snapshotted/structural fact is never silently
  rewritten" reasoning already applied throughout this codebase
  (`SalesOrderLine.unitPrice`, `PosSale.amount`).
- `FiscalPeriod.status` — `OPEN -> CLOSED` is a one-way door; closing a
  period permanently blocks new postings against it, enforced by
  `CreateJournalEntryUseCase`/`ReverseJournalEntryUseCase` re-resolving the
  covering `OPEN` period fresh on every call, never trusting a
  client-supplied period id.
- `JournalEntry`/`JournalEntryLine` — append-only; no
  `UpdateJournalEntryUseCase`/`DeleteJournalEntryUseCase` exists at all.
  The only two writers are `CreateJournalEntryUseCase` (via
  `JournalEntryRepository.saveWithLines`, atomic entry+lines) and
  `ReverseJournalEntryUseCase` (which only ever appends
  `reversedByEntryId`/`reversedAt` to the *original*, via a separate
  update-only `save()` that never touches lines).
- `JournalEntry.sourceType`/`sourceId` — the idempotent posting port no
  real caller uses yet (ADR-012); a real
  `@@unique([tenantId, companyId, sourceType, sourceId])` constraint
  backs it regardless.

### Threats considered and controls

| Threat | Control |
| --- | --- |
| A journal entry line references an account or fiscal period from another company, letting one company's postings corrupt another's books | Every line's `accountId` is re-validated as real, company-owned, and `ACTIVE` (`AccountNotFoundError`/`AccountNotActiveError`) inside `CreateJournalEntryUseCase` itself — the same defense-in-depth pattern every other module applies (never trusting that an id merely "looks valid"), verified against real Postgres with a genuine cross-company account rejected via its real FK-backed lookup. |
| An unbalanced entry is posted, silently breaking the fundamental double-entry invariant | Enforced at two levels: `JournalEntryLine.create()` rejects a line where debit/credit are both zero or both positive (domain-level, per line); `CreateJournalEntryUseCase` sums every line and rejects the whole entry with `JournalEntryNotBalancedError` unless `sum(debit) === sum(credit)` exactly, using the module's own dependency-free BigInt decimal arithmetic — never JavaScript floats. |
| A posting lands in a period that has already been closed, retroactively altering a company's already-reported financial position | `CreateJournalEntryUseCase`/`ReverseJournalEntryUseCase` both resolve the entry's fiscal period fresh via `GetOpenFiscalPeriodForDateUseCase`, which only ever returns a period whose `status === "OPEN"` — a closed period structurally cannot receive a new posting, verified against real Postgres by closing a period mid-test and confirming the very next posting attempt is rejected. |
| A posting mistake is "corrected" by editing or deleting the original entry, destroying the audit trail | There is no code path that can mutate a `JournalEntryLine` or delete a `JournalEntry` — `ReverseJournalEntryUseCase` is the only correction mechanism, and it always creates a brand-new, fully balanced entry with every line's debit/credit swapped; the original's own lines are verified (unit and integration) to be byte-for-byte unchanged after a reversal. |
| An entry is reversed twice, double-cancelling its economic effect | `JournalEntry.markReversed()` throws if `reversedByEntryId` is already set; `ReverseJournalEntryUseCase` checks `original.isReversed` before doing any work. **Known, accepted gap**: this is a sequential check, not a database constraint — a genuinely concurrent double-reversal of the same entry (two racing requests, both reading `isReversed === false` before either commits) is not prevented by a unique constraint in this slice, an authenticated, staff-only action where the realistic failure mode is a double-click, not adversarial concurrency (see the docstring on `ReverseJournalEntryUseCase` itself). |
| A source-linked posting is duplicated when its triggering event is reprocessed (webhook retry, outbox redelivery) | `CreateJournalEntryUseCase` pre-checks `findBySource(sourceType, sourceId)` for the common sequential-retry case, and a real `@@unique([tenantId, companyId, sourceType, sourceId])` constraint (translated to `JournalEntryIdempotencyConflictError`, never a raw Prisma error, across the module boundary) backs it for a genuine concurrent race — verified against real Postgres with 5 simultaneous posting requests sharing one simulated source key, converging on exactly one entry, exactly one row surviving. No real caller supplies a source yet (see Known limitations), so this is verified with a simulated key, the same precedent ADR-008's inbox already established. |
| The Trial Balance or an Account Ledger silently drifts from the real ledger over time (a stored running balance falling out of sync) | Both reports are recomputed fresh from `JournalEntryLine` on every single call — there is no stored balance column anywhere in this module to drift; the same "ledger read, never a drifting counter" philosophy `InventoryBalance`/`PosShift.closingCashExpected` already established. |

### Known limitations (accepted for this slice, not silently ignored)

- **No automatic postings from Sales, Payments, Purchasing or Inventory.**
  This is the central, deliberate scope decision of this phase — see
  docs/DECISIONS.md ADR-012 for the full reasoning (real accounting policy
  this codebase has no basis to invent, and a materially higher-stakes
  domain than any other simulation already avoided). The idempotent
  posting mechanism a real integration would use is built and verified;
  no module calls it yet.
- **No Balance Sheet or Income Statement.** The Trial Balance provides a
  summed, balance-confirmed view with each row's `accountType`, but no
  code groups accounts into a presented financial statement or handles
  retained-earnings roll-forward across periods (ADR-012 point 4).
- **No period reopening.** `FiscalPeriod.close()` is terminal by design —
  see the entity's own docstring. Correcting a mistake in a closed period
  means posting a reversal (or a new entry) into whatever period is
  currently `OPEN`, not undoing the close.
- **The genuinely-concurrent-double-reversal gap documented above** — a
  real, narrow, low-probability gap for an authenticated, staff-only
  action, not hidden.
- **No reconciliation/bank-statement-matching feature.** `docs/ROADMAP.md`
  §12 names "reconciliación" as a deliverable; this slice provides the
  ledger and reports reconciliation would read from, not a dedicated
  matching workflow.
- **No multi-currency accounting.** `JournalEntryLine.debit`/`credit` are
  plain decimal amounts with no currency field — every posting is
  implicitly in the company's single reporting currency, the same scope
  boundary already accepted for Purchasing/Sales' own `currency` fields
  never being converted or aggregated across different currencies.
- **No approval workflow for posting a journal entry** — unlike
  Purchasing's real segregation of duties (`purchasing.orders.manage` vs.
  `.approve`), Accounting has a single `accounting.entries.manage`
  permission for both creating and posting; a maker-checker workflow for
  manual entries is real future scope, not built here.
