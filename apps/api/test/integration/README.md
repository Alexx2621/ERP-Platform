# PostgreSQL integration tests

Run the repository integration suite with:

```bash
pnpm --filter @erp/api test:integration
```

The suite requires a running Docker engine. Testcontainers starts an isolated
PostgreSQL 16 container, applies the committed Prisma migrations and removes
the container after the tests. It never connects to the database declared in
the developer `.env` or to the PostgreSQL service from `docker-compose.yml`.

The regular `pnpm test` command remains the fast unit suite and intentionally
excludes this directory.
