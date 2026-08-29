# Project State

Última actualización: 2026-08-28 (sesión 16), tras implementar el plano de
administración de plataforma (ADR-007): flag `isPlatformAdmin` en `User`,
`PlatformAdminGuard`, y el primer caso de uso real detrás de él
(listar/activar-desactivar usuarios de toda la plataforma). Modelo de
trabajo vigente: `docs/WORK_QUEUE.md` (reemplaza
`docs/tasks/FOUNDATION-00X.md`/`CURRENT.md`, que quedan como historial).

## Development Ownership

Claude es el único responsable del desarrollo completo del ERP: arquitectura,
backend, frontend, UI/UX, base de datos, seguridad, pruebas, infraestructura,
documentación, integración y roadmap. `develop` es la fuente integrada,
`ai/claude` es la rama persistente de trabajo y `main` es estable/releases.

El flujo permanente Claude/Codex, la cola separada y los handoffs rutinarios
quedaron retirados el 2026-08-27. La rama `ai/codex` y las atribuciones de
trabajos ya integrados se conservan como historial técnico. Codex solo puede
participar en una tarea aislada con asignación explícita, alcance cerrado y
revisión de Claude; no selecciona trabajo del ERP de forma autónoma.

## Current Phase

PHASE 1 — Foundation, primer vertical slice integrado y verificado de
extremo a extremo: backend + frontend + CI + E2E de navegador real contra
infraestructura real (Identity + Tenancy + onboarding + Access Control +
Typed Configuration + Audit + Event Bus + Files + Notifications). Desde la
sesión 13, la topología real de despliegue tiene dos procesos backend
separados (`apps/api` para HTTP, `apps/worker` para el outbox dispatcher),
no solo uno — la primera vez que el monorepo despliega más de un proceso
Node de aplicación.
Fase 0 no está
formalmente cerrada: `docs/DECISIONS.md` tiene ADR-004 y ADR-006 numerados;
`ARCHITECTURE.md`/`MULTITENANCY.md`/`ROADMAP.md` siguen marcados "Propuesta
para aprobación" en sus propios encabezados. ADR-005 (Plugin Architecture)
sigue sin implementar — su diseño existe completo en `docs/PLUGINS.md`
(368 líneas) desde el commit inicial del repositorio, pero a diferencia de
ADR-004 nada se ha construido contra él todavía.

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
- **Event Bus / transactional outbox** (`apps/api/src/core/events`, Claude,
  sesión 10): `OutboxMessage` (entidad con `markProcessing`/`markPublished`/
  `markFailed`, backoff exponencial cap 300s, dead-letter tras 5 intentos),
  `appendOutboxMessage` (función pura que inserta usando el cliente
  Prisma/transacción ya abierto por el llamador — atomicidad real con la
  escritura de estado del productor, no un escritor con conexión propia),
  `DomainEventBus` (pub/sub in-process sin persistencia propia — la
  durabilidad viene de la fila de outbox ya comprometida), `DispatchOutboxBatchUseCase`
  (reclamo vía `FOR UPDATE SKIP LOCKED`), `OutboxDispatcherScheduler`
  (`setInterval` nativo con ciclo de vida de Nest, no `@nestjs/schedule` ni
  BullMQ — ver ADR-004 con el razonamiento completo). Tabla nueva
  (migración `20260827232432_event_bus_outbox`, **generada y aplicada
  directamente contra Postgres real**). Primer productor real:
  `PrismaTenantProvisioningRepository` publica `tenancy.tenant.provisioned.v1`
  en la misma transacción que el provisioning. Suite de integración
  ampliada con reclamo concurrente real (dos claimants simultáneos, sin
  solapamiento de IDs) y recuperación de lease expirado. **Smoke test
  manual verificado contra la infraestructura Docker real**: provisioning →
  1 fila `PENDING` con payload correcto → dispatcher ejecutado → fila
  `PUBLISHED`, confirmando en el log real que hoy ningún handler de
  producción está registrado todavía (el primer consumidor real queda para
  Notifications). ADR-004 ratificado en `docs/DECISIONS.md` con las 7
  decisiones de implementación V1. Detalle completo en
  `docs/WORK_QUEUE.md` ("Hecho — sesión 10").
- **Files** (`apps/api/src/core/files`, Claude, sesión 11): `FileObject`
  (metadata + ownership, sin las bytes — soft-delete explícito vía
  `markDeleted`), `FileStoragePort` (desacopla dominio/aplicación del SDK de
  AWS; `S3FileStorageAdapter` es la única implementación),
  `UploadFileUseCase` (sube al storage antes de persistir metadata),
  `GetFileDownloadUrlUseCase` (mismo patrón IDOR-resistant que el resto de
  Foundation: "no encontrado" y "de otro tenant" devuelven el mismo `404`),
  `ListFilesUseCase`, `DeleteFileUseCase`. Almacenamiento real contra
  MinIO/S3: `S3FileStorageAdapter` (`@aws-sdk/client-s3` +
  `@aws-sdk/s3-request-presigner`), `S3BucketBootstrapper` (crea el bucket
  automáticamente al iniciar si no existe). Subida vía `multipart/form-data`
  con Multer en memoria — el archivo nunca toca disco local (MASTER_SPEC
  §22). Tabla nueva (migración `20260827235703_files_foundation`,
  **generada y aplicada directamente contra Postgres real**), con
  `storage_key` `UNIQUE` (colisión estructuralmente imposible) y el mismo FK
  compuesto `(tenant_id, company_id)` ya usado por Configuration/Audit/Event
  Bus. Contrato HTTP: `POST/GET /api/v1/files`,
  `GET /api/v1/files/:id/download-url` (URL firmada, TTL configurable),
  `DELETE /api/v1/files/:id` (soft-delete). **Bug real encontrado y
  corregido durante el smoke test contra MinIO real**: subir sin el campo
  `file` producía un `500` genérico en vez de un `400 FILE_REQUIRED` bien
  formado — corregido con una validación explícita en el controller y
  re-verificado contra el servidor real reiniciado. **Smoke test manual
  verificado contra Docker real incluyendo MinIO real** (no solo Postgres):
  subida multipart real → objeto confirmado en el bucket → URL firmada real
  → contenido descargado coincide byte a byte con el original → aislamiento
  cross-tenant confirmado (`404` real) → soft-delete real → auditoría
  (`file.uploaded`/`file.deleted`) confirmada. El arnés E2E
  (`apps/e2e/src/global-setup.ts`) ahora también levanta un contenedor
  MinIO real vía `@testcontainers/minio`, mismo patrón que Postgres/Redis —
  necesario para que el proceso real de `apps/api` que el E2E arranca
  pudiera pasar `validateEnvironment` con las variables `FILES_S3_*`
  requeridas. Detalle completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 11").
- **Notifications** (`apps/api/src/core/notifications`, Claude, sesión 12):
  `Notification` (la solicitud/contenido, sin estado de entrega propio),
  `NotificationDelivery` (un intento de entrega por canal — V1 despacha
  sincrónicamente, así que nace ya `SENT` o `FAILED`, nunca `PENDING`),
  `RequestNotificationUseCase` (MASTER_SPEC §48 — deliberadamente **no
  expuesto por HTTP**, solo invocable internamente por otro módulo, mismo
  patrón que `RecordAuditEntryUseCase`), `ListNotificationsUseCase`,
  `MarkNotificationReadUseCase` (mismo patrón IDOR-resistant que el resto
  de Foundation). Solo `IN_APP` tiene adapter real; `EMAIL`/`SMS`/
  `WHATSAPP`/`PUSH` son canales reservados que producen un delivery
  `FAILED` explícito. Contrato HTTP: `GET /api/v1/notifications`
  (`unreadOnly`, `limit`), `PUT /api/v1/notifications/:id/read` — sin
  `PermissionGuard` (personal al llamador, mismo criterio que
  `PreferencesController`). Primer productor real: `TenantsController.
  provision()` notifica al owner tras el provisioning — llamada directa,
  deliberadamente **no conectada al Event Bus** todavía (`DomainEventBus`
  requiere el inbox/idempotencia, aún no construido, antes de registrar un
  handler con este tipo de efecto secundario, ver ADR-004 punto 5). Tablas
  nuevas (migración `20260828003322_notifications_foundation`, **generada y
  aplicada directamente contra Postgres real**), con `@@unique([notificationId,
  channel])` y `ON DELETE CASCADE` delivery→notification (única tabla de
  Foundation donde cascade es correcto). Sin permiso RBAC ni auditoría
  nuevos — decisión consciente, documentada. **Smoke test manual verificado
  contra Docker real**: provisioning → notificación automática confirmada
  con delivery `IN_APP` `SENT` → listado y filtro `unreadOnly` → marcado de
  leído real (`204`) → aislamiento cross-tenant/cross-destinatario
  confirmado (`404` real). Detalle completo en `docs/WORK_QUEUE.md`
  ("Hecho — sesión 12").
- **Workers** (`apps/worker`, Claude, sesión 13): nueva app que ejecuta el
  outbox dispatcher (`OutboxDispatcherScheduler`), extraído de `apps/api` a
  su propio proceso. El dominio completo del outbox (`OutboxMessage`,
  `appendOutboxMessage`, `DomainEventBus`, `DispatchOutboxBatchUseCase`,
  `PrismaOutboxMessageRepository`) se movió a un nuevo paquete compartido
  `packages/events` (`@erp/events`), con un token DI `PRISMA_CLIENT` que
  desacopla el paquete de la clase `PrismaService` concreta de cada app.
  `apps/api` conserva solo `appendOutboxMessage` (el lado productor, sin
  cambios de comportamiento); ya no tiene `DomainEventBus` ni el scheduler
  en su propio grafo de módulos. `apps/worker` expone `GET /health`
  (liveness, puerto 3001 por defecto) y no tiene ninguna otra ruta HTTP —
  toda request de negocio sigue siendo exclusiva de `apps/api`. ADR-004
  enmendado documentando el nuevo diseño. **Verificado end-to-end contra
  Docker real con ambos procesos corriendo simultáneamente**: `apps/api`
  aprovisionó un tenant real sin ninguna actividad de dispatcher en su
  propio log; `apps/worker` (proceso separado) reclamó y publicó ese mismo
  mensaje del outbox. El arnés E2E (`apps/e2e/src/global-setup.ts`) ahora
  arranca los tres procesos reales (api + worker + erp-web) en vez de solo
  dos. Detalle completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 13").
- **OpenAPI/Swagger** (`apps/api/src/main.ts`, Claude, sesión 14):
  `@nestjs/swagger@11.4.7` (línea 11.x, no la última 12.x — esa exige Nest
  12), publicado en `GET /api/docs` (Swagger UI) y `GET /api/docs-json`
  (spec crudo), **alcanzable en todo entorno deliberadamente** (el spec no
  contiene secretos). Los 8 controllers y 18 DTOs existentes de Foundation
  quedaron decorados de verdad — `@ApiProperty` en cada campo (incluyendo
  DTOs anidados antes inline y sin tipar, ahora clases propias),
  `@ApiOperation`/`@ApiResponse` por endpoint con los códigos de error
  reales, `@ApiTags` por bounded context, `@ApiBearerAuth("session")`.
  Nuevo decorador compuesto reusable `ApiTenantHeaders()` documenta
  `X-Tenant-Slug`/`X-Company-Id` una sola vez para los 6 controllers detrás
  de `TenantContextGuard`. El endpoint de subida de Files usa
  `@ApiConsumes`/`@ApiBody` con schema binario. **Verificado contra el
  servidor real**: 22 rutas, 7 tags, 28 schemas en el JSON generado,
  inspeccionado campo por campo contra las validaciones `class-validator`
  reales, y confirmado que el flujo real (`POST /auth/register`) sigue
  funcionando idéntico — Swagger es puramente aditivo. Bug de entorno
  encontrado y corregido (no de código): `pnpm install` empezó a fallar
  tras instalar `@nestjs/swagger` por un script de telemetría ignorado
  (`@scarf/scarf`) — corregido rechazándolo explícitamente en
  `pnpm-workspace.yaml` en vez de aprobarlo a ciegas. Sin tests nuevos —
  metadata de decoradores sobre código ya probado, no lógica nueva.
  Detalle completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 14").
- **Membership Invitations** (`apps/api/src/core/tenants`, Claude, sesión 15):
  `InviteMembershipUseCase`/`AcceptMembershipInvitationUseCase`/
  `ListMembershipsUseCase`/`ListPendingInvitationsUseCase` +
  `MembershipsController` (`POST/GET /api/v1/tenants/memberships`,
  `GET .../pending`, `POST .../:id/accept`) cierran el hueco de RBAC ya
  documentado: agregar un segundo usuario real a un tenant, con
  autoaceptación desde el propio usuario invitado (`Membership.activate()`,
  patrón `INVITED → ACTIVE` que ya existía en el dominio). Sin migración
  nueva — solo lógica de aplicación sobre `memberships`/`tenants` ya
  existentes. 2 permisos nuevos (`tenants.memberships.read/.manage`).
  Invitar dispara una notificación `IN_APP` real y una entrada de auditoría.
  UI nueva: pestaña "Miembros" en "Roles y permisos" (listar + invitar por
  correo) y el modal "Asignar rol" ahora usa un selector real de miembros en
  vez de un ID escrito a mano; sección "Invitaciones pendientes" en el
  tenant picker con botón "Aceptar". **Verificado con un E2E de Playwright
  real usando dos `BrowserContext` aislados** (sesión del owner y sesión del
  invitado, sin compartir tokens): invita → el invitado ve su invitación →
  la acepta → el tenant aparece en su propia lista de espacios. Detalle
  completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 15").
- **Platform Administration** (`apps/api/src/core/platform-admin`, Claude,
  sesión 16, ADR-007): resuelve la decisión de arquitectura que
  `docs/ARCHITECTURE.md` §10 dejaba pendiente ("system administration usa un
  plano y credenciales separados") y que bloqueaba 3 ítems de la cola desde
  hacía varias sesiones. El usuario eligió explícitamente, entre tres
  alternativas presentadas, reutilizar el `User`/`Session` ya construido en
  vez de un sistema de credenciales separado: nuevo campo
  `User.isPlatformAdmin` (`false` por defecto, nunca aceptado como input —
  `CreateUserUseCase` lo fija explícitamente; solo otorgable vía operación
  directa de base de datos), `PlatformAdminGuard` (corre tras
  `SessionAuthGuard`, mismo patrón fail-closed que `PermissionGuard`),
  `ListUsersUseCase` (nuevo, único caso de uso con query unscoped de
  `User`), y `PlatformUsersController` (`GET /api/v1/platform/users`,
  `PUT /api/v1/platform/users/:id/status` — primer caller HTTP real de
  `SetUserStatusUseCase`, que ya existía probado desde antes pero sin
  ningún endpoint que lo invocara). Tabla `users` con columna nueva
  (migración `20260828175413_platform_admin_flag`, **generada y aplicada
  directamente contra Postgres real** vía `prisma migrate dev`). Panel de
  avance del workspace actualizado a pedido explícito del usuario: hitos
  próximos corregidos y Foundation recalculado de 53% a 78% (6 de 8 pasos
  de `docs/ARCHITECTURE.md` §17 completos, más trabajo adicional no
  contemplado ahí). Detalle completo en `docs/WORK_QUEUE.md` ("Hecho —
  sesión 16").
- 217 tests unitarios pasando (api 193, api-client 8, erp-web 16) + 18 en
  `@erp/events` + 1 en `@erp/worker` + 12 tests de integración con Postgres
  real + **3 tests E2E de Playwright pasando contra infraestructura real
  completa** (Chromium real, Postgres+Redis+MinIO efímeros vía
  Testcontainers, API y worker compilados reales, Vite real), incluyendo
  pruebas de wiring real de NestJS (`auth.module.spec.ts`,
  `app.module.spec.ts`, `tenants.module.spec.ts`,
  `access-control.module.spec.ts`, `configuration.module.spec.ts`,
  `audit.module.spec.ts`, `files.module.spec.ts`, `notifications.module.spec.ts`,
  `platform-admin.module.spec.ts` en `apps/api`; `outbox-dispatcher.module.spec.ts`
  en `@erp/events`; `worker.module.spec.ts` en `@erp/worker`) y pruebas
  negativas de aislamiento cross-tenant.

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

Ninguno activo — ver `docs/WORK_QUEUE.md` para el próximo ítem (endpoint de
escritura de settings a nivel PLATFORM, usando el plano de administración
ya construido).

## Pending

Ver `docs/WORK_QUEUE.md` para el orden de dependencia técnica completo.
Resumen bajo ownership único de Claude: endpoint de escritura de settings a
nivel PLATFORM (el plano de administración ya existe — ADR-007, solo falta
el endpoint) → vista de "mi actividad"/administración para eventos no
tenant-scoped (login/logout/cambios de status, hoy grabados pero sin
endpoint de lectura; ya no bloqueado por decisión de arquitectura) → inbox/
idempotencia de consumidores (requerido antes de registrar cualquier
handler del Event Bus con efecto secundario no idempotente, incluyendo
conectar Notifications a `tenancy.tenant.provisioned.v1`) → purga real de
storage para archivos borrados (`DeleteFileUseCase` hoy solo hace
soft-delete de metadata) → adapter real de Email para Notifications
(proveedor SMTP/transaccional no decidido) → `@erp/api-client` generado
desde el spec OpenAPI (`/api/docs-json` ya existe; herramienta de
generación todavía no decidida) → expirar/revocar invitaciones pendientes
(`Membership.revoke()` ya existe en el dominio, sin TTL ni endpoint todavía).
También pendiente: ratificar ADR-001, ADR-002, ADR-003 y ADR-005 formalmente
(ADR-004, ADR-006 y ADR-007 ya están ratificados). Claude debe completar
cualquier UI, SDK y cobertura de pruebas que estos bloques necesiten. La UI
de RBAC (incluida la invitación de miembros), el E2E de sesión y la UI de
Configuración ya están hechas e integradas (ver Completed); la UI de Files
(subida/listado/descarga), de Notifications (bandeja/badge de no leídas) y
de Platform Administration (panel de admin en erp-web) todavía no se han
construido.

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

**Sesión 10 (2026-08-27, Event Bus)**: sexta migración
(`20260827232432_event_bus_outbox`) generada directamente contra esta misma
base real vía `prisma migrate dev` — `prisma migrate status` confirma las 6
migraciones aplicadas sin drift. Flujo HTTP completo repetido con el
servidor real compilado (`node dist/main.js`): registro, provisioning de
tenant real, confirmado exactamente 1 fila `PENDING` en `outbox_messages`
con el payload de `tenancy.tenant.provisioned.v1` correcto, dispatcher
ejecutado manualmente contra esa misma fila, confirmado que pasa a
`PUBLISHED` con `publishedAt` poblado. Adicionalmente, contra Postgres real
vía Testcontainers (no el Docker manual): reclamo concurrente real de 4
filas por dos claimants simultáneos sin solapamiento de IDs (verifica
`FOR UPDATE SKIP LOCKED` bajo carga real) y recuperación de una fila
`PROCESSING` cuyo lease expiró. Toda la data de prueba fue limpiada al
terminar.

**Sesión 11 (2026-08-27, Files)**: séptima migración
(`20260827235703_files_foundation`) generada directamente contra esta misma
base real vía `prisma migrate dev` — `prisma migrate status` confirma las 7
migraciones aplicadas sin drift. Flujo HTTP completo repetido con el
servidor real compilado (`node dist/main.js`), **esta vez incluyendo MinIO
real, no solo Postgres**: registro, provisioning con compañía, subida
multipart real de un archivo (`S3BucketBootstrapper` creó el bucket
`erp-platform-files` automáticamente en este mismo arranque), confirmado el
objeto real en el bucket, `GET /files` lo lista, `GET /files/:id/download-url`
devuelve una URL firmada real de MinIO cuyo contenido descargado coincide
byte a byte con el archivo original, un segundo tenant real recibe
`404 FILE_NOT_FOUND` al intentar acceder (aislamiento cross-tenant
confirmado en runtime), soft-delete real confirmado (desaparece de `GET
/files` y de `download-url`, pero la fila sigue en la tabla con
`status: DELETED`), y `GET /audit-entries` confirma `file.uploaded`/
`file.deleted`. Bug real encontrado y corregido durante este mismo smoke
test: subir sin el campo `file` causaba un `500` genérico (corregido a
`400 FILE_REQUIRED`, re-verificado). Toda la data de prueba — filas de
Postgres y objetos del bucket de MinIO — fue limpiada al terminar.

**Sesión 12 (2026-08-28, Notifications)**: octava migración
(`20260828003322_notifications_foundation`) generada directamente contra
esta misma base real vía `prisma migrate dev` — `prisma migrate status`
confirma las 8 migraciones aplicadas sin drift. Flujo HTTP completo
repetido con el servidor real compilado (`node dist/main.js`): registro,
provisioning, confirmado que se creó automáticamente la notificación
`tenancy.tenant_provisioned` con un delivery `IN_APP` `SENT`, `GET
/notifications` y `?unreadOnly=true` la muestran, `PUT
/notifications/:id/read` real devuelve `204` y la notificación desaparece
del filtro `unreadOnly` pero conserva `readAt` en el listado completo, un
segundo tenant/usuario real solo ve su propia notificación de provisioning
y recibe `404 NOTIFICATION_NOT_FOUND` al intentar marcar la del primero
como leída — aislamiento cross-tenant y cross-destinatario confirmado en
runtime, no solo en el test de integración. Nota operativa: Docker Desktop
se había detenido entre la sesión anterior y esta; reiniciado antes de
correr las pruebas, los contenedores existentes se recuperaron solos
(`restart: unless-stopped`). Toda la data de prueba fue limpiada al
terminar.

**Sesión 16 (2026-08-29, Platform Administration)**: novena migración
(`20260828175413_platform_admin_flag`) generada directamente contra esta
misma base real vía `prisma migrate dev` — agrega `users.is_platform_admin
BOOLEAN NOT NULL DEFAULT false`. Flujo HTTP completo repetido con el
servidor real compilado (`node dist/main.js`): registro de un usuario
"admin" y uno "target" reales → ambos reciben `403 PLATFORM_ADMIN_REQUIRED`
en `GET /api/v1/platform/users` antes de tener el flag → flag otorgado al
admin vía `UPDATE users SET is_platform_admin = true` directo (el proceso
operativo documentado en ADR-007, no un endpoint) → `GET
/api/v1/platform/users` ahora devuelve `200` con la lista completa de
usuarios reales de la plataforma (incluyendo usuarios residuales de
sesiones anteriores, confirmando que es genuinamente cross-tenant) → `PUT
/api/v1/platform/users/:id/status` deshabilita al target real → login del
target rechazado con `403 ACCOUNT_DISABLED` → el access token del target ya
emitido antes de deshabilitarlo también deja de servir en `GET /auth/me`
con el mismo código, confirmando en runtime el re-chequeo de estado en
cada validación de sesión (ADR-006 punto 6) → id inexistente rechazado con
`404 USER_NOT_FOUND` → reactivación real del target → `SELECT` directo
sobre `audit_entries` confirma dos entradas `user.status_changed` con
`user_id` = el id del admin (el actor real), no el del target, y sus
`previousValues`/`newValues` correctos. Toda la data de prueba fue limpiada
al terminar.
