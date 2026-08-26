# Architecture Decision Records

Format: Title, Status, Context, Decision, Consequences, Alternatives considered.

Numbering follows `docs/ROADMAP.md` §4 (Fase 0 entregables). Only ADRs that have
actually been written appear below — this is not a placeholder index. ADR-001
(Modular Monolith), ADR-002 (PostgreSQL/Prisma), ADR-003 (Multi-Tenancy),
ADR-004 (Event Architecture) and ADR-005 (Plugin Architecture) are still
pending; they belong to whoever ratifies the broader Architecture V1 proposal,
not to a single module task.

---

## ADR-006 — Identity & Session Strategy

**Status:** Accepted (scope: FOUNDATION-001 — password auth only; MFA/OAuth/SSO/API keys excluded per `docs/tasks/FOUNDATION-001.md`)

**Context**

`docs/ARCHITECTURE.md` §3.4 explicitly lists password hashing parameters and
the web session strategy (cookie vs. token) as decisions that must be
registered before implementing Identity/Access Control (Roadmap Fase 1D).
`docs/SECURITY.md` and this file were both empty when FOUNDATION-001 started,
so no such decision existed yet. This ADR makes it, scoped to what
FOUNDATION-001 actually needs: credentials, login, sessions, refresh, logout,
revocation.

**Decision**

1. **Password hashing: Argon2id**, via `@node-rs/argon2` (prebuilt native
   bindings, no node-gyp/build-tools requirement — chosen over `node-argon2`
   for that reason on a Windows dev environment). Parameters: memory cost
   19 456 KiB, time cost 2, parallelism 1 — the OWASP-recommended Argon2id
   baseline, and also this library's own defaults; they are still passed
   explicitly in code (`apps/api/src/core/auth/infrastructure/argon2-password-hasher.ts`)
   so the security parameter is visible in source rather than resting on a
   dependency default that could silently change. The encoded hash string is
   self-describing (PHC format: algorithm + version + params + salt +
   digest), so `user_credentials.password_hash` is the only column needed —
   no separate `algorithm`/`version` columns to keep in sync.

2. **Sessions are server-side and opaque, not JWT.** Every login/refresh
   issues two high-entropy random tokens (256 bits, base64url) — access and
   refresh — hashed with SHA-256 before being persisted. A `Session` row
   stores both hashes plus status/expiry. Validating a request means hashing
   the presented token and looking it up; there is no client-decodable
   payload. This was chosen over JWT so that "session revocation" (explicitly
   in scope) is immediate and exact — revoke a row and the token is dead —
   instead of needing a blocklist/short-TTL-plus-cache workaround for the
   revocation problem JWTs have. Foundation has no such cache (Redis isn't
   bootstrapped yet), so the simpler opaque-token model is also the cheaper
   one to build correctly right now.

3. **Delivery: Bearer token in the `Authorization` header, in the JSON
   response body — not a cookie.** The platform is API-first (MASTER_SPEC
   §25) and the same auth surface must serve the ERP web SPA, POS (PWA), and
   eventually mobile/integrations; a bearer token works uniformly across all
   of them without special-casing a cookie jar for one client. This
   deliberately leaves the ERP web app's own token-storage strategy (memory
   vs. storage, XSS exposure trade-offs) to whoever builds that frontend —
   revisit this ADR if a first-party cookie session turns out to be worth the
   added CSRF-handling complexity for that one client.

4. **One row per session; refresh rotates in place.** A refresh call
   generates a new access+refresh pair and overwrites the hashes on the same
   `Session` row (sliding expiry) rather than creating a new session or a
   token-family chain. A refresh token can be used exactly once — reusing an
   already-rotated token simply finds no matching row (`SessionNotFoundError`).
   Deliberately **not implemented**: reuse-detection/token-family revocation
   (the pattern where reusing a stale refresh token revokes the whole
   session as a theft signal). That is a real hardening option, but it is
   machinery Foundation doesn't need yet per MASTER_SPEC §59/§93 ("no
   sobrearquitectura"); revisit if abuse patterns actually appear.

5. **Lifetimes:** access token 15 minutes, refresh token 30 days, both
   configurable via `ACCESS_TOKEN_TTL_SECONDS` / `REFRESH_TOKEN_TTL_SECONDS`
   (`apps/api/.env.example`).

6. **Disabling a user takes effect on its own, without an event.**
   `ValidateSessionUseCase` re-checks the owning user's status on *every*
   use of an access token (not just at login), so a disabled user's
   outstanding tokens stop working within one access-token TTL. This was
   chosen over having `SetUserStatusUseCase` (Users module) publish an event
   that Auth consumes to proactively revoke sessions, because Foundation has
   no event bus/outbox yet (Roadmap Fase 1F) — building one just for this
   would be exactly the kind of premature machinery MASTER_SPEC warns
   against. Revisit once eventing exists: proactive revocation on disable is
   strictly faster than waiting out the access-token TTL.

7. **Login timing/enumeration:** password verification always runs, even
   against a dummy hash when the email doesn't exist, so response time
   doesn't reveal whether an account exists. Account-disabled is reported
   only *after* a correct password (not before), so a wrong-password guess
   never leaks account status either — only someone who already has the
   correct password learns the account is disabled.

8. **Rate limiting:** `@nestjs/throttler` guards the whole `/api/v1/auth/*`
   surface (`AuthController`), configured via `LOGIN_RATE_LIMIT_MAX` /
   `LOGIN_RATE_LIMIT_WINDOW_SECONDS`. Originally an in-memory, single-instance
   store; backed by Redis since 2026-08-26 (`@nest-lab/throttler-storage-redis`,
   `apps/api/src/shared/redis`) so the limit coordinates across multiple API
   processes, per MASTER_SPEC §87.

**Consequences**

- Every authenticated request costs one DB lookup (session by hashed token,
  plus the user row). Acceptable at Foundation scale; if it becomes a
  bottleneck, a cache in front of session validation is an additive change
  behind the same `SessionRepository`/`ValidateSessionUseCase` ports — it
  does not require revisiting this ADR's token model.
- No cross-process revocation cache is needed (unlike JWT+blocklist) because
  the database row *is* the source of truth.
- The ERP web frontend (not yet built) must decide its own token storage
  approach; this ADR does not resolve that, only the backend contract.

**Alternatives considered**

- **JWT access tokens:** rejected for Foundation because "session revocation"
  is explicitly in scope and immediate, and building correct JWT revocation
  without Redis means either short-lived-token-plus-polling or a DB check
  anyway — at which point the opaque-token model is simpler for equivalent
  guarantees.
- **`node-argon2` (node-argon2/ranisalt) instead of `@node-rs/argon2`:**
  equivalent security properties; `@node-rs/argon2` was chosen for
  cross-platform prebuilt binaries (no native build toolchain required to
  `pnpm install`).
- **HttpOnly cookie sessions:** still a reasonable choice for the first-party
  ERP web app specifically, but rejected as the *only* mechanism because it
  doesn't generalize to POS/mobile/integrations without special-casing.
