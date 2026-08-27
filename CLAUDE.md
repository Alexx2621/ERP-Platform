# Claude Code Instructions

This repository contains a modular enterprise SaaS platform. Claude is the
sole development owner of the ERP and is responsible for delivering coherent,
validated vertical slices across the entire system.

Always use repository documentation as the source of truth:

@docs/MASTER_SPEC.md
@docs/ARCHITECTURE.md
@docs/PROJECT_STATE.md
@docs/WORK_QUEUE.md
@docs/DECISIONS.md
@docs/tasks/CURRENT.md

Read the relevant domain documents before changing that domain, especially
`docs/DATABASE.md`, `docs/SECURITY.md`, `docs/MULTITENANCY.md`,
`docs/EVENTS.md`, `docs/PLUGINS.md` and `docs/ROADMAP.md`.

## Sole ERP ownership

Claude owns:

- product-aligned technical planning and architecture;
- backend, frontend, UI/UX and the Design System;
- domain modeling, business rules and module boundaries;
- PostgreSQL, Prisma, migrations and data integrity;
- authentication, authorization, security and multi-tenancy;
- events, outbox/inbox, workers, files, notifications and integrations;
- REST API, OpenAPI, SDKs and API clients;
- unit, integration, E2E, security and resilience testing;
- Docker, CI/CD, observability and deployment preparation;
- documentation, project state, backlog, Git integration and releases.

Ownership is end-to-end. Do not defer a required frontend, test, SDK,
documentation or integration change merely because it belonged to Codex under
the former collaboration model.

## Operating model

Before starting or continuing work:

1. Confirm the current branch and clean/known working-tree state.
2. Read `docs/WORK_QUEUE.md` and `docs/PROJECT_STATE.md`.
3. Continue the highest-priority non-blocked ERP item.
4. Read all specifications relevant to that item.
5. Inspect the existing implementation and schema.
6. Deliver the full vertical slice required by the acceptance criteria.

Do not maintain separate Claude and Codex queues. Do not wait for routine
handoffs. Remove completed work from the active queue, preserve concise useful
history, and continue automatically with the next non-blocked item.

## Optional Codex assistance

Codex is optional and may be used only for an explicitly assigned, bounded and
isolated task. Claude remains accountable for the result.

When assigning such a task, define the objective, allowed scope, base/delivery
branch, acceptance criteria and validation. Review the result for architecture,
security, tenant isolation, contracts, migrations and tests before integration.
Codex must not choose subsequent ERP work automatically. No standing handoff or
reciprocal work protocol exists.

The `ai/codex` branch is historical unless an explicit task says otherwise.
Past Codex contributions recorded in project documentation remain useful
technical history and do not imply current ownership.

## Git workflow

- `develop`: integrated source of truth.
- `ai/claude`: Claude's persistent ERP working branch.
- `main`: stable/release branch.
- Optional isolated work: a short-lived branch with explicit scope.

At the start of a new ERP block, synchronize `ai/claude` with
`origin/develop` using a safe fast-forward when possible. Work on
`ai/claude`, commit coherent validated blocks, push `origin/ai/claude`, then
integrate the validated result into `develop` and push `origin/develop`.
Never force-push shared branches.

Routine documentation-only corrections may be committed directly to
`develop` when explicitly requested; synchronize `ai/claude` immediately
afterward.

## Architecture

The platform follows:

- TypeScript;
- NestJS;
- PostgreSQL and Prisma;
- React + Vite for ERP Web;
- Next.js for future storefronts;
- Redis and BullMQ;
- Docker;
- Modular Monolith;
- Multi-Tenant Architecture;
- Event-Driven Architecture;
- API-First design.

Never alter architecture silently. Changes involving databases, queues,
frameworks, authentication, tenancy, plugin architecture, deployment or module
boundaries require an ADR or explicit approval unless already authorized by the
source-of-truth documentation.

## Implementation rules

- Controllers translate HTTP and call use cases; business logic belongs in
  application/domain layers.
- Domain code must not depend on NestJS, Prisma, HTTP, Redis or provider SDKs.
- Access other modules through explicit public contracts, never their tables or
  internals.
- Derive tenant/company authority from authenticated context, not request-body
  claims.
- Preserve tenant scope in repositories and database constraints.
- Use transactions for critical invariants and outbox publication when
  required.
- Use Decimal/numeric strategies for money and quantities, never floating
  point for critical calculations.
- Validate at transport, domain and database levels as appropriate.
- Keep audit, idempotency, permissions, errors and observability in scope from
  the start of each feature.
- Do not simulate integrations or successful operations.

## End-of-block protocol

For every stable implementation or integration block:

1. Run, when applicable:
   - `pnpm install --frozen-lockfile` if dependencies changed;
   - `pnpm lint`;
   - `pnpm typecheck`;
   - `pnpm test`;
   - `pnpm build`;
   - relevant integration, E2E, security and migration checks.
2. Inspect:
   - `git status`;
   - `git diff`;
   - `git diff --check`.
3. Update `docs/PROJECT_STATE.md` and `docs/WORK_QUEUE.md` when state or
   priorities changed.
4. Commit only relevant changes with a clear Conventional Commit message.
5. Push the working branch and integrate validated state into `develop`.
6. Push `develop` and confirm the remote relationship.
7. Continue with the next non-blocked queue item unless a real escalation is
   required.

## Completion report

When stopping, report:

### COMPLETED

What was implemented or integrated.

### VALIDATION

Commands and actual results, including anything not run.

### COMMITS

Relevant commit SHAs and messages.

### GIT STATE

State of `ai/claude`, `develop`, the working tree and remote push.

### PROJECT STATE

Current phase, meaningful progress and next non-blocked item.

### MY NEXT WORK

What Claude will continue automatically.

### NEEDS USER DECISION

Use exactly `NO`, or `YES` followed by the decision, options and
recommendation.

## User escalation

Stop and ask the user only for:

- major architectural decisions not resolved by current documentation;
- destructive migrations or potential data loss;
- major business-rule ambiguity;
- irreversible security-sensitive choices;
- conflicts that cannot be resolved safely.

Routine coding, frontend work, testing, merging, synchronization,
documentation and queue maintenance do not require user approval.
