# Project State

Última actualización: 2026-08-26 (sesión 2), tras validación real contra
Docker (PostgreSQL + Redis) y la integración HTTP de Tenant Context.
Modelo de trabajo vigente: `docs/WORK_QUEUE.md` (reemplaza
`docs/tasks/FOUNDATION-00X.md`/`CURRENT.md`, que quedan como historial).

## Current Phase

PHASE 1 — Foundation, primer vertical slice integrado y verificado
(Identity + Tenancy + onboarding HTTP). Fase 0 no está formalmente cerrada:
ADR-001, ADR-002, ADR-003, ADR-004, ADR-005 siguen sin escribirse
(`docs/DECISIONS.md` solo tiene ADR-006), y `ARCHITECTURE.md`/
`MULTITENANCY.md`/`ROADMAP.md` siguen marcados "Propuesta para aprobación"
en sus propios encabezados. Se avanzó en paralelo por decisión explícita
del usuario, no por reinterpretación del proceso.

## Completed

- Monorepo: pnpm workspace + Turborepo, TypeScript estricto, ESLint flat
  config, Jest — `apps/api` (NestJS), `packages/database` (Prisma,
  generator `prisma-client` + driver adapter `@prisma/adapter-pg`).
- ADR-006 (Identity & Session Strategy) — `docs/DECISIONS.md`.
- **Authentication** (`apps/api/src/core/auth`, `core/users`): credenciales
  Argon2id, registro (`POST /auth/register`), login, sesiones opacas
  access/refresh con rotación, logout, revocación (individual y total).
  Guard `SessionAuthGuard`.
- **Tenancy** (`apps/api/src/core/tenants`, `organizations`, `companies`):
  `Tenant`/`Membership` con máquinas de estado explícitas, provisioning
  transaccional e idempotente, resolución de contexto
  (`ResolveTenantContextUseCase` → `TenantExecutionContext` inmutable),
  `Organization`/`Company` con FKs compuestas `(tenantId, id)`/
  `(tenantId, code)` que hacen estructuralmente imposible una referencia
  cross-tenant en la base de datos — **verificado contra PostgreSQL real**,
  no solo con fakes en memoria (ver Database Status).
- **Integración HTTP de Tenant Context**: `TenantContextGuard` (corre tras
  `SessionAuthGuard`, header `X-Tenant-Slug`/`X-Company-Id`),
  `POST /api/v1/tenants`, `GET /api/v1/tenants`, `GET /api/v1/tenants/current`.
  Flujo completo registro → provisioning → listar tenants → resolver
  contexto probado por HTTP contra la base real.
- Prisma schema completo para Foundation: `users`, `user_credentials`,
  `sessions`, `tenants`, `memberships`, `organizations`, `companies`, con
  dos migraciones **aplicadas y verificadas contra PostgreSQL real**
  (`prisma migrate deploy` + `migrate status`: cero drift).
- `docker-compose.yml` (PostgreSQL 16, Redis 7, MinIO) — **en ejecución y
  verificado** (usuario instaló Docker Desktop en esta sesión).
- **Redis** (`apps/api/src/shared/redis`): `RedisService`, rate limiter de
  `/api/v1/auth/*` respaldado por Redis — **conexión real verificada**
  (roundtrip set/get, y la clave de throttle confirmada dentro de Redis,
  no en memoria).
- 54 tests pasando (`pnpm test`), incluyendo pruebas de wiring real de
  NestJS (`auth.module.spec.ts`, `app.module.spec.ts`,
  `tenants.module.spec.ts`) y pruebas negativas de aislamiento cross-tenant.

### Corregido en la auditoría de integración (sesión 1, 2026-08-26)

- `TenantsModule`/`OrganizationsModule`/`CompaniesModule` existían con buena
  cobertura de tests pero **no estaban importados en `AppModule`** — el
  código de tenancy nunca se ejecutaba en la aplicación real. Corregido.
- El schema de Prisma había avanzado (modelos de tenancy) sin una migración
  correspondiente. Corregido.

### Corregido en la validación real (sesión 2, 2026-08-26)

- **Bug de build real**: `"incremental": true` en `tsconfig.base.json`
  produjo un `dist/` incompleto tras builds repetidos — `tsc` reportaba
  éxito (exit 0) pero varios `.js` no se emitían (p. ej.
  `shared/prisma/prisma.module.js`), causando `Cannot find module` al
  arrancar el servidor real con `node dist/main.js`. Ni `lint` ni
  `typecheck` (ambos usan `--noEmit` o rutas distintas) detectaban esto —
  solo se manifestó al ejecutar el build compilado de verdad. Corregido
  quitando `incremental` de la config base (los builds ya tardan 3-5s sin
  él). Lección: `pnpm build` verde no garantiza que `dist/` esté completo;
  antes de cualquier despliegue real, confirmar `find dist -name "*.js" |
  wc -l` contra el conteo de archivos fuente, o simplemente seguir sin
  `incremental`.

## In Progress

Ninguno activo — ver `docs/WORK_QUEUE.md` para el próximo ítem (Access
Control / RBAC).

## Pending

Ver `docs/WORK_QUEUE.md` para el orden de dependencia técnica completo.
Resumen: Access Control/RBAC → Configuración tipada → Audit → Event Bus →
Files → Notifications → Workers → OpenAPI/Swagger.
También pendientes: ADR-001 a ADR-005, CI (GitHub Actions), integration
tests automatizados con Postgres real (la verificación de esta sesión fue
manual; formalizarla en la suite de tests — candidato natural para Codex,
ver `docs/WORK_QUEUE.md`).

## Production Status

Not deployed.

## Database Status

**Verificado contra PostgreSQL 16 real** (Docker, sesión 2026-08-26):
`prisma migrate deploy` aplicó ambas migraciones limpiamente;
`prisma migrate status` confirma cero drift entre `schema.prisma` y la base
aplicada. Se probó directamente con el cliente Prisma real que la FK
compuesta `companies_tenant_id_organization_id_fkey` rechaza una compañía
cuyo `organizationId` pertenece a otro tenant — el aislamiento cross-tenant
está confirmado a nivel de motor de base de datos, no solo en TypeScript.
El flujo HTTP completo (registro, login, refresh, logout, revocación,
provisioning de tenant, resolución de contexto) se probó end-to-end contra
el servidor real (`node dist/main.js`) y esta misma base. Toda la data de
prueba fue limpiada al terminar.
