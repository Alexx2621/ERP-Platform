# Claude Code Instructions

This repository contains a modular enterprise SaaS platform.

Always use the repository documentation as the source of truth.

@docs/MASTER_SPEC.md
@docs/ARCHITECTURE.md
@docs/PROJECT_STATE.md
@docs/DECISIONS.md
@docs/tasks/CURRENT.md

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

Claude Code and Codex may work simultaneously using separate Git worktrees.

Before implementing:

1. Read docs/tasks/CURRENT.md.
2. Identify the Claude task.
3. Read that task specification.
4. Verify owned files.
5. Modify only the assigned scope.

Never modify another agent's active files.

If a dependency exists, report it instead of implementing another agent's responsibility.

## Architecture changes

Never alter architecture silently.

Important changes require documentation and approval.

## Completion

Before completing a task:

- review git diff
- review git status
- run lint
- run typecheck
- run relevant tests
- review security
- review tenant isolation

Summarize:

- changed files
- database changes
- API changes
- events
- permissions
- tests
- limitations