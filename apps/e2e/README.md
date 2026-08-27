# ERP end-to-end tests

This package verifies the real browser flows for authentication, tenant
onboarding, RBAC management and session revocation. Coverage includes invalid
credentials without account enumeration, refresh-token rotation and stale
token replay rejection, role creation/assignment, logout, and protected-route
redirection.

Run it with:

```bash
pnpm --filter @erp/e2e test:e2e
```

The command requires a running Docker engine and an installed Playwright
Chromium binary (`pnpm --filter @erp/e2e exec playwright install chromium`). It
builds the API, starts isolated PostgreSQL 16 and Redis 7 containers, applies
the committed Prisma migrations, and launches the compiled API plus the Vite
development server. The containers and application processes are stopped after
the run, including failed runs. It never connects to developer databases or
Redis instances.

The lifecycle scenario uses Playwright's browser clock to move the client
inside its 30-second refresh margin without changing the API's real 15-minute
access-token TTL. Authenticated UI actions therefore exercise real backend
rotation without weakening environment validation or waiting in real time.

The regular workspace `pnpm test` remains the unit suite. E2E runs separately
because it requires Docker and a browser.
