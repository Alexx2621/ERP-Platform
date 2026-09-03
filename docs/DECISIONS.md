# Architecture Decision Records

Format: Title, Status, Context, Decision, Consequences, Alternatives considered.

Numbering follows `docs/ROADMAP.md` §4 (Fase 0 entregables). Only ADRs that have
actually been written appear below — this is not a placeholder index. ADR-001
(Modular Monolith), ADR-002 (PostgreSQL/Prisma) and ADR-003 (Multi-Tenancy) are
still pending; they belong to whoever ratifies the broader Architecture V1
proposal, not to a single module task. ADR-005 (Plugin Architecture V1 mínimo)
was ratified once the App Registry mechanism was implemented — see below.
ADR-009 (Payment Gateway Adapters V1) was ratified once Payments (Phase 4B)
was implemented — see below. ADR-010 (POS Terminal Idempotency Scope V1)
was ratified once the POS module (Phase 6) was implemented — see below.
ADR-011 (Commerce Checkout Payment/Fulfillment and Idempotency Model V1)
was ratified once the Commerce module (Phase 7A) was implemented — see
below. ADR-012 (Accounting Integration Scope V1 — Manual Engine and
Idempotent Posting Port, No Automatic Cross-Module Postings) was ratified
once the Accounting module (Phase 8) was implemented — see below. ADR-013
(CRM Sales-Event Consumption Scope V1 — No Speculative Consumer Ahead of a
Real Sales-Side Producer) was ratified once the CRM module (Phase 9) was
implemented — see below. ADR-014 (Manufacturing Costing and Traceability
Scope V1 — No Cost Calculation Ahead of an Approved Costing Model) was
ratified once the Manufacturing module (Phase 10) was implemented — see
below.

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

## ADR-005 — Plugin Architecture V1 mínimo (Code-Owned Catalog, ENABLED/DISABLED Lifecycle)

**Status:** Accepted (scope: the App Registry mechanism itself —
`AppDefinition`/`TenantApp`/`AppConfiguration`, dependency and dependents
checks, one HTTP surface, seeded with an empty catalog; not the full future
scope of `docs/PLUGINS.md`, e.g. manifest files compiled at build time,
SemVer range compatibility, the AVAILABLE/INSTALLING/ENABLING/DISABLING/
SUSPENDED lifecycle, entitlement/billing, or backend/frontend contribution
registries)

**Context**

`docs/PLUGINS.md` has carried a complete Plugin Architecture V1 design since
the initial commit (manifest schema, layered model, lifecycle state machine,
backend/frontend extension registries, catalog validation pipeline) but was
deliberately left unimplemented: `docs/WORK_QUEUE.md` tracked "App Registry
mínimo" as the last remaining Foundation backlog item, explicitly deferred
because no business module beyond the Platform Core existed yet to register
in it — building the full mechanism with nothing real to register would have
been exactly the premature machinery MASTER_SPEC §59/§93 warns against. This
ADR ratifies the scope actually built once that deferral was lifted: a
working mechanism validated against fixture apps, ready for the first real
business app (Phase 2+) to register against, without carrying the parts of
`docs/PLUGINS.md`'s full design that have nothing real to justify them yet.

**Decision**

1. **The catalog is a code-owned array (`FOUNDATION_APPS`), not a
   compiled-from-manifest-files build artifact.** Same pattern as
   `FOUNDATION_PERMISSIONS`/`setting-catalog.ts`: a plain TypeScript array,
   validated at boot (`validateAppCatalog`) and upserted into
   `app_definitions` by `AppCatalogSeeder`, mirroring
   `PermissionCatalogSeeder`/`SettingCatalogSeeder` exactly. `docs/PLUGINS.md`
   §4-§5 describes JSON manifests compiled and validated by CI before
   deployment — that is real infrastructure work with nothing to validate
   yet (`FOUNDATION_APPS` is empty; no business module exists), so it is
   deferred until a real manifest actually needs authoring outside
   TypeScript source.
2. **`FOUNDATION_APPS` ships empty.** No fabricated or placeholder app
   entry was added to production code — MASTER_SPEC §90 ("no simular
   integraciones o operaciones exitosas") extends to not simulating a
   business app that does not exist. The mechanism is instead validated by
   unit tests (fixture manifests fed to `validateAppCatalog` and the
   enable/disable use cases) and one integration/E2E scenario that inserts
   temporary fixture rows directly into `app_definitions` — the same
   sanctioned pattern already used for hard-to-reach test states throughout
   this project (granting the first platform admin, backdating a file's
   `deleted_at`).
3. **Tenant lifecycle collapses to `ENABLED`/`DISABLED`, not the full
   `AVAILABLE -> INSTALLING -> INSTALLED -> ENABLING -> ENABLED` state
   machine `docs/PLUGINS.md` §7 describes.** "Install" (§7.1) exists to
   validate entitlement, create configuration, and record acceptance of
   already-deployed code — but V1 mínimo has no entitlement/billing system
   (MASTER_SPEC §56, still deferred) and no migration/preflight step that
   differs between "installed" and "enabled". Collapsing the two into one
   idempotent `EnableAppUseCase` avoids modeling transitional states with
   no distinct real behavior yet — the same reasoning ADR-008 used to
   collapse the inbox to two states instead of three.
4. **Dependency and dependents checks are real, exact-match by key —
   without SemVer range compatibility.** `EnableAppUseCase` requires every
   `dependsOnKeys` entry to already be `ENABLED` for the tenant;
   `DisableAppUseCase` rejects disabling an app that another `ENABLED` app
   still depends on. `docs/PLUGINS.md` §4.1/§6 describes dependency ranges
   (`">=1.2.0 <2.0.0"`) — with a single version per app and no upgrade path
   yet to reconcile, range matching would have nothing real to resolve
   against. Revisit once a second version of any app definition actually
   ships.
5. **No backend/frontend contribution registries
   (`registerRoute`/`registerMenuItem`/`registerDashboardWidget`/etc.,
   `docs/PLUGINS.md` §8-§9).** These exist to let a module contribute
   routes, jobs, menu entries and widgets without touching the Core — but
   zero business apps have any such contribution to register yet. Building
   the registries now would be speculative infrastructure with no caller.
   The one real HTTP surface needed today (`AppsController`: list catalog,
   list-with-tenant-status, enable, disable, get/set configuration) is
   built and permission-gated (`apps.read`/`apps.manage`, added to
   `FOUNDATION_PERMISSIONS`).
6. **`AppConfiguration` is opaque JSON with no per-key catalog**, same
   simplicity already accepted for `UserPreference` — no shipped app
   declares a configurable setting yet, so there is nothing real to
   validate a schema against. Setting/reading a configuration value
   requires the owning app to be currently `ENABLED` for the tenant.
7. **Physically homed in its own module (`app-registry/`), not
   `tenants/presentation/`.** Unlike Roles/Audit/Notifications, `TenantsModule`
   never needs to import `AppRegistryModule` (provisioning a tenant does not
   auto-enable any app — there are none to enable), so no module-loading
   cycle exists, and `AppsController` can safely import
   `TenantContextGuard`/`PermissionGuard` from Tenants/Access Control while
   living in `app-registry/presentation/` — same reasoning already
   documented for `ConfigurationModule`/`FilesModule`.

**Consequences**

- The first real business app (Phase 2+) needs only to add one entry to
  `FOUNDATION_APPS` — the seeding, validation, enable/disable, dependency,
  and configuration mechanics all already exist and are already tested.
- No route, job, menu item, or widget can be conditionally shown/hidden
  based on app enablement yet — every future module that needs this must
  build its own gating (checking `ListTenantAppsUseCase`'s result, or a new
  guard) until the registries described in `docs/PLUGINS.md` §8-§9 are
  built for real. This is a known, accepted gap, not an oversight.
- Upgrading an app to a second version has no defined migration path yet
  (`TenantApp.version` doesn't even exist as a field in this V1 mínimo — the
  domain only tracks `ENABLED`/`DISABLED`, not a version pin per tenant).
  Revisit `docs/PLUGINS.md` §7.5 once a real app actually ships a second
  version.
- Entitlement/plan-gating (MASTER_SPEC §56) is not connected to enablement
  at all — any tenant can enable any catalog app it can see. Acceptable
  today (empty catalog, no SaaS billing yet); must be revisited before any
  paid plan differentiation is real.

**Deferred**

Everything in `docs/PLUGINS.md` not listed under "Decision" above remains
future scope, not implicitly ruled out: manifest files and CI catalog
validation, SemVer ranges, the full lifecycle state machine, entitlement,
backend/frontend contribution registries, uninstall/data retention, and any
third-party plugin trust model (`docs/PLUGINS.md` §16 already states V1's
manifest vocabulary is not a security boundary for untrusted code).

**Alternatives considered**

- **Building the full `docs/PLUGINS.md` design now, including manifest
  files and contribution registries:** rejected as premature — every one of
  those pieces has zero real caller today (`FOUNDATION_APPS` is empty), and
  building them speculatively is exactly the sobrearquitectura MASTER_SPEC
  §59/§93 warns against. The mechanism that exists now is proportionate to
  what can actually be exercised and tested for real.
- **Waiting until Phase 2 (Master Data) to build any of this:** rejected
  per explicit user instruction to close out this last Foundation item now,
  so that Phase 2's first business app has the registration mechanism
  ready rather than needing to build it alongside its own domain work.
- **Seeding a placeholder/example app into `FOUNDATION_APPS`** to have
  something visible in the UI today: rejected — it would be a fabricated
  business app that doesn't exist, violating the same "don't simulate"
  principle applied everywhere else in this codebase. The mechanism is
  validated by tests and fixtures instead, and the UI's own empty state
  ("Todavía no hay apps en el catálogo") honestly reflects reality.

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

**Amendment (2026-08-29) — PLATFORM-scoped settings writes**

The second capability point 5 called out as deliberately deferred —
`PLATFORM`-scoped settings writes — is now built:
`GET /api/v1/platform/settings/definitions`,
`GET /api/v1/platform/settings`, and
`PUT /api/v1/platform/settings/:key`, all behind the same
`SessionAuthGuard` + `PlatformAdminGuard` pair as `PlatformUsersController`.
No new decision was needed here — `SetSettingValueUseCase` was already
domain-complete for `PLATFORM` since Typed Configuration was first built
(see that module's own docstrings), waiting only for a safe caller. This
confirms the pattern point 4 predicted: "every future platform-admin
capability follows the same two-step pattern" — a new `ListPlatformSettingsUseCase`
(reusing `GetEffectiveSettingUseCase` with no tenant context, so its
fallback chain only ever reaches `PLATFORM -> DEFAULT`) plus a new
controller under the existing guard, nothing else. Verified end-to-end
against real Postgres: a `PLATFORM` write is confirmed to become the
effective value for a real tenant with no TENANT/COMPANY override of its
own, not just readable back from the PLATFORM row itself.

**Amendment (2026-08-29) — Platform-scoped audit view**

The other capability this ADR unblocked — a "my activity"/platform-admin
view for `tenantId: null` audit entries, called out as a pending backlog
item in `docs/SECURITY.md`'s original Audit section — is now built too:
`GET /api/v1/platform/audit-entries`, same guard pair, same two-step
pattern again. `ListPlatformAuditEntriesUseCase` mirrors `ListAuditEntriesUseCase`
exactly, swapping `findByTenant` for a new `findPlatformScoped` method on
`AuditEntryRepository` that filters `WHERE tenant_id IS NULL` — the query
boundary is structural, not an application-level filter that could be
forgotten. Verified against real Postgres (integration suite and this
session's smoke test) that a real tenant's own audit entries
(`tenant.provisioned`, etc.) never appear in this view, only genuinely
untenanted ones (login, logout, user status changes, and now PLATFORM
setting changes).

---

## ADR-008 — Consumer-Side Idempotency (Inbox)

**Status:** Accepted (scope: the inbox mechanism itself — claim/lease
table, repository, `consumeIdempotently` helper, verified against real
Postgres including real concurrent claimants and lease recovery. The
"Deferred" item below — wiring Notifications to a real cross-process
handler — was completed 2026-08-29; see "Amendment" below.)

**Context**

`docs/EVENTS.md` §9 has specified an inbox design since the initial commit:
"El check de inbox, el efecto del consumer y la marca de procesado ocurren
en la misma transacción local." ADR-004 point 5 explicitly deferred
building it until a real cross-process consumer needed it, to avoid
premature machinery (MASTER_SPEC §59/§93). No `DomainEventBus` handler with
a non-idempotent side effect has ever been registered — every real producer
so far (tenant provisioning) only appends to the outbox; nothing consumes
integration events yet. This ADR builds the mechanism now, ahead of the
first real handler, because three things converged: the pattern is fully
specified already, the outbox's own claim/lease design (ADR-004) is a
proven template to mirror, and the first real consumer (Notifications) is
next in the backlog and would otherwise need this decision made under time
pressure alongside a business feature.

**Decision**

1. **Two states only: `PROCESSING` and `PROCESSED` — no separate `FAILED`.**
   `docs/EVENTS.md`'s own inbox schema doesn't mandate a third state, and
   collapsing failure into "still PROCESSING, reclaimable once its lease
   expires" reuses the exact recovery mechanism already built and tested
   for the outbox (a crashed dispatcher's lease expiring) instead of
   inventing a second one. A failure is still visible operationally via
   `attempt_count`/`last_error_code`, both incremented/set on every failed
   attempt.
2. **Claim via `tryClaim`, not a shared-transaction check-effect-mark.** The
   literal EVENTS.md wording (effect and inbox write in the same local
   transaction) assumes the consumer's effect is a plain SQL write using
   the same Prisma client as the inbox check. In practice, a use case like
   `RequestNotificationUseCase` receives its own repository via DI with no
   guaranteed shared transaction handle with the inbox table. Rather than
   redesign every existing use case to accept an externally-supplied
   transaction client, this ADR adopts the same pattern already accepted
   for the outbox side (`OutboxMessage.markProcessing`/`claimBatch`): claim
   first (a small, fast, atomic operation using `SELECT ... FOR UPDATE` for
   an existing row and a unique-constraint race for a brand-new one — see
   `PrismaInboxMessageRepository.tryClaim`), then run the effect, then mark
   processed. This narrows, but does not eliminate, the crash window between
   claim and mark — see "Consequences".
3. **`consumeIdempotently(inbox, input, effect)` is the one required entry
   point.** Every future `DomainEventBus.subscribe` handler with a
   non-idempotent side effect must go through it, mirroring how every
   outbox producer goes through `appendOutboxMessage`. It never lets an
   effect's exception propagate back into `DomainEventBus.publish` — it
   catches it and returns `"failed"` instead, so one consumer's failure
   never aborts delivery to other handlers subscribed to the same event
   (`DomainEventBus.publish` already runs handlers sequentially and stops
   on the first throw; `consumeIdempotently` is what keeps a handler from
   being that first throw).
4. **Lease default of 300 seconds**, matching the outbox dispatcher's own
   default — no separate tuning knob introduced until a real consumer's
   effect duration shows it needs one.
5. **`(consumer_name, message_id)` is the only identity that matters**, not
   the event's own uniqueness. The same event id delivered to two different
   consumers is two independent claims (verified: `list-platform-audit-entries`
   style "different consumers are independent" test) — a design requirement
   from `docs/EVENTS.md` §12 ("El consumer es dueño de su handler, inbox y
   retry policy").

**Consequences**

- A handler still has a narrow crash window between `tryClaim` succeeding
  and the effect actually completing (or between the effect completing and
  `markProcessed` running) where the message is neither reprocessed nor
  marked done until its lease expires — same accepted risk window already
  present for the outbox's own `markProcessing`/`markPublished` gap, and
  for Owner-role seeding not being transactional with provisioning
  (`docs/SECURITY.md` "Access Control / RBAC"). Not full exactly-once; the
  goal (per `docs/EVENTS.md` §1) was always exactly-once *effect* under
  normal operation, not a formal 2PC guarantee.
- Every future idempotent consumer needs exactly one new line of code
  routing through `consumeIdempotently` — no new table, no new module.
- `packages/events`'s `OutboxDispatcherModule` now exports
  `INBOX_MESSAGE_REPOSITORY` alongside `DomainEventBus`, so a consuming
  app's own handler registration code can inject both together without
  additional wiring.

**Deferred**

Connecting a real business handler (Notifications to
`tenancy.tenant.provisioned.v1`) is **not** part of this ADR's scope. That
requires extracting at least `RequestNotificationUseCase` and its
dependencies out of `apps/api/src/core/notifications` into a package
`apps/worker` can import — `DomainEventBus` only ever receives a published
event inside the process that runs the outbox dispatcher, which is
`apps/worker`, and no business module lives outside `apps/api` today. That
extraction is its own bounded piece of work (the same shape as the
`apps/worker` extraction itself, ADR-004's amendment) and remains a
separate backlog item, not bundled into this ADR to keep each change
independently reviewable.

**Alternatives considered**

- **A single shared Prisma transaction wrapping both the inbox check and
  the consumer's effect**, exactly as `docs/EVENTS.md` §9 describes:
  rejected for this pass because it would require changing how every
  existing use case's repositories receive their Prisma client (accepting
  an externally supplied transaction client instead of DI-injecting their
  own), a change with a much larger blast radius than the inbox mechanism
  itself. Revisit if a future consumer's correctness actually requires the
  stronger guarantee.
- **A `FAILED` terminal state with manual replay**, mirroring the outbox's
  own dead-letter: rejected for now — with zero real consumers registered,
  there is no operational experience yet to justify a replay UI/endpoint;
  the outbox's own retry already bounds how many times a failing handler is
  retried (`OutboxMessage.markFailed`'s `maxAttempts`), so an inbox-level
  DLQ would be redundant machinery on top of that existing limit.

**Amendment (2026-08-29) — Notifications connected as the first real consumer**

The "Deferred" item above is done. `RequestNotificationUseCase` and its
domain/application/infrastructure moved out of `apps/api/src/core/notifications`
into a new shared package, `@erp/notifications` (same extraction shape as
`@erp/events`, ADR-004's amendment — a `PRISMA_CLIENT` DI token each
consuming app satisfies via `useExisting` on its own `PrismaService`; HTTP
presentation stayed in `apps/api`). `apps/worker` imports it and registers
`TenantProvisionedNotificationHandler`, an `OnModuleInit` provider that
subscribes to `tenancy.tenant.provisioned.v1` on `DomainEventBus` and wraps
the `RequestNotificationUseCase` call in `consumeIdempotently` exactly as
this ADR specifies (`consumerName: "notifications.tenant-provisioned"`,
`messageId: event.eventId`). `TenantsController.provision()` no longer
imports or calls `RequestNotificationUseCase` at all — the owner
notification is now a genuine side effect of the event being published, not
a direct call dressed up as one.

Verified against real Postgres: a new integration test provisions a real
tenant, dispatches the real outbox, confirms exactly one real `Notification`
row via the real `PrismaNotificationRepository`, then redelivers the same
event manually and confirms no second row is created. Verified against the
real Docker dev environment: the persistent `apps/worker` process (not
`apps/api`) created the notification for a real provisioned tenant, visible
in its own log (`Outbox dispatch: claimed=1 published=1 failed=0`) with zero
notification-related code running inside `apps/api` at all.

Membership-invitation notifications (`MembershipsController.invite()`,
session 15) deliberately remain a direct call, not an event — that action
has no corresponding outbox event and is a real-time, user-triggered
request where a direct call is the correct shape, not a gap to close.

---

## ADR-009 — Payment Gateway Adapters V1 (Credential-Free Only: CASH and BANK_TRANSFER)

**Status:** Accepted (scope: the two adapters actually shipped, the
`PaymentGateway` port they implement, and the idempotency/audit contract
`CapturePaymentUseCase`/`RefundPaymentUseCase` build on top of it; not the
full future scope of a real card/wallet processor integration)

**Context**

`docs/ROADMAP.md` §8 (4B) lists Payments' deliverables as "Payment
aggregate independiente", "`PaymentGateway` ports y primeros adapters
aprobados", idempotency, and capture/cancel/refund — but does not name
which adapters are "aprobados" for this slice. MASTER_SPEC §22 names
`StripeAdapter`/`PayPalAdapter`/`BACAdapter`/`TilopayAdapter`/
`TransferAdapter`/`CashAdapter` as illustrative examples of the pattern,
not a mandate to build all of them now. This ADR makes the concrete choice
of which adapters this slice actually ships, and why.

**Decision**

1. **Only `CASH` and `BANK_TRANSFER` are implemented.** Both are
   synchronous, terminal, and require zero external credentials, API
   keys, or network calls — `CashPaymentGatewayAdapter`/
   `BankTransferPaymentGatewayAdapter` (`apps/api/src/modules/payments/
   infrastructure/`) are pure in-process logic. No `StripeAdapter`/
   `PayPalAdapter`/or any other credential-requiring provider is built,
   stubbed, or faked — a fabricated adapter that pretends to call a real
   payment processor without real credentials would violate MASTER_SPEC
   §90 ("no simular integraciones o operaciones exitosas") far more
   seriously than any other integration gap already accepted elsewhere in
   this codebase (SMTP email, for instance, fails closed with a clear
   reason when unconfigured — it never pretends to have sent an email).
   Real money is the highest-stakes domain this codebase touches; the bar
   for "don't simulate" is at its strictest here.
2. **`PaymentGateway.capture()`/`.refund()` are both synchronous and
   always terminal**, resolving to `{ success, gatewayReference,
   failureReason }` in the same call — never `PENDING`. Neither `CASH`
   nor `BANK_TRANSFER` has a genuine asynchronous confirmation step to
   reconcile later (a cash payment is definitionally settled the instant
   it is recorded; a bank transfer's confirmation number is
   caller-supplied, not polled from a bank API). `verifyPayment()`/
   `handleWebhook()` from MASTER_SPEC §22's fuller contract are therefore
   not built — there is nothing for them to verify yet.
3. **`BANK_TRANSFER.capture()` requires a non-empty `reference`** (the
   transfer confirmation number); `CASH.capture()` requires none. This is
   a real, load-bearing validation, not a placeholder: without a
   reference, a bank transfer payment could never be reconciled against
   an actual bank statement later. Both `.refund()` implementations
   always succeed — an internal bookkeeping reversal, not a call to an
   external system that could decline.
4. **Idempotency is enforced by a real database unique constraint**
   (`@@unique([tenantId, companyId, idempotencyKey])`), with
   `CapturePaymentUseCase` pre-checking the common sequential-retry case
   and reacting to the constraint's own P2002 violation (translated to
   `PaymentIdempotencyConflictError` by `PrismaPaymentRepository`, per
   docs/ARCHITECTURE.md §6's "infrastructure must not leak a raw Prisma
   error across the module boundary") for the genuine concurrent-race
   case — mirroring the exact same claim/lease shape ADR-004's outbox and
   ADR-008's inbox already established, applied here to a third kind of
   real-world race.

**Consequences**

- Adding a real, credential-requiring processor (Stripe, a local
  Guatemalan gateway like BAC/Tilopay, etc.) is a distinct, separately
  scoped future task — it needs real API credentials, a real sandbox to
  test against, PCI-relevant handling this codebase has never needed
  before (even tokenized, MASTER_SPEC §22 forbids storing card data
  directly), and almost certainly a genuinely asynchronous `capture()`
  that can return `PENDING` — a shape `PaymentGateway`'s current contract
  does not yet accommodate and would need to be extended for.
- No webhook infrastructure, no provider-timeout reconciliation exists
  yet — both are meaningless without an asynchronous gateway to receive
  webhooks from or time out against. Revisit both the moment the first
  real processor is added.
- `docs/ROADMAP.md` §8's exit criteria ("Fallos del provider son
  reconciliables y observables") is satisfied today only in the narrow
  sense that both adapters' failures are synchronous and immediately
  visible (`Payment.status = FAILED` with a `failureReason`) — there is
  no "provider is down/ambiguous" state to reconcile because neither
  adapter can enter one.

**Alternatives considered**

- **Building a fake `StripeAdapter` that returns a hardcoded success**,
  to have a "complete-looking" set of adapters matching MASTER_SPEC §22's
  example list: rejected outright — this is exactly the kind of
  simulated integration MASTER_SPEC §90 prohibits, and doing so for real
  money specifically would be materially worse than any other simulation
  this codebase has ever avoided.
- **Deferring Payments (4B) entirely until a real processor's credentials
  are available**: rejected — `CASH`/`BANK_TRANSFER` are themselves real,
  commonly used payment methods (MASTER_SPEC §22 lists both explicitly),
  not placeholders; Sales orders need a genuine way to be paid today, and
  building the full idempotency/audit/refund contract now against two
  real, simple adapters de-risks adding a third, more complex one later.
- **A generic "manual" payment method with no `PaymentMethod` enum
  distinction** instead of separate `CASH`/`BANK_TRANSFER` values:
  rejected — the two have genuinely different validation rules (a bank
  transfer needs a reference, cash does not) and reporting value (a real
  business cares which one was used), so collapsing them would lose real
  information for no simplification benefit.

---

## ADR-010 — POS Terminal Idempotency Scope V1 (Sequential-Retry Coverage, Documented Concurrent-Race Boundary)

**Status:** Accepted (scope: `RingUpSaleUseCase`/`CreatePosReturnUseCase`'s
idempotency contract as actually shipped — a pre-check plus a real unique
constraint plus a translated-conflict re-fetch, identical in shape to
`CapturePaymentUseCase`'s own contract; not a claim-before-effect
mechanism)

**Context**

`docs/ROADMAP.md` §10's exit criterion for POS is explicit: "Reintentos de
terminal no duplican ventas/pagos." Every other idempotent write in this
codebase (`CapturePaymentUseCase`, ADR-004's outbox, ADR-008's inbox) uses
the same shape: a pre-check for the common case, and a real database
unique constraint (with a translated-conflict re-fetch) for a genuine
race. Building `RingUpSaleUseCase` the same way was the natural default —
but unlike a single-row write like `Payment`, ringing up a sale is a
multi-step orchestration (create a real `SalesOrder`, add lines, confirm
it — reserving real inventory, capture a real `Payment`, fulfill it —
issuing real stock) *before* the one row (`PosSale`) that actually carries
the idempotency key is ever written. This ADR makes explicit what that
shape does and does not guarantee once genuine concurrency is considered,
rather than leaving it as an implicit assumption inherited from the
single-row precedent.

**Decision**

1. **The idempotency pre-check runs once, at the very top of
   `RingUpSaleUseCase`/`CreatePosReturnUseCase`, before any Sales/Payments
   call.** This fully covers the realistic "terminal retry" scenario the
   exit criterion is actually about: a POS terminal that sends a request,
   loses the response to a timeout, and resends the *same* request
   sequentially. The second call finds the first's `PosSale` already
   committed and returns it as a replay — verified against real Postgres
   with 5 genuinely concurrent `ringUpSale` calls sharing one
   `idempotencyKey` all converging on the same `PosSale.id`
   (`apps/api/test/integration/pos.integration-spec.ts`).
2. **A real `@@unique([tenantId, companyId, idempotencyKey])` constraint
   on `pos_sales`/`pos_returns`, plus a translated-conflict re-fetch, is
   what actually enforces "exactly one `PosSale` row ever survives"** —
   the same claim/re-fetch shape `PrismaPaymentRepository.save` already
   established, applied here as the second, database-level layer behind
   the application-level pre-check.
3. **What is explicitly *not* guaranteed, and is documented rather than
   silently assumed**: under a genuinely *simultaneous* multi-request race
   (not a resend, but truly overlapping calls — e.g. a buggy client firing
   duplicate requests, or a double-tap faster than the UI can disable the
   button), every racer can pass the pre-check before any of them commits.
   Each then independently creates and fulfills its own real `SalesOrder`
   (and, if using `CapturePaymentUseCase`'s own race-safe path, converges
   on one real `Payment` — but a *distinct* `SalesOrder` per racer
   regardless). Only one `PosSale` row ultimately wins the unique
   constraint; the "losing" `SalesOrder`s remain real or, if
   `RingUpSaleUseCase`'s own compensating cancel runs on the P2002 path,
   inconsistently so — this ADR does not attempt to reconcile that
   further. This is a real, load-bearing gap, not a theoretical one: it
   was found and characterized during this same session's own design
   review, not by a bug report.
4. **A fuller fix — claiming the idempotency key in its own row *before*
   any Sales/Payments call, mirroring the inbox's claim-then-effect
   pattern (ADR-008) — is deliberately deferred**, not built in this
   phase. It would require either a schema change (a nullable
   `salesOrderId`/`paymentId` on `PosSale` until the flow completes, or a
   separate claim table) or reusing the inbox mechanism for a purpose it
   was not designed for (consuming a domain *event* exactly-once, not
   claiming an arbitrary synchronous HTTP request's idempotency key) —
   see "Alternatives considered" below for why both were rejected for
   this slice.

**Consequences**

- The exit criterion is satisfied for the case that matters in practice —
  a POS terminal's own retry-after-timeout behavior, which is
  overwhelmingly sequential, not simultaneous, in real hardware and
  real network conditions.
- A genuinely concurrent double-submission (rare, but possible — a
  malfunctioning client, or a UI bug that fails to disable a button fast
  enough) can leave one or more real, fulfilled `SalesOrder`s with no
  `PosSale` referencing them, consuming real inventory and possibly
  capturing a real `Payment` that no cashier-facing screen will ever show.
  This requires manual operator reconciliation until a claim-based fix is
  built. Documented in `docs/SECURITY.md` "POS" and in
  `RingUpSaleUseCase`'s own docstring, not hidden.
- Any future fix must decide between the schema-change and
  inbox-reuse approaches named above; neither is authorized by this ADR.

**Alternatives considered**

- **A claim-before-effect row, written in its own short transaction before
  any Sales/Payments call**: the architecturally "correct" fix, but it
  requires `PosSale` to exist in a genuinely incomplete state (no
  `salesOrderId`/`paymentId` yet) or a separate claim table — a real
  schema and control-flow change deferred to a future session once (or
  if) the concurrent-race scenario is shown to matter in practice, per
  MASTER_SPEC §59/§93's "no sobrearquitectura" — building it now, with no
  evidence a real POS terminal ever fires genuinely simultaneous
  duplicate requests, would be exactly the premature machinery this
  codebase has consistently avoided elsewhere.
- **Reusing the inbox (`InboxMessage`/`consumeIdempotently`, ADR-008)
  as a generic claim primitive for this synchronous HTTP flow**: rejected
  — the inbox exists specifically to make consuming a *domain event*
  exactly-once, inside `apps/worker`; forcing a synchronous request
  handler inside `apps/api` to "claim" against it would be reusing the
  right-shaped tool for the wrong problem, and `apps/api` deliberately
  does not depend on `@erp/events`' consumer-side pieces at all (ADR-004's
  amendment: "`apps/api` depends on `@erp/events` only for
  `appendOutboxMessage`/`OutboxMessage`").
- **Leaving the limitation completely undocumented**, matching how a
  single-row write's idempotency contract is usually described without
  needing this level of caveat: rejected — because `RingUpSaleUseCase`'s
  multi-step orchestration genuinely changes the guarantee's shape
  compared to `CapturePaymentUseCase`'s single-row precedent, silently
  inheriting that precedent's description would have overstated what is
  actually verified.

---

## ADR-011 — Commerce Checkout Payment/Fulfillment and Idempotency Model V1

**Status:** Accepted (scope: `CheckoutUseCase`'s payment/fulfillment
handling and its cart-keyed idempotency, as actually shipped; not a future
credentialed-gateway integration or an automatic fulfillment pipeline)

**Context**

Phase 7A (Commerce Engine, `docs/ROADMAP.md` §11) needed a checkout flow
that turns a public, anonymous shopping cart into a real order. Two
questions had no existing answer in this codebase: (1) how does an
anonymous, unauthenticated checkout pay, given ADR-009 already ruled out
any credentialed payment gateway (no Stripe/PayPal — no real credentials
exist in this environment, and fabricating one would violate MASTER_SPEC
§90 far more seriously than any other simulation gap already accepted
here); and (2) what is the idempotency contract for a checkout request,
given POS's own `RingUpSaleUseCase` (ADR-010) already established a
pre-check-plus-unique-constraint pattern for a structurally similar
multi-step orchestrator — is that pattern simply reusable as-is, or does
Commerce's checkout have a genuinely different shape worth exploiting?

**Decision**

1. **No credentialed payment method exists for storefront checkout —
   only the same `BANK_TRANSFER` adapter ADR-009 already built.**
   `CheckoutUseCase` accepts an optional `paymentReference` string. If
   provided, it is capture immediately via the existing
   `CapturePaymentUseCase`/`BankTransferPaymentGatewayAdapter` (unchanged
   from ADR-009 — Commerce added no new adapter). If omitted, checkout
   still succeeds: the resulting `CommerceOrder.paymentId` is `null`, and
   the real `SalesOrder` is left `CONFIRMED` — reservation made, payment
   pending. A staff member captures payment later through the exact same
   `POST /api/v1/payments/capture` screen already built for every other
   channel (Sales/POS) — no new payment-review UI was built for Commerce
   specifically, because none was needed: a `CommerceOrder`'s `SalesOrder`
   is, to Payments, indistinguishable from any other channel's order.
2. **Fulfillment is never automatic.** Unlike POS's `RingUpSaleUseCase`
   (which fulfills — issues real stock — in the same call, because an
   in-person sale is physically handed over immediately), `CheckoutUseCase`
   never calls `FulfillSalesOrderUseCase`. An online order is routinely
   picked/packed/shipped hours or days after payment clears; forcing
   immediate fulfillment would misrepresent that real-world timing.
   Fulfillment happens later, through Sales' own existing
   `POST /api/v1/sales/orders/:id/fulfill` — again, no new endpoint.
3. **Idempotency is keyed by the Cart's own id, not a caller-supplied
   string.** POS's `idempotencyKey` (ADR-010) has to be caller-supplied
   because a POS terminal can ring up many independent sales against the
   same shift with no other natural per-transaction identity. A Commerce
   checkout is different: `Cart.convert()` only ever succeeds once (`OPEN
   -> CONVERTED`, never reversible), so the cart itself already **is** the
   one-to-one dedup key for its resulting order — no client-generated
   idempotency key is required at all. `CommerceOrder` has a real
   `@@unique([tenantId, cartId])` constraint enforcing this at the
   database level; `CheckoutUseCase` pre-checks
   `findByCartId` for the common sequential-retry case (a shopper's
   browser resubmitting "place order" after a lost response) and reacts to
   the constraint's own P2002 violation
   (`CommerceOrderIdempotencyConflictError`, translated by
   `PrismaCommerceOrderRepository.save`) for a genuine concurrent race —
   the exact same two-layer shape ADR-010 already established for POS,
   just with a structurally cleaner key. Verified against real Postgres
   with 5 genuinely concurrent checkout calls sharing one `cartId`: all 5
   resolve successfully, all 5 converge on the same `CommerceOrder.id`,
   and exactly one row exists at the end
   (`apps/api/test/integration/commerce.integration-spec.ts`).
4. **The same residual concurrency window ADR-010 documented for POS
   applies here too, inherited rather than re-litigated.** The
   idempotency pre-check runs once, at the top of `CheckoutUseCase`,
   before any Sales/Payments call — under a genuinely simultaneous
   multi-request race (not a sequential retry, which is fully covered),
   each racer can independently create its own real `SalesOrder` before
   any of them commits the final `CommerceOrder` row. What is guaranteed,
   and what was actually verified, is that exactly one `CommerceOrder`
   survives and every caller's result converges on it — not that only one
   `SalesOrder` was ever created. A fuller fix (claiming the cart before
   any Sales/Payments call) remains deliberately out of scope for this
   phase, for the same reasons ADR-010 gave for POS.
5. **A guest customer is resolved by email, not created fresh every
   checkout.** `Customers`' new `FindCustomerByEmailUseCase` (added this
   phase) is tried first; only if no match exists does `CheckoutUseCase`
   create one via the existing `CreateCustomerUseCase`, with a generated
   code (`GUEST-<random>`). This required lowercasing `Customer.email` at
   write time in `CreateCustomerUseCase`/`UpdateCustomerUseCase` (a real,
   small fix made during this phase — email was previously stored
   verbatim in whatever case a caller typed, which would have silently
   defeated case-insensitive repeat-guest matching).
6. **The checkout's own actor for Inventory's `createdByUserId` (a real,
   non-null column with no exception for anonymous callers) is a
   seeded, non-interactive "Storefront System" `User` row**, created via
   `StorefrontSystemUserSeeder` — the same code-owned, upserted-at-boot
   pattern already used for the permission catalog. It never receives a
   `UserCredential`, so it can never authenticate; `CheckoutUseCase` is
   its only caller. This was necessary because every other inventory
   mutation in this codebase is attributed to a real, logged-in staff
   member — a public checkout genuinely has none, and relaxing the
   `NOT NULL` constraint for every other module too was rejected as a far
   larger, unjustified change.

**Consequences**

- A `CommerceOrder` with `paymentId: null` is a completely normal, expected
  state — not an error condition — and both the admin "Pedidos" list and
  any future Next.js storefront confirmation page must present it
  honestly ("pago pendiente de confirmación"), never implying a charge
  succeeded when it did not.
- Adding a real credentialed gateway later (the moment real provider
  credentials exist) is additive: a new `PaymentGateway` adapter,
  `CheckoutUseCase` passing a chosen method through — no schema change to
  `CommerceOrder` is required, since `paymentId` is already nullable and
  already models "captured vs. not yet".
- No automatic-fulfillment pipeline, no shipping-provider integration, no
  webhook-based payment confirmation exist yet — all remain real,
  documented gaps (`docs/SECURITY.md` "Commerce"), not simulated.

**Alternatives considered**

- **Fabricating a fake "credit card" capture path** that always succeeds:
  rejected outright, for the same MASTER_SPEC §90 reason ADR-009 already
  gave, applied with equal force to an anonymous, public-facing checkout.
- **Requiring `paymentReference` and rejecting checkout without one**:
  rejected — it would make "buy now, pay via bank transfer you haven't
  sent yet" impossible, a real and common e-commerce flow (place order,
  then transfer, then staff confirms), not a corner case to disallow.
- **Auto-fulfilling at checkout, mirroring POS**: rejected — POS's
  same-moment fulfillment is correct specifically because an in-person
  sale physically hands over goods immediately; applying that assumption
  to an online order would misrepresent real warehouse timing and could
  issue stock for an order that later needs to be cancelled before it
  ever ships.
- **A caller-supplied idempotency key, mirroring POS exactly**: rejected
  as unnecessary complexity — Commerce's own `Cart` already provides a
  cleaner, structurally guaranteed one-to-one key that requires no
  cooperation from the client at all, unlike POS's terminal-generated key.

---

## ADR-012 — Accounting Integration Scope V1 (Manual Engine and Idempotent Posting Port, No Automatic Cross-Module Postings)

**Status:** Accepted (scope: the full, real, tested manual double-entry
engine — Chart of Accounts, Fiscal Periods, `CreateJournalEntryUseCase`/
`ReverseJournalEntryUseCase`, Trial Balance/Account Ledger reports, and the
idempotent source-linked posting mechanism itself; explicitly **not** any
automatic journal-entry posting triggered by Sales, Payments, Purchasing or
Inventory events)

**Context**

`docs/ROADMAP.md` §12 lists Accounting's deliverables as the Chart of
Accounts, Fiscal Periods, Journal Entries/Lines and Ledger, double-entry
invariants, posting/reversal, reconciliation and first financial
statements, **and** "Mapeos de integración desde Sales, Payments,
Purchasing e Inventory" — with an exit criterion that "reprocesar eventos
de origen no duplica postings". Unlike every prior module built this
session (Commerce's checkout, POS's ring-up), where the cross-module
orchestration itself *was* the deliverable, wiring Sales/Payments/
Purchasing/Inventory events to real journal entries requires real,
jurisdiction-specific accounting policy this codebase has no basis to
invent: which Chart of Accounts account a given product category's
revenue posts to, whether recognition happens on order confirmation or on
fulfillment, cash vs. accrual basis, how partial payments/returns/
reversals net against already-posted entries. Every other "don't simulate"
decision in this codebase (ADR-009's payment gateways, ADR-011's
fulfillment model) drew the line at fabricating behavior with no real
credentials or policy behind it; automatic accounting postings are that
same problem at higher stakes, since a wrong posting corrupts real
financial statements and potential tax filings, not just a UI screen.

**Decision**

1. **The full manual double-entry engine is built completely, exactly as
   `docs/ROADMAP.md` §12 specifies, with nothing simulated.** `Account`
   (Chart of Accounts, `type` deriving `normalBalance`), `FiscalPeriod`
   (`OPEN -> CLOSED`, terminal — see the entity's own docstring for why
   reopening is deliberately not built), `JournalEntry`/`JournalEntryLine`
   (append-only, `CreateJournalEntryUseCase` enforcing the line-level
   "exactly one of debit/credit positive" invariant in the domain and the
   entry-level "sum(debit) === sum(credit)" invariant in the application
   layer), `ReverseJournalEntryUseCase` (posts a brand-new balanced entry
   with every line swapped, never edits the original), and
   `GetTrialBalanceUseCase`/`GetAccountLedgerUseCase` (both summed fresh
   from the raw ledger on every call, never a stored running balance). A
   real staff member can open a period, build a real Chart of Accounts,
   and post/reverse real manual entries today — this is a genuinely usable
   accounting module, not a stub waiting for integration.
2. **The idempotent source-linked posting *mechanism* is built and
   verified, ahead of any real caller** — `CreateJournalEntryUseCase`
   accepts an optional `(sourceType, sourceId)` pair, pre-checks it for the
   common sequential-retry case, and a real
   `@@unique([tenantId, companyId, sourceType, sourceId])` constraint (with
   Postgres's own NULL-is-distinct semantics letting unlimited manual
   entries coexist with `sourceType`/`sourceId` both null) backs it for a
   genuine concurrent race — verified against real Postgres with 5
   simultaneous posting requests sharing one simulated source key,
   converging on exactly one entry. This directly and honestly satisfies
   the exit criterion "reprocesar eventos de origen no duplica postings"
   for the mechanism itself, the same "build and verify the mechanism
   before any real consumer exists" precedent ADR-008's inbox already
   established for exactly this reason.
3. **No automatic posting is wired from Sales, Payments, Purchasing or
   Inventory in this phase.** None of those modules call
   `CreateJournalEntryUseCase`; `AccountingModule` has zero cross-module
   imports of any kind — the only business module built so far with none.
   Wiring a real integration mapping (e.g. "a captured `Payment` posts a
   debit to Cash and a credit to Accounts Receivable") requires a real
   chart-of-accounts convention and revenue-recognition policy that varies
   by business and jurisdiction; inventing one and shipping it as if it
   were correct accounting practice would be a materially worse
   "simulation" than any other gap already accepted in this codebase,
   because it would silently corrupt a real set of books rather than
   simply doing nothing.
4. **Reconciliation and "first financial statements" (also named in
   `docs/ROADMAP.md` §12) are limited to what the Trial Balance already
   provides** — a summed, balance-confirmed view of every account's
   activity. A formal Balance Sheet/Income Statement (grouping accounts by
   type into a presented statement, handling retained-earnings roll-forward
   across periods) is not built; the Trial Balance's `accountType` field on
   every row is enough for a caller to derive one, but this slice does not
   do that derivation itself.

**Consequences**

- A real business cannot yet get automatic books from using Sales/
  Payments/Purchasing/POS/Commerce — every posting today is a manual
  action by whoever operates Accounting. This is a real, visible gap,
  not a hidden one: `docs/SECURITY.md` "Accounting" and
  `docs/PROJECT_STATE.md` name it explicitly.
- Wiring a real integration later is additive and low-risk to what
  already exists: a future module-specific mapping calls
  `CreateJournalEntryUseCase` with a real `sourceType`/`sourceId` (e.g.
  `"SALES_ORDER"`/order id) exactly the way the verification test already
  simulates — no change to the engine itself, only a new caller.
- Financial statements beyond the Trial Balance are deferred; nothing in
  the schema (`Account.type`, `JournalEntryLine.debit`/`credit`) blocks
  building them later purely as new read-side queries over the same
  append-only ledger.

**Alternatives considered**

- **Inventing a plausible-looking Chart of Accounts mapping and wiring it
  automatically** (e.g. every `SalesOrder` confirmation posts a fixed
  Revenue/Receivable pair): rejected outright — this is exactly the kind
  of simulated business behavior MASTER_SPEC §90 prohibits, and here the
  consequence of getting it wrong is a corrupted set of real books, a
  materially higher-stakes failure than any other simulation already
  avoided in this codebase (ADR-009's payment gateways, ADR-011's
  fulfillment model).
- **Deferring the entire Accounting module until a real integration
  policy exists**: rejected — the manual engine itself (Chart of Accounts,
  Fiscal Periods, balanced posting/reversal, Trial Balance) is real,
  independently valuable functionality `docs/ROADMAP.md` §12 asks for
  regardless of automatic integration, the same reasoning ADR-009 used to
  ship `CASH`/`BANK_TRANSFER` now rather than wait for a credentialed
  gateway.
- **Building the idempotent posting port but leaving it unverified until a
  real caller exists**: rejected — verifying it now, under simulated
  concurrency, is strictly safer than discovering a race condition only
  once real money-relevant postings depend on it; mirrors ADR-008's own
  precedent exactly.

---

## ADR-013 — CRM Sales-Event Consumption Scope V1 (No Speculative Consumer Ahead of a Real Sales-Side Producer)

**Status:** Accepted (scope: the full, real, tested CRM engine — Lead,
Pipeline/PipelineStage, Opportunity, Activity, and lead-to-customer
conversion through the Customers module's own public contract; explicitly
**not** any handler that consumes a Sales domain event, since no such
event exists yet)

**Context**

`docs/ROADMAP.md` §13 lists CRM's deliverables as leads/opportunities/
activities/pipelines, an explicit relationship with Customers that never
duplicates ownership, consent/privacy, and "Eventos de Sales consumidos de
forma idempotente" (Sales events consumed idempotently) — a direct echo of
MASTER_SPEC §11's own example ("OrderPaid puede provocar: ... CRM
actualizar comportamiento del cliente"). Unlike Accounting's idempotent
posting port (ADR-012), which is a genuinely generic, reusable mechanism
worth building ahead of any real caller (the same precedent ADR-008's
inbox already established for exactly that reason), a Sales-event
*consumer* is not generic — it is tied to one specific event's payload
shape. And no module in this codebase has ever published a real business
domain event through the outbox: `tenancy.tenant.provisioned.v1` (Tenants,
ADR-004) remains the only real producer to this day; every other
cross-module interaction in this codebase — Sales→Inventory, POS→Sales/
Payments, Commerce→Catalog/Customers/Sales/Payments, Purchasing→Inventory
— is a direct, synchronous use-case call, never an outbox event. Wiring a
real `sales.order.confirmed.v1` (or similar) producer would require
extending `ConfirmSalesOrderUseCase`'s persistence boundary — today
`SalesOrderRepository.save()` has no shared-transaction parameter, so
appending an outbox message atomically with the order's own status change
(the same non-negotiable atomicity ADR-004 established for every existing
producer) would mean changing that repository's interface and both its
implementations, a real, separate, cross-cutting change to an
already-shipped, already-tested module (Phase 4).

**Decision**

1. **The full CRM engine is built completely, exactly as `docs/ROADMAP.md`
   §13 specifies, with nothing simulated.** `Lead` (its own contact fields
   until real conversion, `consentMarketing`/`consentedAt` for the
   "Consent/privacy" deliverable), `Pipeline`/`PipelineStage` (real,
   configurable pipelines — the "pipeline configurable" exit criterion),
   `Opportunity` (linked to `Customer`/`Lead` without ever duplicating
   either's ownership), and `Activity` (logged against exactly one of a
   lead, an opportunity, or a real customer). `ConvertLeadUseCase` is the
   one real, working answer to "Relación explícita con Party/Customers sin
   duplicar ownership" — it resolves an existing `Customer` by email
   (mirroring Commerce's own guest-checkout resolution, `FindCustomerByEmailUseCase`)
   or creates one fresh through the Customers module's real public
   contract, never a shadow copy of customer data.
2. **No handler consumes a Sales domain event in this phase, because no
   Sales domain event exists to consume.** Building a speculative consumer
   for an invented event schema — guessing at what fields
   `sales.order.confirmed.v1` would carry, with no real producer to
   validate the guess against — would be exactly the premature machinery
   MASTER_SPEC §59/§93 warns against, and structurally different from
   ADR-008's inbox precedent: the inbox is generic infrastructure usable by
   any future consumer of any future event; a handler hard-coded to one
   unpublished event's assumed shape is not reusable at all if that
   assumption turns out wrong once a real producer is finally built.
3. **`Activity.relatedCustomerId` is still real, justified functionality
   today, independent of any event system** — a staff member can log a
   call, email, or note directly against a real `Customer` right now,
   through `POST /api/v1/crm/activities`, with no dependency on Sales
   publishing anything. The field was not added speculatively for a future
   event handler; it is a genuinely useful capability on its own.
4. **`CreateActivityUseCase` is exported from `CrmModule`** even though
   nothing calls it cross-module yet — the same "export ahead of a
   documented future consumer" precedent already used throughout this
   codebase (e.g. `RecordReceiptUseCase` before Purchasing existed,
   `ConfirmSalesOrderUseCase` before POS/Commerce existed) — so that once a
   real Sales-side producer is built, wiring the consumer is additive: a
   new handler in `apps/worker`, no change to CRM itself.

**Consequences**

- A real business using this CRM today gets a complete, useful pipeline
  and lead-management tool, and can log customer activity by hand — but
  gets no automatic "a sale happened, log it" behavior. This is a real,
  visible gap, not a hidden one: `docs/SECURITY.md` "CRM" and
  `docs/PROJECT_STATE.md` name it explicitly.
- Wiring the real integration later requires two coordinated changes, not
  one: (a) extending `SalesOrderRepository.save()` (or an equivalent
  atomic write path) so `ConfirmSalesOrderUseCase` can append a real
  outbox message in the same transaction as the order's own status change,
  and (b) a new `apps/worker` handler consuming it via `consumeIdempotently`
  (ADR-008) to call `CreateActivityUseCase`. Neither is authorized by this
  ADR; both remain real future scope.
- No other module in this codebase gained a new outbox producer either —
  this decision does not change the "only Tenants publishes a real event"
  status quo established since ADR-004.

**Alternatives considered**

- **Inventing a plausible `sales.order.confirmed.v1` payload and building
  a handler against it anyway**, planning to adjust the handler once a
  real producer exists: rejected — a handler tested only against a
  self-invented event is not meaningfully verified against anything real,
  and the adjustment-later plan has no more guarantee of happening than
  simply building it correctly once, later, against a real producer.
- **Retrofitting `ConfirmSalesOrderUseCase` to publish a real event in this
  same phase**, accepting the cross-cutting change to Sales: rejected for
  this pass — Sales (Phase 4) is an already-shipped, already-tested module
  with real production-shaped integration tests (concurrent capture races,
  compensating-transaction reservations); touching its repository
  interface as a side effect of a CRM roadmap item, rather than as its own
  deliberately scoped and tested change, is a materially larger risk than
  this ADR's own scope warrants. A future, dedicated increment — "wire
  Sales' first real outbox event" — is the right size for that change.
- **Skipping `Activity.relatedCustomerId` entirely** since no automatic
  consumer uses it yet: rejected — it is real, independently useful
  functionality today (logging a call against a customer with no open
  deal), not scaffolding for a feature that doesn't exist.

---

## ADR-014 — Manufacturing Costing and Traceability Scope V1 (No Cost Calculation Ahead of an Approved Costing Model)

**Status:** Accepted (scope: the full, real, tested Manufacturing engine —
Bill of Materials with versioning, Production Orders with material
requirements/operations/issue/return/finished-goods receipt, all posted
through Inventory's real ledger; explicitly **not** any computed cost
field, and explicitly **not** lot/serial traceability)

**Context**

`docs/ROADMAP.md` §14 lists Manufacturing's deliverables as BOM with
versioning/validity, Production Orders/operations/material requirements,
issue/consume/return/finished-goods through the Inventory ledger, and then
two deliberately conditional items in the same list: "Costing model
aprobado antes de calcular costos" (a costing model *approved* before any
cost is calculated — the roadmap itself gates this, it does not simply ask
for a costing engine) and "Lot/serial traceability si el mercado lo
requiere" (only if the market requires it — not an unconditional
requirement). No costing model has been approved anywhere in this
codebase's history: Accounting (Phase 8, ADR-012) explicitly deferred all
automatic postings and never established a chart-of-accounts convention
for inventory/COGS accounts; Catalog's `Product.baseCost`/
`ProductVariant.cost` are simple, uncontextualized decimal fields with no
stated valuation method (standard, actual, FIFO, weighted-average) behind
them. Lot/serial tracking has the same status: Inventory (Phase 3) already
deferred it explicitly (`docs/SECURITY.md` "Inventory" Known limitations),
and nothing built since has changed that.

**Decision**

1. **The full Manufacturing engine is built completely, exactly as
   `docs/ROADMAP.md` §14's unconditional items specify, with nothing
   simulated.** `BillOfMaterial`/`BillOfMaterialComponent` (versioned,
   immutable once created — a revision is a new `version` row, never an
   edit), `ProductionOrder` (`DRAFT -> CONFIRMED -> CLOSED`, `CANCELLED`
   only from `DRAFT`/`CONFIRMED` and only before any real material
   movement or finished-goods receipt exists),
   `ProductionOrderMaterial` (requirements snapshotted from the BOM at
   creation, scaled by `quantityPlanned` — never re-derived from a BOM
   that might change later), `ProductionOrderMaterialMovement`
   (real `ISSUE`/`RETURN` events, each posting a genuine Inventory
   ledger movement via `RecordIssueUseCase`/`RecordReturnUseCase`,
   `referenceType: "PRODUCTION_ORDER"`), `ProductionOrderOperation`
   (simple named process steps), and
   `ProductionOrderFinishedGoodsReceipt` (genuinely partial receipts of
   the finished good, each posting a real `RecordReceiptUseCase` call).
   Every quantity that moves — issued, returned, received — moves through
   Inventory's real ledger; nothing in this module ever mutates a balance
   directly, satisfying `docs/ROADMAP.md` §14's exit criterion ("ninguna
   producción altera stock sin ledger") literally, not approximately.
2. **No cost field is calculated anywhere in this module.** `BillOfMaterial`
   carries no `estimatedCost`; `ProductionOrder` carries no
   `actualCost`/`totalMaterialCost`; no use case sums
   `Product.baseCost`/`ProductVariant.cost` across a BOM's components.
   Doing so — even a "simple" standard-cost estimate — would require
   answering questions this codebase has no basis to answer: is `baseCost`
   itself a defensible input for a manufacturing cost (it was designed for
   Catalog's own margin display, MASTER_SPEC §19, not costing), does the
   estimate include labor/overhead, and — most importantly — is there
   anywhere real for that number to go once calculated (Accounting has no
   automatic-posting mechanism connected to *any* module yet, ADR-012).
   Calculating a cost that then has nowhere correct to post, or that
   silently encodes an unapproved valuation policy, would be a materially
   worse "simulation" than any other gap already accepted in this
   codebase (MASTER_SPEC §90) — the same reasoning ADR-012 already applied
   to Accounting's own integration scope, inherited here directly because
   `docs/ROADMAP.md` §14 names the precondition explicitly ("aprobado
   antes de calcular").
3. **No lot/serial/expiration traceability.** `ProductionOrderMaterialMovement`/
   `ProductionOrderFinishedGoodsReceipt` carry a plain quantity, the same
   granularity Inventory's own ledger already provides — no lot or serial
   number is captured anywhere in Manufacturing, inheriting Inventory's
   own pre-existing gap (Phase 3) rather than building a parallel,
   inconsistent tracking mechanism on top of a ledger that doesn't support
   it. `docs/ROADMAP.md` §14's own phrasing ("si el mercado lo requiere")
   makes this a real, conditional deliverable this codebase has no
   evidence yet requires — the same discretion already exercised for
   Inventory itself.
4. **Manufacturing's finished good and every BOM component must have
   `Product.trackInventory === true`**, validated by
   `ResolveManufacturingProductTargetUseCase` — mirroring exactly how
   Inventory itself gates every real movement on this flag
   (`ProductInventoryNotTrackedError`). No new `Product.manufacturable`
   flag was added: `sellable`/`purchasable` already exist on `Product`
   as MASTER_SPEC §19 metadata but are never actually enforced anywhere
   in this codebase (verified by inspection — neither Sales nor
   Purchasing gates on them); adding a third, equally-unenforced
   `manufacturable` flag would be exactly the kind of dead metadata
   MASTER_SPEC §59/§93 warns against. `trackInventory` is the one flag on
   `Product` that is genuinely, structurally enforced, so it is the one
   Manufacturing reuses.

**Consequences**

- A real business using Manufacturing today gets a complete, genuinely
  ledger-backed production workflow — BOM, orders, material consumption,
  returns, finished goods — but gets no cost visibility into what a
  production run actually cost. This is a real, visible gap, not a hidden
  one: `docs/SECURITY.md` "Manufacturing" and `docs/PROJECT_STATE.md` name
  it explicitly.
- Adding costing later is additive, not a rework: `BillOfMaterialComponent`
  already carries `quantityPerUnit`, and `ProductionOrderMaterialMovement`
  already carries exact issued/returned quantities — a future costing
  engine reads from data that already exists, once a real valuation model
  and a real Accounting integration point are both approved.
- No lot/serial traceability exists anywhere in this codebase yet,
  Manufacturing included — a future, dedicated increment to Inventory
  (adding lot/serial to the ledger itself) is the correct place to build
  it once, rather than each consuming module inventing its own partial
  version.

**Alternatives considered**

- **Calculating a "standard cost" estimate from `Product.baseCost`/
  `ProductVariant.cost` summed across BOM components**, presented as
  informational-only with no Accounting posting: rejected — even framed
  as "just an estimate", it would silently encode a valuation policy
  (which cost field, at what point in time, ignoring labor/overhead) that
  `docs/ROADMAP.md` §14 explicitly says needs approval first; a number
  that looks like real costing but rests on an unapproved, arbitrary
  choice is worse than no number at all, since it invites being trusted.
- **Building lot/serial tracking scoped only to Manufacturing** (e.g. a
  `lotNumber` string on `ProductionOrderFinishedGoodsReceipt` alone,
  without touching Inventory's own ledger): rejected — it would let a
  finished good be "lot-tracked" only for the one movement type
  Manufacturing itself creates, while every other Inventory movement
  (sales issue, purchase receipt, transfer) for that same product remains
  untracked — a fragmented, inconsistent traceability story worse than
  having none, and a real integrity gap dressed up as a feature.
- **Deferring Manufacturing entirely until a costing model exists**:
  rejected — the ledger-backed production workflow (BOM, orders,
  materials, operations, finished goods) is real, independently valuable
  functionality `docs/ROADMAP.md` §14 asks for regardless of costing, the
  same reasoning ADR-009 used to ship `CASH`/`BANK_TRANSFER` payments now
  rather than wait for a credentialed gateway, and ADR-012 used to ship
  Accounting's manual engine now rather than wait for automatic postings.
