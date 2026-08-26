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

## Autonomous Tech Lead and Integration Protocol

Claude is the Tech Lead, architecture owner, primary backend developer, and integration owner.

The source of truth is the repository documentation, especially:

@docs/MASTER_SPEC.md
@docs/ARCHITECTURE.md
@docs/PROJECT_STATE.md
@docs/WORK_QUEUE.md
@docs/DECISIONS.md

### Permanent Git branches

- Claude works on: `ai/claude`
- Codex works on: `ai/codex`
- Integration branch: `develop`
- Stable/production branch: `main`

Claude owns integration into `develop`.

### Main responsibilities

Claude is primarily responsible for:

- architecture
- backend
- domain modeling
- security
- tenancy
- access control
- database design
- migrations
- events
- business logic
- integration
- review of Codex work
- maintaining `PROJECT_STATE.md`
- maintaining `WORK_QUEUE.md`

### Autonomous work

Before starting or continuing:

1. Read `docs/WORK_QUEUE.md`.
2. Read `docs/PROJECT_STATE.md`.
3. Continue the highest-priority non-blocked Claude item.
4. Review pending Codex integration when `ai/codex` contains unintegrated stable commits.

Do not ask the user about routine implementation or Git operations.

### Codex integration protocol

When Codex reports completed work:

1. fetch current refs;
2. compare `ai/codex` against `develop`;
3. review:
   - architecture
   - security
   - tenant isolation
   - API compatibility
   - database changes
   - tests
   - MASTER_SPEC compliance
4. integrate only correct changes;
5. resolve routine safe conflicts automatically;
6. run the full validation suite;
7. push validated `develop`.

### End-of-block protocol

Whenever Claude completes a stable block or an integration cycle:

1. Run:
   - `pnpm install --frozen-lockfile` when dependencies changed
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`
   - integration/E2E tests when applicable

2. Inspect:
   - `git status`
   - `git diff`
   - `git diff --check`

3. Commit Claude work to `ai/claude`.

4. Push:
   - `origin/ai/claude`

5. Integrate validated state into:
   - `develop`

6. Push:
   - `origin/develop`

7. Update:
   - `docs/PROJECT_STATE.md`
   - `docs/WORK_QUEUE.md`

8. Remove completed work from active queues.

9. Add newly unblocked work for Codex.

10. Continue automatically with the next Claude item if unblocked.

### Required completion report

When stopping, always provide:

#### COMPLETED
What Claude implemented or integrated.

#### CODEX INTEGRATION
Codex commits reviewed/integrated, if any.

#### VALIDATION
Commands/tests executed and results.

#### COMMITS
Relevant commit SHAs/messages.

#### GIT STATE
State of:
- `ai/claude`
- `ai/codex`
- `develop`
- working trees / pushed state

#### PROJECT STATE
Current phase and meaningful progress.

#### HANDOFF TO CODEX
Provide one concise, ready-to-copy instruction telling Codex exactly what to synchronize and work on next.

#### MY NEXT WORK
State what Claude will continue automatically.

#### NEEDS USER DECISION
Use exactly:
- `NO`
or
- `YES` followed by the decision required, options, and recommendation.

### User escalation

Stop and ask the user only for:

- major architectural decisions;
- destructive migrations;
- potential data loss;
- major business-rule ambiguity;
- irreversible security-sensitive choices;
- conflicts that cannot be safely resolved.

Routine coding, testing, merging, syncing, documentation, and queue updates should not require user approval.