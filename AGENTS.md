# Project Agent Instructions

This repository contains a modular enterprise SaaS platform.

## Required reading

Before implementing any task, read:

- `docs/MASTER_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/PROJECT_STATE.md`
- `docs/WORK_QUEUE.md`
- `docs/DECISIONS.md`
- `docs/tasks/CURRENT.md`
- the relevant domain documentation and task specification, when one exists

Repository documentation is the source of truth. If documents disagree,
preserve product and architecture decisions and correct the operational
documentation before continuing.

## Development ownership

Claude is the sole development owner of the ERP. This ownership covers the
complete delivery lifecycle:

- architecture and domain modeling;
- backend, frontend, UI/UX and Design System;
- database schema, Prisma and migrations;
- security, authentication, authorization and tenant isolation;
- events, workers, integrations and infrastructure;
- API contracts, SDKs and clients;
- unit, integration, E2E and security testing;
- CI/CD, documentation, Git integration and roadmap maintenance.

There is no permanent split of responsibilities between Claude and Codex, no
parallel agent queue and no routine handoff protocol. Claude selects and
completes the highest-priority non-blocked ERP item in `docs/WORK_QUEUE.md`,
including every layer required to make that item production-ready.

## Optional isolated assistance

Codex may work in this repository only when the user or Claude explicitly
assigns a bounded, isolated task. An assignment must state:

- the objective and acceptance criteria;
- the allowed files or area;
- the base branch and delivery branch;
- required validation;
- whether Claude must review or integrate the result.

Codex must not select ERP work autonomously, claim an ongoing area, maintain a
separate backlog, or continue with another task after the assigned scope is
complete. If the task overlaps active Claude work or requires an architectural
decision, Codex stops and reports the dependency. The historical `ai/codex`
branch may be retained for traceability, but it is not part of the normal ERP
workflow.

## Git workflow

- `develop` is the integrated source of truth.
- `ai/claude` is Claude's persistent ERP working branch.
- `main` is the stable/release branch.
- Prefer short-lived `feat/*`, `fix/*`, `docs/*` or `chore/*` branches when a
  change benefits from separate review.
- Do not force-push shared branches.
- Integrate only validated, relevant commits into `develop`.
- Keep `ai/claude` synchronized with `develop` before starting the next block.

The former permanent two-agent flow (`ai/claude` + `ai/codex` with recurring
handoffs) is retired. Existing commits and historical references remain valid
technical history; they do not define current ownership.

## Work selection and execution

Before starting or continuing:

1. Confirm the working tree and current branch.
2. Read `docs/WORK_QUEUE.md` and `docs/PROJECT_STATE.md`.
3. Select the highest-priority non-blocked item.
4. Read the relevant architecture, security, database, event or plugin docs.
5. Define the complete vertical scope: domain, persistence, API, UI/client,
   tests, security and documentation as applicable.
6. Check current code and schema before modifying them.

Do not ask the user about routine implementation, testing, documentation or
safe Git operations. Escalate only decisions listed under User escalation.

## Architecture

The platform follows:

- TypeScript
- NestJS
- PostgreSQL
- Prisma
- React
- Vite for the ERP web application
- Next.js for future storefronts
- Redis
- BullMQ
- Docker
- Modular Monolith
- Multi-Tenant Architecture
- Event-Driven Architecture
- API-First design

Never introduce a major architectural change silently. Changes involving
databases, queues, frameworks, authentication, tenancy, plugins, deployment or
module boundaries require an ADR or explicit approval when the existing source
of truth does not already authorize them.

## Shared and high-risk files

No file is permanently owned by a separate agent. However, changes to shared or
high-risk files require deliberate review, including:

- `package.json` and `pnpm-lock.yaml`;
- `packages/database/prisma/schema.prisma` and migrations;
- `docker-compose.yml`;
- `turbo.json` and TypeScript configuration;
- CI workflows and shared contracts.

Inspect the full diff, keep migrations versioned, and do not include unrelated
changes.

## Quality and completion

Before declaring a stable block complete, run when available and relevant:

- `pnpm install --frozen-lockfile` when dependencies changed;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`;
- integration and E2E tests proportional to the change;
- `git diff --check`;
- `git status` and `git diff` review.

Update `docs/PROJECT_STATE.md` and `docs/WORK_QUEUE.md` in the same block when
the implementation changes project state or priorities. Report actual command
results and any validation not run.

## Critical rules

Never:

- bypass tenant isolation;
- put business logic inside controllers;
- use floating point for money;
- modify inventory without ledger traceability;
- store secrets or credentials in source control;
- store payment-card data;
- skip backend validation;
- expose internal errors or sensitive data;
- simulate a successful integration that is not connected.

## User escalation

Stop and ask the user only for:

- major architectural decisions not resolved by current documentation;
- destructive or irreversible migrations;
- potential data loss;
- material business-rule ambiguity;
- irreversible security-sensitive choices;
- conflicts that cannot be resolved safely.
