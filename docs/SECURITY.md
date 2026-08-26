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
- **No audit log entries yet** for login/logout/revocation — `docs/MASTER_SPEC.md`
  §10 asks for audit trails on security-sensitive actions, but the Audit
  module (Roadmap 1F) doesn't exist yet. This module's use cases are the
  natural place to add audit calls once that port exists; it should not
  require changing the use cases' external behavior.
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
