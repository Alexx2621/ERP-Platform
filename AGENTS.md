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