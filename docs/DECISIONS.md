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

3. **The outbox dispatcher runs inside the API process on a plain
   `setInterval`, not `@nestjs/schedule` or a dedicated `apps/worker`.**
   A periodic poll with no cron expressions or job-queue semantics did not
   justify a new dependency; `OutboxDispatcherScheduler` uses Nest's own
   `OnModuleInit`/`OnModuleDestroy` lifecycle to manage a native timer
   (`.unref()`'d so it never blocks process shutdown). Extracting this into
   a dedicated `apps/worker` process consuming the same outbox table is a
   distinct, later backlog item (`docs/WORK_QUEUE.md`) — the outbox schema
   and claim/lock semantics do not need to change when that happens, only
   which process runs the poll loop.

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
- Horizontal scaling of the API process runs one dispatcher per instance;
  this is safe (the locking guarantees no double-claim) but means dispatch
  capacity scales with API instance count rather than being independently
  tunable — acceptable until `apps/worker` exists.

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
