# ERP end-to-end tests

This package verifies the real browser flow from account registration through
tenant onboarding and workspace entry.

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

The regular workspace `pnpm test` remains the unit suite. E2E runs separately
because it requires Docker and a browser.
