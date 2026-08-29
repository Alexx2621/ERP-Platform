# Architecture Decision Records

Format: Title, Status, Context, Decision, Consequences, Alternatives considered.

Numbering follows `docs/ROADMAP.md` §4 (Fase 0 entregables). Only ADRs that have
actually been written appear below — this is not a placeholder index. ADR-001
(Modular Monolith), ADR-002 (PostgreSQL/Prisma) and ADR-003 (Multi-Tenancy) are
still pending; they belong to whoever ratifies the broader Architecture V1
proposal, not to a single module task. ADR-005 (Plugin Architecture) is also
still pending — its design exists complete in `docs/PLUGINS.md` but nothing
has been implemented against it yet, unlike ADR-004 below.

---

## ADR-004 — Event Architecture V1 (Transactional Outbox + In-Process Bus)

**Status:** Accepted (scope: Event Bus backlog item — outbox mechanism, one
real producer, dispatcher; not the full future scope of `docs/EVENTS.md`,
e.g. inbox/idempotency, external broker, webhooks)

**Context**

`docs/EVENTS.md` has carried a complete V1 event architecture design since
the initial commit (envelope, domain vs. integration event taxonomy, outbox
schema, claim/retry/DLQ semantics, naming) but was never implemented nor
formally ratified as a numbered ADR. This entry ratifies the concrete V1
implementation choices made while building it — the parts `docs/EVENTS.md`
leaves as principles rather than fully pinned-down decisions.

**Decision**

1. **Outbox atomicity is enforced by a plain function taking the caller's
   own Prisma client, not a service with its own DI-managed connection.**
   `appendOutboxMessage(client, input)` (`apps/api/src/core/events`) accepts
   whatever `Prisma.TransactionClient` (or the base `PrismaService`) the
   producer already has open. Every real call site inserts inside the
   producer's own `$transaction` callback — see
   `PrismaTenantProvisioningRepository.create()`. This was chosen over
   giving `EventsModule` its own injectable "outbox writer" service because
   a DI-managed service cannot participate in a transaction opened by a
   *different* module's repository; a plain function that receives the
   already-open client is the only way to guarantee the same commit.

2. **Domain events are delivered by a purely in-process bus, not BullMQ.**
   `DomainEventBus` is an in-memory publish/subscribe map with zero
   persistence — matching `docs/EVENTS.md` §3.3's "Application Notification"
   characterization (no durability guarantee on its own). Durability comes
   entirely from the outbox row already being committed before the bus is
   ever invoked; the bus is the *delivery* mechanism, not the source of
   truth. BullMQ/Redis remains the future transport for genuine
   cross-process job dispatch, not for this in-process fan-out.

3. **The outbox dispatcher runs on a plain `setInterval`, not
   `@nestjs/schedule`.** A periodic poll with no cron expressions or
   job-queue semantics did not justify a new dependency;
   `OutboxDispatcherScheduler` uses Nest's own `OnModuleInit`/
   `OnModuleDestroy` lifecycle to manage a native timer (`.unref()`'d so it
   never blocks process shutdown). ~~Runs inside the API process for V1;
   extracting to a dedicated `apps/worker` process is a later backlog
   item.~~ **Superseded 2026-08-28 — see "Amendment" below: the dispatcher
   now runs in `apps/worker`, a separate process from `apps/api`.**

4. **Row-level locking uses `SELECT ... FOR UPDATE SKIP LOCKED` via raw
   SQL**, since Prisma's query builder has no equivalent. Verified against
   real Postgres with genuinely concurrent claimants
   (`Promise.all([...claimBatch(...), ...claimBatch(...)])` against a
   shared pool of rows) that no row is ever claimed twice.

5. **No `inbox_messages` table yet.** `docs/EVENTS.md` §9 describes one for
   consumer-side idempotency, but the only consumer that exists today
   (`DomainEventBus`, invoked synchronously by the same dispatcher that
   claimed the row) has no cross-process re-delivery path that would need
   it. Building it now, before a real cross-process consumer exists to
   validate its shape, would be exactly the premature machinery
   MASTER_SPEC §59/§93 warns against. Required before any handler with a
   non-idempotent side effect is registered.

6. **Retry policy: exponential backoff capped at 300 seconds, dead-letter
   (`FAILED`) after 5 attempts.** A fixed, simple policy for V1 — no
   per-event-type override mechanism yet, since there is only one producer
   to calibrate against.

7. **Naming**: `<bounded-context>.<aggregate>.<past-tense>.v<major>`
   exactly as `docs/EVENTS.md` §7 specifies. The first (and, at this
   writing, only) real event is `tenancy.tenant.provisioned.v1`.

**Consequences**

- Every future producer follows the same two-step pattern: build the
  payload, call `appendOutboxMessage` with the transaction client already
  in scope. No new infrastructure is needed per producer.
- Because delivery is in-process only, a handler must currently run inside
  the same API process as the dispatcher; there is no way today to have a
  separate service consume these events without first building the
  cross-process piece (inbox + a real transport) called out as deferred
  above.
- ~~Horizontal scaling of the API process runs one dispatcher per instance;
  this is safe (the locking guarantees no double-claim) but means dispatch
  capacity scales with API instance count rather than being independently
  tunable — acceptable until `apps/worker` exists.~~ Resolved by the
  amendment below.

**Amendment (2026-08-28) — Dispatcher extracted to `apps/worker`**

The outbox dispatcher (`DomainEventBus`, `DispatchOutboxBatchUseCase`,
`OutboxDispatcherScheduler`, `PrismaOutboxMessageRepository`) moved out of
`apps/api` into a new `apps/worker` process, per the `docs/WORK_QUEUE.md`
backlog item this ADR always called out as later work. Concretely:

- **The producer/dispatcher split is now enforced by package boundaries,
  not just convention.** `packages/events` (`@erp/events`) is a new shared
  package holding the entire outbox domain: `OutboxMessage`,
  `appendOutboxMessage` (the producer side — still called synchronously
  inside a producer's own `$transaction`, unchanged), and the dispatcher
  side (`DomainEventBus`, `DispatchOutboxBatchUseCase`,
  `OutboxDispatcherScheduler`, `PrismaOutboxMessageRepository`, bundled as
  an importable `OutboxDispatcherModule`). `apps/api` depends on
  `@erp/events` only for `appendOutboxMessage`/`OutboxMessage` — it no
  longer has `DomainEventBus`, the dispatcher, or the scheduler in its own
  module graph at all. `apps/worker` imports `OutboxDispatcherModule`
  directly.
- **`PrismaOutboxMessageRepository` now depends on a `PRISMA_CLIENT` DI
  token** (`@erp/events`'s `infrastructure/prisma-client.token`) instead of
  a specific app's `PrismaService` class, so the shared package stays
  decoupled from which app's Nest lifecycle wiring provides the connection.
  Each consuming app provides `PRISMA_CLIENT` globally (`useExisting` on its
  own `PrismaService`) — `apps/worker` does this exactly like `apps/api`
  already did for its own `PrismaService`/`RedisService`.
- **The outbox schema and claim/lock semantics did not change** — exactly
  as originally predicted. `FOR UPDATE SKIP LOCKED`, backoff, dead-letter,
  and the `outbox_messages` table are byte-for-byte the same; only which
  process polls it changed.
- **`apps/worker` exposes a minimal HTTP liveness endpoint** (`GET /health`
  on its own port, default 3001) per MASTER_SPEC §37 — not a readiness
  check against Postgres (the dispatcher's own poll-tick logs already
  surface connection failures), just confirmation the process is up.
- Verified end-to-end against real Docker infrastructure: `apps/api`
  (dispatcher-free) appends a `tenancy.tenant.provisioned.v1` row during
  provisioning with zero dispatch activity in its own log;
  `apps/worker` (separate process, separate log) claims and publishes that
  same row (`claimed=1 published=1 failed=0`). The Playwright E2E harness
  (`apps/e2e/src/global-setup.ts`) now boots both processes for the same
  reason it already boots Postgres/Redis/MinIO — the real topology, not a
  simulated one.
- Horizontal scaling is now independently tunable exactly as originally
  anticipated: `apps/api` instances scale for HTTP load, `apps/worker`
  instances scale for dispatch throughput, with no coupling between the two
  beyond the shared `outbox_messages` table and its existing lock
  semantics.

**Alternatives considered**

- **`@nestjs/schedule` for the poll interval:** rejected for V1 — a single
  periodic tick does not need cron expressions or the extra dependency;
  revisit if the dispatcher's scheduling needs grow more complex than "poll
  every N milliseconds".
- **Publishing directly to BullMQ instead of an outbox + in-process bus:**
  rejected because it reintroduces the exact dual-write problem the outbox
  pattern exists to avoid (the state commit and the queue publish would not
  be atomic) — `docs/EVENTS.md` §1 is explicit that BullMQ/Redis is
  transport, not source of truth.
- **A generic "unit of work" abstraction shared across all repositories**
  instead of passing the transaction client explicitly per call: rejected
  as unnecessary complexity for the one cross-cutting write (outbox) that
  currently needs it — every other repository still manages its own
  transactions independently, per existing precedent (`docs/ARCHITECTURE.md`
  §6).

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

---

## ADR-007 — Platform Administration Plane V1 (Flag on the Existing User, Not a Separate Identity System)

**Status:** Accepted (scope: a minimal platform-admin plane — `isPlatformAdmin`
flag, `PlatformAdminGuard`, and one real capability behind it,
`GET/PUT /api/v1/platform/users`; not the full future scope of a system-
administration surface, e.g. tenant suspension, PLATFORM-scoped settings
writes, or platform-wide audit/activity views)

**Context**

`docs/ARCHITECTURE.md` §10 states: "System administration usa un plano y
credenciales separados; no existe un 'super admin' implícito que salte
filtros de tenant en endpoints normales." `docs/WORK_QUEUE.md` had this
listed as blocking three backlog items (writing `PLATFORM`-scoped settings,
a cross-tenant "my activity" view, and an admin endpoint for
`SetUserStatusUseCase`) precisely because "plano y credenciales separados"
was never pinned down to a concrete implementation. This ADR makes that
decision, scoped to what Foundation needs right now: a way to gate
genuinely cross-tenant administrative actions behind something stronger
than "has a session", without inventing infrastructure Foundation doesn't
need yet (MASTER_SPEC §59/§93).

**Decision**

1. **Platform admin is a boolean flag on the existing `User` entity
   (`isPlatformAdmin`), not a separate identity/credential system.** The
   same Argon2id password hashing, opaque session tokens, and
   `SessionAuthGuard` already built and verified for regular users (ADR-006)
   are reused as-is. "Plano ... separado" is satisfied by a distinct route
   prefix (`/api/v1/platform/*`) and a distinct authorization guard
   (`PlatformAdminGuard`), not by a distinct authentication stack. Building
   a second, parallel credential system today — before there is a single
   production tenant, let alone a team of platform operators — would be
   exactly the premature machinery MASTER_SPEC §59/§93 warns against, and it
   would duplicate infrastructure (password hashing, session rotation,
   revocation, rate limiting) that is already correct and tested. Revisit if
   real operational need appears: a compromised regular-user login flow
   would, under this model, also be the platform-admin login flow, which is
   a real trade-off being made consciously, not accidentally.
2. **`isPlatformAdmin` is never settable through any public endpoint.**
   `CreateUserUseCase` (used by `POST /auth/register`) hardcodes it to
   `false`; there is no `PUT /api/v1/platform/users/:id/admin-status` or
   similar in this slice. The only way to grant it is a direct database
   operation (`UPDATE users SET is_platform_admin = true WHERE email = ...`)
   performed out-of-band by whoever operates the deployment — the same
   trust model already used for the code-owned permission catalog (nothing
   in the API can create a new `Permission` either). This is a deliberate,
   documented operational gap, not an oversight: a self-service or
   API-driven promotion path is a privilege-escalation surface this slice
   does not need to open yet.
3. **`PlatformAdminGuard` runs after `SessionAuthGuard` and reads
   `request.authContext.user.isPlatformAdmin`**, mirroring exactly how
   `TenantContextGuard`/`PermissionGuard` already layer on top of
   `SessionAuthGuard` for tenant-scoped routes
   (`@UseGuards(SessionAuthGuard, PlatformAdminGuard)`). A missing
   `authContext` (guard misordered) fails closed with a `500`
   (`PLATFORM_ADMIN_GUARD_REQUIRES_AUTH`), same "loud in development, not a
   silent bypass in production" pattern as `PermissionGuard`'s own metadata
   checks.
4. **First real capability: `GET/PUT /api/v1/platform/users`** (list every
   user across every tenant; enable/disable a user's account platform-wide).
   `SetUserStatusUseCase` and its audit trail (`user.status_changed`)
   already existed and were already tested — this ADR's controller is the
   first real HTTP caller for a use case that has had no caller since it was
   built. `ListUsersUseCase` is new but trivial: `UserRepository.findAll`,
   the one deliberate exception to "no unscoped User queries" documented on
   that port's own interface.
5. **No tenant-suspension, no `PLATFORM`-scoped settings write, no
   platform-wide audit/activity view in this slice.** Those remain separate,
   still-pending backlog items now unblocked by this ADR, not implicitly
   granted by it — each needs its own review of what data a platform admin
   should be able to see/do before being built.

**Consequences**

- Every future platform-admin capability follows the same two-step pattern:
  add a route under `/api/v1/platform/*`, gate it with
  `@UseGuards(SessionAuthGuard, PlatformAdminGuard)`. No new guard or module
  is needed per capability.
- A compromised platform-admin account has exactly the blast radius of a
  compromised regular account plus whatever `/platform/*` capabilities
  exist — there is no additional MFA/step-up requirement in this slice.
  Acceptable at Foundation scale (no production tenants), but worth
  revisiting (e.g. mandatory MFA for `isPlatformAdmin=true` accounts) before
  this plane grows more destructive capabilities (tenant deletion, data
  export, impersonation).
- Granting the first platform admin is a manual, undocumented-by-the-API
  operational step. This must be written down in real deployment runbooks
  once they exist; today it is simply a direct SQL statement against the
  Foundation database, consistent with how the permission catalog is
  code/operator-owned rather than self-service.

**Alternatives considered**

- **A fully separate `PlatformAdmin` identity/credential model** (own table,
  own login flow, possibly its own database/schema): rejected for this
  slice as the more "textbook-correct" but premature option — no
  production tenants exist yet to justify the added surface, and nothing
  about the current `User`/`Session` model is insufficiently secure for
  this purpose. Revisit if/when the platform actually has a team of
  operators distinct from any tenant's own users, or once destructive
  platform capabilities (tenant deletion, impersonation) are built.
- **A hardcoded list of admin emails in an environment variable**, checked
  instead of a database column: rejected because it can't be audited,
  rotated, or queried through normal tooling, and every deploy would need a
  config change to add/remove an admin — worse operational ergonomics than
  a database flag for no real security benefit at this scale.
- **Reusing `RoleAssignment`/`Permission` (RBAC) for platform-level access**
  by inventing a synthetic "platform tenant": rejected because RBAC's whole
  data model (`Role`, `RoleAssignment`, `Membership`) is deliberately
  tenant-scoped (`docs/MULTITENANCY.md` §9) — forcing a cross-tenant concept
  through a tenant-scoped system would be a structural misuse, not a reuse,
  of that module.
