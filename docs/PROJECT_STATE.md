# Project State

Última actualización: 2026-08-27 (sesión 5), tras implementar Access
Control/RBAC completo (Permission, Role, RoleAssignment, PermissionGuard)
y verificarlo contra Postgres real y con un smoke test HTTP completo.
Modelo de trabajo vigente: `docs/WORK_QUEUE.md` (reemplaza
`docs/tasks/FOUNDATION-00X.md`/`CURRENT.md`, que quedan como historial).

## Current Phase

PHASE 1 — Foundation, primer vertical slice integrado y verificado de
extremo a extremo: backend + frontend + CI + E2E de navegador real contra
infraestructura real (Identity + Tenancy + onboarding + Access Control).
Fase 0 no está
formalmente cerrada: `docs/DECISIONS.md` solo tiene ADR-006 numerado, y
`ARCHITECTURE.md`/`MULTITENANCY.md`/`ROADMAP.md` siguen marcados "Propuesta
para aprobación" en sus propios encabezados. **Corrección respecto a
versiones previas de este archivo**: ADR-004 (Event Architecture) y ADR-005
(Plugin Architecture) NO carecen de diseño — `docs/EVENTS.md` (338 líneas)
y `docs/PLUGINS.md` (368 líneas) tienen propuestas completas desde el
commit inicial del repositorio; afirmar que estaban "vacíos" fue un error
mío en sesiones anteriores, detectado por el usuario y corregido aquí y en
`docs/WORK_QUEUE.md`. Lo pendiente es ratificarlos formalmente (numerarlos)
y, para ADR-004, implementarlos — no diseñarlos. Se avanzó en paralelo por
decisión explícita del usuario, no por reinterpretación del proceso.

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
- **ERP Web** (`apps/erp-web`, React 19 + Vite + Tailwind v4, Codex):
  registro, login, refresh automático, logout, listado/selección de
  tenant, onboarding, workspace. Tokens en memoria únicamente (sin
  localStorage/sessionStorage/cookies).
- **`@erp/api-client`** (Codex): SDK tipado para Auth+Tenants, verificado
  campo por campo contra los DTOs reales y en runtime contra el servidor
  real (register → me → listTenants → provisionTenant → getTenantContext
  → refresh → logout → 401 posterior, todo exitoso).
- **Integration tests con Testcontainers** (`apps/api/test/integration`,
  Codex): PostgreSQL real efímero por corrida, migraciones reales, incluye
  el mismo escenario de rechazo cross-tenant que se validó a mano.
- **CI** (`.github/workflows/ci.yml`, Codex): lint/typecheck/test/build +
  job de integración Postgres; acciones fijadas a SHA de commit.
- **`apps/e2e`** (Playwright, Codex): E2E de navegador real (Chromium) que
  levanta Postgres+Redis efímeros vía Testcontainers, el proceso compilado
  real de `apps/api` y el dev server real de Vite, y cubre registro →
  onboarding → workspace verificando códigos de respuesta HTTP y estado
  final de la UI. Job `e2e` nuevo en CI.
- **Primitivos de UI** (`apps/erp-web/src/shared/ui`, Codex): `Table`,
  `Modal` (elemento nativo `<dialog>`), `Select`, `Tabs` (patrón WAI-ARIA
  completo) — listos para la futura UI de RBAC.
- 66 tests unitarios pasando (api 54, api-client 4, erp-web 8) + 2 tests
  de integración con Postgres real + **1 test E2E de Playwright pasando
  contra infraestructura real completa**, incluyendo pruebas de wiring
  real de NestJS (`auth.module.spec.ts`, `app.module.spec.ts`,
  `tenants.module.spec.ts`) y pruebas negativas de aislamiento cross-tenant.
- **Access Control / RBAC** (`apps/api/src/core/access-control`, Claude,
  sesión 5): `Permission` (catálogo global code-owned, 3 permisos
  fundacionales), `Role` (tenant-scoped), `RoleAssignment` (scope
  `TENANT`/`COMPANY`), `PermissionGuard` + `@RequirePermission()`
  deny-by-default. `SeedOwnerRoleUseCase` otorga automáticamente un rol
  "Owner" con todos los permisos vigentes al aprovisionar un tenant.
  4 tablas nuevas (migración `20260827021429_rbac_foundation`, **generada y
  aplicada directamente contra Postgres real** vía `prisma migrate dev`, no
  solo diffeada). 80 tests unitarios totales en `apps/api` (antes 54, +26),
  suite de integración contra Postgres real ampliada con un escenario RBAC
  completo (scoping, aislamiento cross-tenant vía FK compuesta, FK de
  membership). **Smoke test manual verificado contra la infraestructura
  Docker real**: registro → provisioning → Owner auto-sembrado con sus 3
  permisos → `GET /api/v1/roles`/`permissions` en 200 → una segunda
  membership real sin asignaciones recibe `403 PERMISSION_DENIED`. Detalle
  completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 5").

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

### Corregido durante la implementación de RBAC (sesión 5, 2026-08-27)

- **Bug arquitectónico real de ciclo de módulos**: `RolesController` se
  escribió inicialmente físicamente dentro de `access-control/presentation/`
  pero necesitaba `TenantContextGuard`/`CurrentTenantContext` de `tenants/`.
  Eso creaba un ciclo de carga de módulos a nivel de `import`/`require`
  (tenants → access-control → tenants) que no era un ciclo de DI de NestJS
  (por eso `tsc`/`eslint` no lo detectaron) pero sí rompía en runtime
  (`CurrentTenantContext is not a function`) — solo se manifestó al correr
  la suite completa de tests (`app.module.spec.ts`/`tenants.module.spec.ts`
  fallaron). Corregido moviendo `RolesController` a
  `tenants/presentation/roles.controller.ts`; `AccessControlModule` sigue
  con cero dependencia de Tenants. Lección: un módulo cuyo controller
  necesita guards/decoradores de otro módulo debe vivir físicamente en ese
  otro módulo, no solo estar "registrado" allí — ver docstrings actualizados
  en ambos módulos.

## In Progress

Ninguno activo — ver `docs/WORK_QUEUE.md` para el próximo ítem
(Configuración tipada).

## Pending

Ver `docs/WORK_QUEUE.md` para el orden de dependencia técnica completo.
Resumen: Configuración tipada → Audit → Event Bus (diseño ya existe en
`docs/EVENTS.md`, falta implementar) → Files → Notifications → Workers →
OpenAPI/Swagger → endpoint de invitación de membership. También pendiente:
ratificar ADR-001 a ADR-005 formalmente. Para Codex: UI de RBAC — **ya
desbloqueada**, contrato HTTP real y verificado en `docs/WORK_QUEUE.md`.

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

**Sesión 5 (2026-08-27, RBAC)**: tercera migración
(`20260827021429_rbac_foundation`) generada directamente contra esta misma
base real vía `prisma migrate dev` (no diffeada desde cero como las dos
anteriores) — `prisma migrate status` confirma las 3 migraciones aplicadas
sin drift. Flujo HTTP completo repetido con el servidor real compilado
(`node dist/main.js`): registro de 2 usuarios, provisioning, verificación
del rol Owner auto-sembrado, `GET /api/v1/roles`/`permissions` exitosos, y
confirmación de `403 PERMISSION_DENIED` real para una membership sin rol
(insertada directamente por script para no depender de un endpoint de
invitación que todavía no existe). Toda la data de prueba fue limpiada al
terminar.
