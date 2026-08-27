# Historical Task Registry

This file is retained to preserve the history of the original Foundation task
split. It is no longer an active assignment board and must not be used to
select work or claim file ownership.

The active source of truth is:

- `docs/WORK_QUEUE.md` for ordered work;
- `docs/PROJECT_STATE.md` for the implemented state;
- `CLAUDE.md` and `AGENTS.md` for the current operating model.

## Current ownership

Claude is the sole development owner of the ERP across architecture, backend,
frontend, database, testing, infrastructure, documentation and integration.
Codex has no standing assignment. It may participate only in an explicitly
assigned, bounded and isolated task.

## Retired Foundation split

The repository originally used the following parallel assignments:

- `FOUNDATION-001`: Identity and Authentication, assigned to Claude on
  `feature/foundation-auth`.
- `FOUNDATION-002`: Tenancy, Organizations and Companies, assigned to Codex
  on `feature/foundation-tenancy`.

Those tasks and their shared bootstrap work were completed, reviewed and
integrated long ago. Their former file locks, branch coordination notes and
pending-merge instructions are obsolete. The resulting technical history is
recorded in Git, `docs/PROJECT_STATE.md` and the completed sections of
`docs/WORK_QUEUE.md`.

## Active task

No separate task document is active. Claude should take the highest-priority
non-blocked item from `docs/WORK_QUEUE.md`; at the time of this registry update,
that item is Event Bus implementation.
