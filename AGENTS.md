# Project Agent Instructions

This repository contains a modular enterprise SaaS platform.

## Required reading

Before implementing any task, read:

- docs/MASTER_SPEC.md
- docs/ARCHITECTURE.md
- docs/PROJECT_STATE.md
- docs/DECISIONS.md
- docs/tasks/CURRENT.md
- The task document assigned to you

## Architecture

The platform follows:

- TypeScript
- NestJS
- PostgreSQL
- Prisma
- React
- Next.js
- Redis
- BullMQ
- Docker
- Modular Monolith
- Multi-Tenant Architecture
- Event-Driven Architecture
- API-First design

## Collaboration

Claude Code and Codex may work on this repository simultaneously.

Before changing code:

1. Read docs/tasks/CURRENT.md.
2. Identify your assigned task.
3. Check file ownership.
4. Modify only files inside your assigned scope.

Never modify files assigned to another active task.

If your task requires modifying a file owned by another agent, stop and report the dependency.

## Shared files

Files marked as LOCKED or owned by another task must not be modified.

Examples:

- package.json
- pnpm-lock.yaml
- prisma/schema.prisma
- docker-compose.yml
- turbo.json
- tsconfig files

Ownership is defined in docs/tasks/CURRENT.md.

## Architecture changes

Never introduce major architectural changes silently.

Changes involving:

- databases
- queues
- frameworks
- authentication architecture
- tenancy strategy
- plugin architecture
- deployment architecture

require an ADR or explicit approval.

## Quality

Before declaring a task complete, run when available:

pnpm lint
pnpm typecheck
pnpm test

Always inspect:

git status
git diff

Do not include unrelated changes.

## Critical rules

Never:

- bypass tenant isolation
- put business logic inside controllers
- use floating point for money
- modify inventory without ledger traceability
- store secrets in source control
- expose credentials
- store payment-card data
- skip backend validation

## Autonomous Collaboration Protocol

Codex is a parallel development agent.

Claude is the Tech Lead and primary integration owner.

The source of truth is the repository documentation, especially:

- docs/MASTER_SPEC.md
- docs/ARCHITECTURE.md
- docs/PROJECT_STATE.md
- docs/WORK_QUEUE.md
- docs/DECISIONS.md
- specialized domain documentation related to the current task

### Permanent Git branches

- Codex works on: `ai/codex`
- Claude works on: `ai/claude`
- Integration branch: `develop`
- Stable/production branch: `main`

Codex must never merge directly into `develop` unless explicitly instructed by Claude as Tech Lead.

### Work selection

Before starting work:

1. Read `docs/WORK_QUEUE.md`.
2. Read `docs/PROJECT_STATE.md`.
3. Select the highest-priority non-blocked item assigned to Codex.
4. Read all relevant architecture/domain documentation.
5. Confirm that the work does not conflict with Claude-owned active files.

If the next Codex task is not blocked, continue automatically without waiting for user instructions.

### Preferred responsibilities

Codex should prioritize:

- ERP frontend
- UI
- Design System
- API clients
- SDK
- integration tests
- E2E tests
- CI/tooling
- documentation
- isolated backend work explicitly assigned in WORK_QUEUE

### End-of-block protocol

Whenever a stable block is complete:

1. Run:
   - `pnpm lint`
   - `pnpm typecheck`
   - relevant tests
   - `pnpm build`
   - integration/E2E tests when applicable

2. Inspect:
   - `git status`
   - `git diff`
   - `git diff --check`

3. Commit only relevant changes.

4. Push commits to:
   - `origin/ai/codex`

5. Do not merge directly into `develop`.

6. If more non-blocked Codex work exists in `WORK_QUEUE.md`, continue automatically.

7. If the next work depends on Claude or integration is required, stop and provide the handoff report below.

### Required completion report

Always finish a stopped block with:

#### COMPLETED
What was implemented.

#### VALIDATION
Commands/tests executed and results.

#### COMMITS
Commit SHA and message.

#### GIT STATE
- current branch
- working tree clean or not
- pushed to origin or not
- relation to develop if relevant

#### INTEGRATION NOTES
Anything Claude should verify during integration.

#### HANDOFF TO CLAUDE
Provide one concise, ready-to-copy instruction telling Claude exactly what to review, integrate, validate, or unblock next.

#### NEXT CODEX WORK
State the next Codex item after synchronization/integration.

#### NEEDS USER DECISION
Use exactly:
- `NO`
or
- `YES` followed by the decision required, options, and recommended option.

### Synchronization

When Codex needs the latest integration state:

1. ensure the worktree is clean;
2. `git fetch origin`;
3. merge `origin/develop` into `ai/codex`;
4. resolve only routine and safe conflicts;
5. rerun validations;
6. push `ai/codex`.

Do not force-push unless explicitly required and approved.