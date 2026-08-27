# Project State

Última actualización: 2026-08-27 (sesión 9), tras implementar Audit
append-only completo (login/logout/revocación, cambios de status de
usuario, provisioning de tenant, asignaciones RBAC, cambios de
configuración) y verificarlo contra Postgres real y con un smoke test HTTP
completo.
Modelo de trabajo vigente: `docs/WORK_QUEUE.md` (reemplaza
`docs/tasks/FOUNDATION-00X.md`/`CURRENT.md`, que quedan como historial).

## Current Phase

PHASE 1 — Foundation, primer vertical slice integrado y verificado de
extremo a extremo: backend + frontend + CI + E2E de navegador real contra
infraestructura real (Identity + Tenancy + onboarding + Access Control +
Typed Configuration + Audit).
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
  completo) — usados por la UI de RBAC (ver abajo).
- **Access Control / RBAC** (`apps/api/src/core/access-control`, Claude,
  sesión 5): `Permission` (catálogo global code-owned, 3 permisos
  fundacionales), `Role` (tenant-scoped), `RoleAssignment` (scope
  `TENANT`/`COMPANY`), `PermissionGuard` + `@RequirePermission()`
  deny-by-default. `SeedOwnerRoleUseCase` otorga automáticamente un rol
  "Owner" con todos los permisos vigentes al aprovisionar un tenant.
  4 tablas nuevas (migración `20260827021429_rbac_foundation`, **generada y
  aplicada directamente contra Postgres real** vía `prisma migrate dev`, no
  solo diffeada). Suite de integración contra Postgres real ampliada con un
  escenario RBAC completo (scoping, aislamiento cross-tenant vía FK
  compuesta, FK de membership). **Smoke test manual verificado contra la
  infraestructura Docker real**: registro → provisioning → Owner
  auto-sembrado con sus 3 permisos → `GET /api/v1/roles`/`permissions` en
  200 → una segunda membership real sin asignaciones recibe `403
  PERMISSION_DENIED`. Detalle completo en `docs/WORK_QUEUE.md` ("Hecho —
  sesión 5").
- **UI de RBAC — "Roles y permisos"** (`apps/erp-web/src/features/
  access-control`, Codex, sesión 6): pantalla con pestañas Roles/Permisos,
  creación de rol y asignación de rol a una membership existente, usando
  los 4 métodos nuevos de `@erp/api-client` (`listRoles`, `listPermissions`,
  `createRole`, `assignRole`). No simula invitación de membership: pide un
  `membershipId` ya existente y lo señala explícitamente en la propia
  pantalla, ya que ese endpoint todavía no existe. Revisado e integrado
  por Claude (Tech Lead) sin cambios.
- **E2E del ciclo completo de sesión** (`apps/e2e/tests/*.spec.ts`, Codex,
  sesión 6): cobertura real de rotación de tokens en refresh, rechazo de
  replay de un refresh ya rotado (`401 UNAUTHENTICATED`), navegación y uso
  real de la UI de RBAC dentro del mismo flujo, logout y confirmación de
  revocación (`401 SESSION_REVOKED` tras logout), bloqueo de rutas
  protegidas post-logout, y resistencia a enumeración de cuentas en login
  (mismo mensaje de error para cuenta existente vs. inexistente). Todos los
  códigos de error verificados (`UNAUTHENTICATED`, `SESSION_REVOKED`) son
  reales, no inventados. Revisado e integrado por Claude sin cambios.
- **Typed Configuration** (`apps/api/src/core/configuration`, Claude,
  sesión 7): `SettingDefinition` (catálogo global code-owned, 3 claves
  fundacionales de localización — moneda, zona horaria, idioma),
  `SettingValue` (resolución con fallback real COMPANY → TENANT → PLATFORM
  → default de la definición), `UserPreference` (global al usuario, sin
  catálogo). 3 tablas nuevas (migración `20260827183903_typed_configuration`,
  **generada y aplicada directamente contra Postgres real** vía
  `prisma migrate dev`). Decisión de seguridad explícita: escritura a nivel
  `PLATFORM` modelada en dominio pero **no expuesta por HTTP** — expondría
  a cualquier admin de tenant a sobreescribir el default global de todos
  los tenants sin que exista todavía un plano de administración de
  plataforma separado (`docs/ARCHITECTURE.md` §10). Suite de integración
  contra Postgres real ampliada con la cadena de resolución completa y el
  FK compuesto `setting_values(tenant_id, company_id)`. **Smoke test manual
  verificado contra la infraestructura Docker real**: catálogo → efectivos
  en default → override TENANT → override COMPANY (gana sobre TENANT) →
  `companyId` de otro tenant rechazado (`404 COMPANY_NOT_FOUND`) → tipo de
  valor incorrecto rechazado (`400 INVALID_SETTING_VALUE`) → preferencia de
  usuario sin necesitar contexto de tenant. Detalle completo en
  `docs/WORK_QUEUE.md` ("Hecho — sesión 7").
- **UI de Configuración — "Ajustes"** (`apps/erp-web/src/features/
  configuration`, Codex, sesión 8): pantalla con pestañas Ajustes/
  Preferencias, editor de valor consciente del `dataType` de cada
  definición, y 5 métodos nuevos en `@erp/api-client`
  (`listSettingDefinitions`, `listEffectiveSettings`, `setSettingValue`,
  `listUserPreferences`, `setUserPreference`). Codifica la restricción de
  PLATFORM directamente en el tipo `WritableSettingScope` y en el copy de
  la UI, en vez de simular administración de plataforma. Revisado e
  integrado por Claude (Tech Lead) sin cambios de código.
- **Panel de avance de desarrollo** (`apps/erp-web/src/features/workspace/
  development-progress-panel.tsx`, Codex, sesión 8): indicador estático,
  explícitamente no vinculante, del roadmap de MASTER_SPEC. Corregido por
  Claude en un commit de seguimiento: su lista de "próximos hitos" seguía
  nombrando "Configuración tipada" como pendiente pese a estar ya
  integrada.
- **Audit** (`apps/api/src/core/audit`, Claude, sesión 9): `AuditEntry`
  append-only (sin update/delete en ningún nivel), `RecordAuditEntryUseCase`
  (único punto de escritura, **nunca lanza** — un fallo de auditoría jamás
  convierte una acción exitosa del usuario en un 500), `ListAuditEntriesUseCase`
  (solo entradas tenant-scoped). Cubre las cinco categorías pedidas:
  autenticación (registro, login éxito/fallo, logout, revocación total),
  cambios de status de usuario, provisioning de tenant (+ auto-seed del rol
  Owner, mismo `correlationId`), asignaciones RBAC (creación de rol y de
  asignación), cambios de configuración (con el valor efectivo previo y su
  scope de origen como `previousValues`). Grabado a nivel de controller
  (no dentro de los use cases existentes) para no tocar sus firmas ni su
  cobertura de tests ya validada. Tabla nueva (migración
  `20260827194023_audit_foundation`, **generada y aplicada directamente
  contra Postgres real**). Nuevo endpoint `GET /api/v1/audit-entries`
  (permiso `audit.entries.read`). Suite de integración ampliada con
  aislamiento cross-tenant real y **el contrato "nunca lanza" verificado
  contra una violación de FK real de Postgres**, no solo un mock. **Smoke
  test manual verificado contra la infraestructura Docker real**: registro
  → login fallido → provisioning → creación de rol → cambio de setting →
  el endpoint devuelve exactamente las 4 entradas tenant-scoped esperadas,
  confirmando que login/registro (sin tenant) no aparecen ahí y que un
  segundo tenant real solo ve sus propias entradas. Cierra los tres huecos
  de auditoría ya documentados en las secciones de Authentication, RBAC y
  Typed Configuration. Detalle completo en `docs/WORK_QUEUE.md` ("Hecho —
  sesión 9").
- 143 tests unitarios pasando (api 120, api-client 7, erp-web 16) + 5 tests
  de integración con Postgres real + **2 tests E2E de Playwright pasando
  contra infraestructura real completa** (Chromium real, Postgres+Redis
  efímeros vía Testcontainers, API compilada real, Vite real), incluyendo
  pruebas de wiring real de NestJS (`auth.module.spec.ts`,
  `app.module.spec.ts`, `tenants.module.spec.ts`,
  `access-control.module.spec.ts`, `configuration.module.spec.ts`,
  `audit.module.spec.ts`) y pruebas negativas de aislamiento cross-tenant.

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

### Nota operativa (sesión 9, no un bug de código)

Dos corridas de `pnpm --filter @erp/e2e test:e2e` fallaron por procesos
`node`/`vite` huérfanos ocupando los puertos 3000/5173 desde sesiones
anteriores. En un caso, `Get-NetTCPConnection` reportó momentáneamente un
proceso de otro proyecto del usuario ("nexo", no relacionado) escuchando
en 5173 — se verificó con `curl` que el puerto en realidad estaba libre
(estado transitorio, no un conflicto real) antes de reintentar. Ese
proceso ajeno nunca se tocó. Lección: antes de dar una corrida de E2E por
fallida por `EADDRINUSE`/`already in use`, confirmar con una petición HTTP
directa si el puerto está realmente ocupado, no solo confiar en el estado
reportado por el sistema operativo en ese instante.

## In Progress

Ninguno activo — ver `docs/WORK_QUEUE.md` para el próximo ítem (Event Bus).

## Pending

Ver `docs/WORK_QUEUE.md` para el orden de dependencia técnica completo.
Resumen: Event Bus (diseño ya existe en `docs/EVENTS.md`, falta
implementar) → Files → Notifications → Workers → OpenAPI/Swagger →
endpoint de invitación de membership → plano de administración de
plataforma (necesario antes de exponer escritura de settings a nivel
PLATFORM) → vista de "mi actividad"/administración para eventos no
tenant-scoped (login/logout/cambios de status, hoy grabados pero sin
endpoint de lectura) → admin endpoint para `SetUserStatusUseCase` (el use
case y su auditoría existen, pero nada lo invoca todavía). También
pendiente: ratificar ADR-001 a ADR-005 formalmente. Para Codex: sin tarea
nueva asignada en este momento — UI de RBAC, E2E de sesión y UI de
Configuración ya están hechas e integradas (ver Completed); Audit no tiene
superficie de UI propia. El flujo "invitar usuario → asignar rol" en la UI
de RBAC **sigue bloqueado** hasta que exista el endpoint de invitación de
membership — no se debe simular ni inventar mientras tanto.

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

**Sesión 7 (2026-08-27, Typed Configuration)**: cuarta migración
(`20260827183903_typed_configuration`) generada directamente contra esta
misma base real vía `prisma migrate dev` — `prisma migrate status` confirma
las 4 migraciones aplicadas sin drift. Flujo HTTP completo repetido con el
servidor real compilado (`node dist/main.js`): registro + provisioning con
compañía, catálogo de 3 definiciones, efectivos en default, override
TENANT, override COMPANY (confirmado que gana sobre TENANT vía
`X-Company-Id`), `companyId` de otro tenant rechazado con
`404 COMPANY_NOT_FOUND` (FK compuesto real, no solo filtro de aplicación),
valor de tipo incorrecto rechazado con `400 INVALID_SETTING_VALUE`, clave
desconocida rechazada con `404 SETTING_NOT_FOUND`, y una preferencia de
usuario creada/leída sin necesitar ningún contexto de tenant. Toda la data
de prueba fue limpiada al terminar.

**Sesión 9 (2026-08-27, Audit)**: quinta migración
(`20260827194023_audit_foundation`) generada directamente contra esta misma
base real vía `prisma migrate dev` — `prisma migrate status` confirma las 5
migraciones aplicadas sin drift. Flujo HTTP completo repetido con el
servidor real compilado (`node dist/main.js`): registro, login fallido,
provisioning con compañía, creación de rol, cambio de setting, y
confirmación de que `GET /api/v1/audit-entries` devuelve exactamente las 4
entradas tenant-scoped esperadas (provisioning y auto-seed del Owner
comparten `correlationId`, confirmando que pertenecen a la misma
operación), con `previousValues` del cambio de setting mostrando
correctamente `{"value":"USD","source":"DEFAULT"}` como valor efectivo
previo. Verificado que las entradas de login/registro (`tenantId: null`)
no aparecen en la vista tenant-scoped, y que un segundo tenant real
provisionado en la misma sesión solo ve sus propias 2 entradas — aislamiento
cross-tenant confirmado en runtime, no solo en el test de integración.
Toda la data de prueba fue limpiada al terminar.
