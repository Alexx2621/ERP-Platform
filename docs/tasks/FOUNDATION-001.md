# FOUNDATION-001 — Authentication Foundation

## Owner

Claude Code

## Objective

Design and implement the initial authentication foundation.

## Scope

- credentials
- password hashing
- login
- sessions
- refresh tokens
- logout
- session revocation

## Excluded

- MFA
- OAuth
- SSO
- API keys

## Required documentation

Read:

- docs/MASTER_SPEC.md
- docs/ARCHITECTURE.md
- docs/SECURITY.md
- docs/MULTITENANCY.md

## Owned paths

apps/api/src/core/auth/**
apps/api/src/core/users/**

## Shared files

Must not modify without explicit lock:

- package.json
- pnpm-lock.yaml
- prisma/schema.prisma

## Required tests

- valid login
- invalid password
- disabled user
- expired session
- revoked session

## Definition of Done

- code implemented
- lint passes
- typecheck passes
- tests pass
- security reviewed
- tenant isolation reviewed