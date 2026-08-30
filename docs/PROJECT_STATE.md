# Project State

Última actualización: 2026-08-29 (sesión 21), tras generar
`@erp/api-client` desde el spec OpenAPI real (`openapi-typescript` contra
`/api/docs-json`) — cierra el último ítem original de `docs/WORK_QUEUE.md`.
De paso se encontraron y corrigieron dos huecos reales de documentación
(`TenantsController.listMine()`/`current()` sin DTO decorado) y un bug de
fidelidad de decoradores Swagger en 6 archivos (`@ApiProperty({nullable:
true})` sin `type:` explícito perdía el tipo real en el spec generado).
`packages/api-client/src/contracts.ts` ahora deriva cada tipo público de
`components["schemas"][...]` en vez de mantenerse duplicado a mano, sin
cambiar ningún nombre exportado. Modelo de trabajo vigente:
`docs/WORK_QUEUE.md` (reemplaza `docs/tasks/FOUNDATION-00X.md`/`CURRENT.md`,
que quedan como historial).

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

PHASE 1 — Foundation, **formalmente cerrada el 2026-08-30 (sesión 22)**:
primer vertical slice integrado y verificado de extremo a extremo —
backend + frontend + CI + E2E de navegador real contra infraestructura
real (Identity + Tenancy + onboarding + Access Control + Typed
Configuration + Audit + Event Bus + Files + Notifications + App Registry).
Desde la sesión 13, la topología real de despliegue tiene dos procesos
backend separados (`apps/api` para HTTP, `apps/worker` para el outbox
dispatcher). Los 8 pasos de `docs/ARCHITECTURE.md` §17 ("Primera secuencia
de construcción") están completos, incluyendo el paso 8 ("Revisión
integral de Foundation antes de Master Data") — ver la sección inmediata
siguiente. `docs/ARCHITECTURE.md`/`docs/MULTITENANCY.md`/`docs/ROADMAP.md`
ya no llevan el encabezado "Propuesta para aprobación"; ADR-004, ADR-005,
ADR-006, ADR-007 y ADR-008 están ratificados en `docs/DECISIONS.md`.
ADR-001 (Modular Monolith), ADR-002 (PostgreSQL/Prisma) y ADR-003
(Multi-Tenancy) siguen pendientes de numeración formal — sus decisiones ya
están implementadas y verificadas repetidamente, pero no hay un documento
ADR dedicado a cada una todavía; esto no bloquea el cierre de Foundation ni
el inicio de Fase 2.

## Revisión de cierre de Foundation (MASTER_SPEC §92, sesión 22, 2026-08-30)

Revisión integral realizada antes de iniciar Fase 2, cubriendo las seis
áreas que MASTER_SPEC §92 exige al final de cada fase. No repite el detalle
ya documentado módulo por módulo en `docs/SECURITY.md` (huecos conocidos)
y `docs/DATABASE.md` (esquema); referencia esos documentos en vez de
duplicarlos.

**Architecture Review.** Los límites de módulo definidos en
`docs/ARCHITECTURE.md` §5-§6 se sostuvieron durante 22 sesiones sin una
sola violación de "un módulo no consulta tablas de otro" — cada acceso
cross-module pasa por el contrato público (`index.ts`) de su módulo. El
único patrón recurrente de fricción real fue el ciclo de carga de módulos
cuando un controller necesita guards de otro módulo que a su vez depende
del primero (RBAC/Audit/Notifications dentro de `tenants/presentation/`);
se resolvió siempre de la misma manera documentada (mover el controller al
módulo del que depende su guard) y App Registry confirma que el patrón
generaliza: al no existir esa dependencia inversa, su controller sí pudo
vivir en su propio módulo sin fricción. Los tres ciclos previstos como
posible deuda (Access Control, Configuration/Files/Notifications) están
todos resueltos y probados por `app.module.spec.ts`. No existe todavía una
fitness function de CI que falle automáticamente ante un import prohibido
(`docs/ARCHITECTURE.md` §16) — hoy se sostiene por convención y revisión,
no por una regla de lint; queda como deuda técnica aceptada, no bloqueante
para Fase 2.

**Security Review.** Cobertura real de autenticación (Argon2id, sesiones
opacas con rotación y revocación, resistencia a enumeración de cuentas),
autorización (RBAC deny-by-default, verificado con aislamiento cross-tenant
real en cada módulo que lo requiere), y un modelo de amenazas explícito
por módulo en `docs/SECURITY.md` (14 secciones). Huecos aceptados y
documentados que MASTER_SPEC §8 marca como "eventual", no como requisito
de Foundation: sin MFA, sin OAuth/OIDC/SSO, sin API Keys/Service Accounts.
Sin PostgreSQL Row Level Security (evaluado y explícitamente diferido en
`docs/ARCHITECTURE.md` §2.2/§10 — los controles de aplicación ya
verificados se consideran suficientes para Foundation). Rate limiting
existe solo en `/api/v1/auth/*`; el resto de la superficie HTTP no lo
tiene todavía (aceptable sin tráfico público real). Sin secret manager
dedicado (variables de entorno); sin escaneo de dependencias/imágenes en
CI todavía. Ninguno de estos huecos afecta la corrección del aislamiento
multi-tenant ya verificado, que es la garantía crítica de Foundation.

**Database Review.** Esquema relacional normalizado, sin una tabla
"universal" de JSON; JSONB usado únicamente donde el propio diseño ya lo
justificaba (`SettingValue.value`, `AppConfiguration.value`,
`AuditEntry.previousValues`/`newValues`, `Notification.data`) y siempre
documentado como decisión explícita, nunca por conveniencia. IDs UUID
consistentes en las 24 tablas de Foundation; `timestamptz(6)` para todo
instante, sin cadenas de fecha locales. Ninguna tabla usa `float` para
dinero — no existe todavía ningún campo monetario en Foundation, así que
esta regla (MASTER_SPEC §30) queda pendiente de su primera prueba real en
Fase 4 (Ventas). Migraciones: 12 migraciones forward-only, todas generadas
y aplicadas contra Postgres real (`prisma migrate dev`), cero drift
confirmado repetidamente vía `prisma migrate status`. Sin estrategia de
backup/PITR todavía (MASTER_SPEC §44, explícitamente "diseñar
posteriormente") — aceptable sin producción desplegada.

**Testing Review.** 332 tests unitarios (`apps/api` 237, `@erp/events` 27,
`@erp/notifications` 33, `@erp/worker` 6, `@erp/api-client` 10,
`apps/erp-web` 19) + 21 tests de integración contra Postgres real vía
Testcontainers + 6 tests E2E de Playwright con Chromium real contra la
topología completa (api + worker + erp-web + Postgres + Redis + MinIO).
Cobertura de riesgo alta (auth, tenancy, permisos, aislamiento
cross-tenant) verificada en los tres niveles, no solo unitario. Los module
wiring specs (`*.module.spec.ts`) funcionan como una fitness function
parcial de arquitectura (detectan ciclos de módulos y providers faltantes)
aunque no sean tests de arquitectura formales. Sin contract tests contra
el spec OpenAPI todavía (`docs/ARCHITECTURE.md` §12 los lista como nivel
futuro) — mitigado parcialmente por generar el SDK directamente del spec
real (sesión 21), que ya fuerza una correspondencia exacta.

**Performance Review.** Sin problema real detectado — el volumen de datos
de Foundation es de desarrollo/pruebas, no de producción. Deuda aceptada
para revisar antes de Fase 2 introducir volumen real: ningún endpoint de
listado usa paginación cursor-based todavía (`docs/ARCHITECTURE.md` §9 la
exige "donde el orden sea estable"); los listados actuales (`findAll`,
`listX`) son consultas acotadas por límites estáticos en código
(`limit`/tope 200 en Audit y Platform Users) o catálogos pequeños por
diseño (Permissions, Settings, Apps), nunca miles de filas reales todavía.
Revisar antes de que Master Data introduzca catálogos de productos/clientes
con volumen genuino.

**Technical Debt Review.** Deuda técnica consolidada, ya documentada
individualmente en `docs/SECURITY.md`/`docs/DECISIONS.md`, sin ítems
nuevos descubiertos en esta revisión: ratificación formal de ADR-001/002/003
(documentación, no reimplementación); dead-letter para el inbox de
consumidores (ADR-008); observabilidad/OpenTelemetry (`docs/ARCHITECTURE.md`
§11, nunca iniciado); entitlement/facturación SaaS conectado al App
Registry (ADR-005); registries de contribución de frontend/backend para
apps (`docs/PLUGINS.md` §8-§9); SemVer ranges para dependencias entre apps.
Ninguno de estos ítems bloquea Fase 2 — se retoman cuando el módulo de
negocio correspondiente los necesite de verdad, siguiendo el mismo
criterio de "no sobrearquitectura" aplicado durante toda Foundation
(MASTER_SPEC §59/§93).

**Conclusión.** Foundation cumple los criterios de salida de
`docs/ARCHITECTURE.md` §17 y queda cerrada formalmente. Fase 2 (Master
Data) puede comenzar sin decisiones de arquitectura pendientes que la
bloqueen.

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
  contemplado ahí). En la misma sesión, segundo bloque: escritura de
  settings a nivel PLATFORM (`ListPlatformSettingsUseCase`,
  `PlatformSettingsController` — `GET .../definitions`, `GET
  /api/v1/platform/settings`, `PUT /api/v1/platform/settings/:key`), cierra
  el hueco ya documentado en Typed Configuration ("no PLATFORM-scope write
  endpoint") ahora que el plano existe. `SetSettingValueUseCase` no cambió
  — ya era domain-complete para PLATFORM, solo le faltaba un caller HTTP
  seguro. **Verificado contra Postgres real que la propagación funciona de
  punta a punta**: un tenant real sin override propio pasa de ver el
  default de la definición a heredar el valor PLATFORM recién escrito, sin
  tocar nada de su lado. ADR-007 enmendado con esta extensión. Tercer
  bloque de la misma sesión: vista de auditoría de plataforma
  (`GET /api/v1/platform/audit-entries`), cierra el hueco de "mi
  actividad"/eventos no tenant-scoped documentado desde que Audit se
  construyó. `AuditEntryRepository.findPlatformScoped` filtra
  `WHERE tenant_id IS NULL` a nivel de query (estructural, no un filtro de
  aplicación olvidable). **Verificado contra Postgres real que un tenant
  real recién provisionado nunca aparece en esta vista**, solo eventos
  genuinamente sin tenant (registros, logins, y ahora también cambios de
  settings PLATFORM, gracias a su acción de auditoría distinta
  `configuration.platform_setting.changed`). ADR-007 enmendado de nuevo.
  Detalle completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 16").
- **Inbox / idempotencia de consumidores** (`packages/events`, Claude,
  sesión 17, ADR-008): el mecanismo que ADR-004 punto 5 dejaba
  deliberadamente diferido desde que se construyó el Event Bus (sesión
  10). `InboxMessage`/`InboxMessageRepository` (`tryClaim`/
  `markProcessed`/`markFailed`) y `consumeIdempotently` (helper de
  aplicación: claim → efecto → marcar, nunca deja que la excepción del
  efecto llegue a `DomainEventBus.publish`). Decisión clave: solo dos
  estados (`PROCESSING`/`PROCESSED`, sin `FAILED` separado — un fallo deja
  la fila reclamable tras vencer su lease, mismo mecanismo ya usado por el
  outbox) y reclamo atómico vía `SELECT ... FOR UPDATE` + captura de
  `P2002`, en vez de la transacción compartida literal que
  `docs/EVENTS.md` §9 sugiere (habría exigido rediseñar cómo cada caso de
  uso existente recibe su cliente Prisma). **Verificado contra Postgres
  real**: reclamo concurrente real (`Promise.all`, exactamente un ganador),
  recuperación de lease vencido real, y un escenario de punta a punta que
  provisiona un tenant real, despacha el outbox real, y confirma que
  redisparar manualmente el mismo evento produce exactamente un efecto de
  consumidor, no dos. Tabla nueva (migración `20260829224906_inbox_idempotency`,
  **generada y aplicada directamente contra Postgres real**).
  Deliberadamente **no** incluido: conectar un consumidor de negocio real
  (Notifications) — requiere primero extraer el módulo a un paquete
  compartido que `apps/worker` pueda importar, backlog separado. Detalle
  completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 17").
- **UI de administración de plataforma + `isPlatformAdmin` en el flujo de
  auth** (`apps/erp-web/src/features/platform-admin`, Claude, sesión 18):
  el backend de la sesión 16 (usuarios, settings PLATFORM, auditoría de
  plataforma) tenía cero superficie de frontend hasta este bloque.
  `isPlatformAdmin` ahora viaja en la respuesta de `login`/`refresh`/`me`
  (antes solo vivía en el dominio); `@erp/api-client` gana los 6 métodos
  del contrato de `platform-admin` más `listAuditEntries` (el endpoint
  tenant-scoped de la sesión 9, sin cobertura de SDK hasta ahora).
  `platform-admin-page.tsx` (pestañas Usuarios/Ajustes/Actividad) vive en
  la ruta nueva `/platform-admin`, protegida por guardia de redirección y
  por verificación en el punto de render; enlace persistente "Plataforma"
  en `ProductShell`, visible solo si `session.user.isPlatformAdmin`.
  **Bug real encontrado durante la propia verificación E2E**: `Tabs`
  mantiene los tres paneles montados permanentemente (solo alterna
  `hidden`), así que la pestaña "Actividad" solo pedía datos una vez al
  montar la página completa — deshabilitar un usuario o cambiar un ajuste
  PLATFORM en otra pestaña nunca aparecía ahí sin recargar. Corregido
  subiendo el estado de pestaña activa al componente padre y haciendo que
  el panel de auditoría vuelva a pedir datos cada vez que se activa, no
  solo al montar. **E2E real nuevo**
  (`apps/e2e/tests/platform-admin.spec.ts`): login como platform admin →
  deshabilitar un usuario objetivo → su siguiente login real es rechazado
  (`403 ACCOUNT_DISABLED`) → reactivar → editar `localization.currency` a
  nivel PLATFORM → confirmar el origen `PLATFORM` en la tabla → revisar
  "Actividad" y confirmar ambas acciones como filas nuevas.
  `isPlatformAdmin` no tiene endpoint de otorgamiento por diseño
  (ADR-007), así que el test lo otorga con una escritura directa a
  Postgres vía `pg` — el mismo mecanismo sancionado que cualquier smoke
  test manual de este proyecto; `apps/e2e/src/global-setup.ts` expone
  ahora `process.env.E2E_DATABASE_URL` para que los test files puedan
  abrir esa conexión (Playwright hereda `process.env` del proceso
  principal al bifurcar los workers — patrón documentado de la propia
  herramienta). Detalle completo en `docs/WORK_QUEUE.md`
  ("Hecho — sesión 18").
- **Notifications conectado al Event Bus** (`packages/notifications`,
  `apps/worker/src/notifications`, Claude, sesión 19): cierra el ítem 1 de
  `docs/WORK_QUEUE.md` — el inbox de la sesión 17 (ADR-008) existía pero
  nada lo usaba todavía. `Notification`/`NotificationDelivery` y sus casos
  de uso se extrajeron de `apps/api/src/core/notifications` a un paquete
  compartido nuevo, `@erp/notifications` (mismo patrón que `@erp/events` en
  la sesión 13: un token `PRISMA_CLIENT` propio que cada app satisface con
  `useExisting` sobre su propio `PrismaService`). La presentación HTTP
  (DTOs, mapeo de errores) se queda en `apps/api`, que ahora solo reexporta
  el paquete compartido — ningún import existente tuvo que cambiar.
  `apps/worker` registra `TenantProvisionedNotificationHandler`, el primer
  consumidor de negocio real de `DomainEventBus`: se suscribe a
  `tenancy.tenant.provisioned.v1` en `onModuleInit` y envuelve la llamada a
  `RequestNotificationUseCase` en `consumeIdempotently` (ADR-008), así que
  una redelivery del outbox no duplica la notificación.
  `TenantsController.provision()` (`apps/api`) ya no importa ni llama a
  Notifications en absoluto — la notificación al owner es ahora un efecto
  secundario genuino de que el evento se publique, no una llamada directa
  disfrazada. La notificación de invitación de membresía
  (`MembershipsController`, sesión 15) sigue siendo una llamada directa a
  propósito, documentado como decisión correcta y no como hueco pendiente.
  **Bug real de test encontrado al correr la suite completa** (no en el
  test aislado): 4 archivos de `apps/api` con su propio `StubInfraModule`
  minimalista (`configuration.module.spec.ts`, `files.module.spec.ts`,
  `tenants.module.spec.ts`, `platform-admin.module.spec.ts`) solo
  proveían `PrismaService`, sin la derivación `PRISMA_CLIENT` que
  `NotificationsModule` (importado transitivamente vía `TenantsModule`)
  ahora requiere — corregido replicando en cada stub el mismo
  `useExisting` que ya usa el `PrismaModule` real. **Verificado contra
  Postgres real de punta a punta, no solo con mocks**: un nuevo test de
  integración provisiona un tenant real, despacha el outbox real, confirma
  exactamente una fila `Notification` real vía los repositorios Prisma
  reales, y confirma que una redelivery manual del mismo evento no crea una
  segunda. **Smoke test manual contra la infraestructura Docker real**
  (procesos `apps/api`/`apps/worker` persistentes reconstruidos con el
  build nuevo): registro y provisioning reales → confirmado en el log real
  y separado de `apps/worker` el despacho (`claimed=1 published=1
  failed=0`) → `GET /api/v1/notifications` real confirma la notificación
  con el contenido correcto, creada enteramente por el proceso worker sin
  que `apps/api` ejecutara código de notificaciones. Detalle completo en
  `docs/WORK_QUEUE.md` ("Hecho — sesión 19").
- **Purga de archivos + Email vía SMTP + expirar/revocar/reinvitar
  invitaciones** (sesión 20): tres ítems de la cola cerrados de una vez.
  `FileObject` gana un tercer estado `PURGED` (+ columna `purged_at`,
  migración `20260830004924_file_purge_and_membership_expiry` aplicada
  contra Postgres real) y `FilePurgeScheduler` (`apps/api`, mismo patrón
  que `OutboxDispatcherScheduler`) borra de verdad el objeto S3/MinIO de
  un archivo `DELETED` pasada su ventana de retención antes de marcarlo
  `PURGED` — la fila nunca se borra físicamente. `@erp/notifications` gana
  `SmtpEmailDispatcher` (SMTP genérico, cualquier proveedor) detrás de un
  `EMAIL_DISPATCHER` opcional; `apps/api` lo provee globalmente vía
  `EmailModule` solo si `EMAIL_SMTP_HOST` está configurado — si no, el
  canal `EMAIL` falla cerrado con una razón explícita, nunca simula un
  envío. `MembershipsController.invite()` es el primer productor real que
  pasa `recipientEmail` y pide el canal `EMAIL`. `Membership` gana
  `isExpiredInvitation`/`reinvite` (usa `updatedAt`, sin columna nueva) y
  `MEMBERSHIP_INVITATION_TTL_SECONDS` (default 7 días);
  `RevokeMembershipInvitationUseCase` nuevo
  (`DELETE /api/v1/tenants/memberships/:id`) restringido a invitaciones
  `INVITED`; `InviteMembershipUseCase` ahora reabre una membership
  `REVOKED` o `INVITED`-vencida en vez de bloquear para siempre. **Bug real
  encontrado en la propia verificación E2E**: la UI duplicaba la fila del
  miembro al reinvitar después de revocar (el callback de "invitado"
  siempre agregaba, nunca actualizaba) — corregido con un upsert por id.
  **Smoke tests manuales contra Docker/Postgres/MinIO reales**: un archivo
  real subido, borrado y con `deleted_at` adelantado vía `UPDATE` directo
  fue purgado de verdad por el scheduler real; una invitación real
  confirmó en `notification_deliveries` real
  `EMAIL`/`FAILED`/`"No email adapter configured."` junto a
  `IN_APP`/`SENT`. Detalle completo en `docs/WORK_QUEUE.md`
  ("Hecho — sesión 20").
- **`@erp/api-client` generado desde OpenAPI** (`packages/api-client`,
  Claude, sesión 21): `src/generated/openapi-types.ts` se genera con
  `openapi-typescript` contra el `/api/docs-json` real de un `apps/api`
  corriendo (no un spec offline — el proceso ya necesita Postgres/Redis
  reales para arrancar, así que no hay generación "sin servidor" más
  simple); el archivo se versiona en Git, documentado en
  `packages/api-client/README.md` como excepción deliberada al patrón del
  cliente Prisma (regenerarlo exige un servidor HTTP vivo, no solo un
  schema). `contracts.ts` se reescribió por completo para derivar cada tipo
  público de `components["schemas"][...]`, preservando los 35 nombres
  exportados exactamente (verificado contra un grep de todos los imports de
  `@erp/api-client` en `apps/erp-web`) — las únicas excepciones son los
  campos de valor JSON genuinamente dinámico (sobrescritos de `Record<string,
  never>` a `unknown`) y `ApiErrorEnvelope` (el filtro de excepciones HTTP
  global, sin DTO propio). **Dos huecos reales de documentación OpenAPI
  encontrados y cerrados**: `TenantsController.listMine()`/`current()`
  devolvían tipos sin decorar (`MyTenantSummary[]`/un objeto plano inline)
  — nuevos `TenantSummaryResponseDto`/`TenantExecutionContextResponseDto`
  cierran ambos, sin cambiar el JSON serializado. **Bug real de decoradores
  Swagger encontrado y corregido en 6 archivos**: `@ApiProperty({nullable:
  true})` sin `type:` explícito en un campo `string | null` pierde el tipo
  real en el spec generado (la reflexión `design:type` de TypeScript para
  una unión resuelve a `Object`), agregando `type: String` a 14 campos
  afectados; de paso, un `enum` de `FileObjectResponseDto.status` que
  seguía sin el valor `PURGED` de la sesión 20 también se corrigió.
  Verificado con `grep -c "Record<string, never>"` que solo quedan las 12
  ocurrencias irreductibles (valores JSON dinámicos) más 2 tipos boilerplate
  de la propia herramienta. Detalle completo en `docs/WORK_QUEUE.md`
  ("Hecho — sesión 21").
- **App Registry mínimo** (`apps/api/src/core/app-registry`, Claude,
  sesión 22, ADR-005): `AppDefinition` (catálogo global code-owned,
  `FOUNDATION_APPS` vacío en producción — ningún módulo de negocio real
  más allá del Core existe todavía para registrar), `TenantApp`
  (enablement por tenant, lifecycle `ENABLED`/`DISABLED` únicamente, sin
  la máquina de estados completa de `docs/PLUGINS.md` §7), `AppConfiguration`
  (JSON opaco por tenant+app, sin catálogo propio). `validateAppCatalog`
  rechaza claves duplicadas, dependencias inexistentes y ciclos antes de
  seedear nada; `EnableAppUseCase`/`DisableAppUseCase` implementan chequeo
  real de dependencias y de dependents (`docs/PLUGINS.md` §6). Contrato
  HTTP nuevo (`GET/POST /api/v1/apps/...`), 2 permisos nuevos
  (`apps.read`/`apps.manage`), auditoría real, UI nueva ("Apps",
  `apps/erp-web/src/features/app-registry`) con estado vacío honesto en
  vez de datos de ejemplo. Cierra el último ítem restante de
  `docs/WORK_QUEUE.md` y formaliza el cierre de Foundation (ver "Revisión
  de cierre de Foundation" arriba). Tablas nuevas (migración
  `20260830041057_app_registry_foundation`, **generada y aplicada
  directamente contra Postgres real**). **Verificado con fixtures de
  prueba insertadas directamente vía SQL** (mismo patrón sancionado que el
  resto del proyecto) contra Postgres real y contra la infraestructura
  Docker persistente (limpiadas al terminar el smoke test — la única de
  las tablas de Foundation sin un `onDelete: Restrict` que lo impidiera).
  Detalle completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 22").
- 332 tests unitarios pasando (api 237, api-client 10, erp-web 19) + 27 en
  `@erp/events` + 33 en `@erp/notifications` + 6 en `@erp/worker` + 21
  tests de integración con Postgres real + **6 tests E2E de Playwright
  pasando contra infraestructura real completa** (Chromium real,
  Postgres+Redis+MinIO efímeros vía Testcontainers, API y worker
  compilados reales, Vite real), incluyendo pruebas de wiring real de
  NestJS (`auth.module.spec.ts`, `app.module.spec.ts`,
  `tenants.module.spec.ts`, `access-control.module.spec.ts`,
  `configuration.module.spec.ts`, `audit.module.spec.ts`,
  `files.module.spec.ts`, `platform-admin.module.spec.ts`,
  `app-registry.module.spec.ts` en `apps/api`;
  `outbox-dispatcher.module.spec.ts`/`notifications.module.spec.ts` en
  `@erp/events`/`@erp/notifications`; `worker.module.spec.ts` (ahora
  también verifica `TenantProvisionedNotificationHandler`) en
  `@erp/worker`) y pruebas negativas de aislamiento cross-tenant.

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

Ninguno activo — Foundation quedó formalmente cerrada en la sesión 22 (ver
"Revisión de cierre de Foundation" arriba). El siguiente bloque es Fase 2
(Master Data): Customers, Suppliers, Product Catalog, Pricing, Taxes,
Warehousing master data (`docs/ARCHITECTURE.md` §5.2).

## Pending

Ningún ítem de la cola original de Foundation queda pendiente
(`docs/WORK_QUEUE.md`). También pendiente, sin bloquear Fase 2: ratificar
ADR-001, ADR-002 y ADR-003 formalmente (ADR-004, ADR-005, ADR-006, ADR-007
y ADR-008 ya están ratificados) — sus decisiones ya están implementadas y
verificadas, solo falta el documento formal. La UI de RBAC (incluida la
invitación de miembros), el E2E de sesión, la UI de Configuración, la UI
de Platform Administration (sesión 18) y la UI de Apps (sesión 22) ya
están hechas e integradas (ver Completed); la UI de Files (subida/listado/
descarga) y de Notifications (bandeja/badge de no leídas) todavía no se
han construido — quedan como mejoras de UX sin dependencia de arquitectura,
a retomar si el usuario las pide o cuando un módulo de negocio las necesite.

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

Segundo bloque de la misma sesión (settings PLATFORM), sin migración nueva
— reutiliza `setting_definitions`/`setting_values` ya existentes. Flujo
HTTP completo repetido con el servidor real compilado: registro de un
admin y un owner de tenant reales, provisioning real → `admin` sin flag
rechazado con `403` en `GET /platform/settings/definitions` → flag
otorgado vía `UPDATE` directo → catálogo real visible → efectivo del
tenant real en `DEFAULT` antes de cualquier override → `PUT
/platform/settings/localization.currency` con `EUR` real → `GET
/platform/settings` confirma `EUR`/`PLATFORM` → **el mismo tenant real,
sin que nadie tocara nada de su lado, ahora resuelve `EUR` en `GET
/settings` en vez del `USD` de la definición** — la prueba real de que el
fallback PLATFORM → tenant funciona de punta a punta contra infraestructura
real, no solo en el test de integración → el owner del tenant (sin flag de
plataforma) rechazado con `403` al intentar escribir en
`/platform/settings` → clave inexistente rechazada con `404
SETTING_NOT_FOUND` → valor de tipo incorrecto (`12345` contra una clave
`STRING`) rechazado con `400 INVALID_SETTING_VALUE` → `SELECT` directo
sobre `audit_entries` confirma la entrada real `configuration.platform_setting.changed`
con el actor correcto y `previousValues`/`newValues` reales. Toda la data
de prueba (incluida una notificación automática de provisioning, cuya FK
había que borrar antes que el tenant) fue limpiada al terminar.

Tercer bloque de la misma sesión (vista de auditoría de plataforma), sin
migración nueva — reutiliza `audit_entries` ya existente. Flujo HTTP
completo repetido con el servidor real compilado: registro de un admin
real, un login fallido real, un segundo usuario real que provisiona un
tenant real → `admin` sin flag rechazado con `403` en
`/platform/audit-entries` → flag otorgado vía `UPDATE` directo → el
listado real muestra exactamente las entradas `tenantId: null` de toda la
plataforma (registros, logins exitosos/fallidos, incluyendo residuos
reales de sesiones/E2E anteriores) y **ninguna entrada del provisioning
del tenant real recién creado**, confirmando en runtime que el filtro
estructural `WHERE tenant_id IS NULL` funciona exactamente como se diseñó.
Toda la data de prueba fue limpiada al terminar.

**Sesión 17 (2026-08-29, Inbox / idempotencia de consumidores)**: décima
migración (`20260829224906_inbox_idempotency`) generada directamente
contra esta misma base real vía `prisma migrate dev` — agrega
`inbox_messages` con `@@unique([consumerName, messageId])`. Verificado con
`\d inbox_messages` contra el contenedor real de Docker Compose que la
estructura coincide exactamente con el schema declarado, y con un
insert/delete manual que la tabla acepta escrituras reales. La validación
principal de esta sesión ocurrió contra el Postgres efímero de
Testcontainers (mismo nivel de realismo que el resto de la suite de
integración): reclamo concurrente real de un mismo `(consumerName,
messageId)` con `Promise.all` (exactamente un ganador), recuperación real
de una fila cuyo lease de 120 segundos había vencido, y un escenario de
punta a punta que provisiona un tenant real, despacha su fila real del
outbox, y confirma que redisparar manualmente ese mismo evento produce
exactamente un efecto de consumidor — no dos. Ningún consumidor de negocio
real usa este mecanismo todavía; los tests son actualmente su único
caller.

**Sesión 18 (2026-08-29, UI de administración de plataforma)**: sin
migración nueva — reutiliza `users.is_platform_admin` (sesión 16) y las
tablas de `configuration`/`audit` ya existentes. Flujo HTTP completo
repetido con el servidor real compilado tras el rebuild de esta sesión:
registro de dos usuarios reales → `isPlatformAdmin: false` confirmado en la
respuesta real de `POST /auth/register` (campo nuevo en el DTO, antes
ausente) → flag otorgado vía `UPDATE` directo → `POST /auth/login` real
confirma `isPlatformAdmin: true` → `GET /platform/users` real lista los
tres usuarios de la base persistente → deshabilitar al usuario objetivo →
su login real es rechazado con `403 ACCOUNT_DISABLED` → reactivar →
`PUT /platform/settings/localization.currency` con `GTQ` real → `GET
/platform/settings` confirma `GTQ`/`PLATFORM` → revertido a `USD` →
`GET /platform/audit-entries` confirma ambas auditorías
(`user.status_changed`, `configuration.platform_setting.changed`) con el
actor y los valores previo/nuevo correctos. Los usuarios de prueba de esta
sesión (y de las sesiones anteriores) permanecen en la base a propósito:
`audit_entries.user_id` usa `onDelete: Restrict`, así que ningún usuario
que haya generado alguna entrada de auditoría — toda cuenta registrada
genera `user.registered` — puede eliminarse sin violar la garantía de
MASTER_SPEC §10 de que los logs de auditoría no deben poder modificarse
fácilmente; es la razón por la que esta base de desarrollo acumula cuentas
de pruebas de sesiones anteriores en vez de quedar vacía entre sesiones.

**Sesión 19 (2026-08-29, Notifications conectado al Event Bus)**: sin
migración nueva — reutiliza `notifications`/`notification_deliveries`
(sesión 12), `outbox_messages` (sesión 10) e `inbox_messages` (sesión 17)
ya existentes; el cambio es enteramente de aplicación (extracción a
`@erp/notifications` + el nuevo consumidor en `apps/worker`). Flujo real
repetido con los procesos persistentes reconstruidos: registro y
provisioning reales de un tenant → confirmado en el log real del proceso
`apps/worker` (separado de `apps/api`, verificado que sigue siendo un
proceso distinto tras el refactor) el despacho del outbox real
(`claimed=1 published=1 failed=0`) → `GET /api/v1/notifications` real
confirma exactamente una notificación `tenancy.tenant_provisioned` con el
contenido correcto — creada enteramente por `apps/worker` sin que
`apps/api` ejecutara ningún código de notificaciones, la prueba real de
que la extracción y el nuevo consumidor funcionan de punta a punta contra
infraestructura real, no solo en tests. Datos de prueba (usuario/tenant)
no eliminados por el mismo motivo `onDelete: Restrict` ya documentado
arriba.

**Sesión 20 (2026-08-29/30, purga de archivos + Email + invitaciones)**:
migración `20260830004924_file_purge_and_membership_expiry` (agrega
`PURGED` al enum `FileObjectStatus`, la columna `file_objects.purged_at` y
el índice `(status, deleted_at)`) generada y **aplicada directamente
contra Postgres real** vía `prisma migrate dev` — sin cambios de schema
para invitaciones (`isExpiredInvitation`/`reinvite` usan `updatedAt`, ya
existente) ni para Notifications (el canal EMAIL es enteramente lógica de
aplicación). Verificado con el servidor real reconstruido, arrancado
temporalmente con `FILES_PURGE_RETENTION_DAYS=1`/`FILES_PURGE_INTERVAL_MS=5000`
solo para esta comprobación: subida real de un archivo → soft-delete real
→ `deleted_at` adelantado 2 días vía `UPDATE` directo → el scheduler real
lo purgó en su siguiente tick (`File purge: purged=1 failed=0`, log real)
→ `SELECT` directo confirma `status: PURGED` con `purged_at` poblado.
Confirmado también que el objeto real fue removido de MinIO (el propio
código solo incrementa `purged` tras un `deleteObject` exitoso — un
`failed=0` en el log es la prueba). Por separado, una invitación real de
membership confirmó en `notification_deliveries` real
`EMAIL`/`FAILED`/`"No email adapter configured."` junto a `IN_APP`/`SENT`,
la ruta de fallo controlado del adapter de Email funcionando de punta a
punta sin credenciales SMTP configuradas en este entorno (el estado real,
no simulado). Servidores persistentes reiniciados con configuración normal
(`FILES_PURGE_RETENTION_DAYS=30`, intervalo de 1h) al terminar. Nota
operativa: Docker Desktop se había detenido entre el bloque anterior de
esta sesión y este (mismo patrón ya documentado en sesiones previas);
reiniciado antes de correr `test:integration`/`test:e2e`.

**Sesión 22 (2026-08-30, App Registry mínimo)**: migración
`20260830041057_app_registry_foundation` (`app_definitions`, `tenant_apps`,
`app_configurations`) generada y **aplicada directamente contra Postgres
real** vía `prisma migrate dev` — `prisma migrate status` confirma las 12
migraciones aplicadas sin drift. Flujo HTTP completo repetido con el
servidor real compilado tras el rebuild de esta sesión: registro y
provisioning reales → catálogo vacío confirmado (`GET
/api/v1/apps/definitions` → `[]`) → dos apps fixture ("products",
"manufacturing" dependiendo de "products") insertadas directamente vía
`psql` → habilitar "manufacturing" sin "products" rechazado con
`409 APP_DEPENDENCY_NOT_SATISFIED` real → habilitar "products" → habilitar
"manufacturing" (ahora exitoso) → habilitar "products" de nuevo confirma
idempotencia real (sin fila duplicada) → configurar
`default_warehouse=wh-1` para "products" → listar configuración confirma
el valor real → deshabilitar "products" mientras "manufacturing" sigue
habilitado rechazado con `409 APP_HAS_ACTIVE_DEPENDENTS` real →
deshabilitar "manufacturing" → deshabilitar "products" (ahora exitoso) →
`GET /api/v1/audit-entries` confirma las 9 entradas reales esperadas
(3 `enabled`, 3 `disabled`, 1 `app_configuration.changed`, más las de
provisioning ya conocidas). Las fixtures y filas de
`tenant_apps`/`app_configurations`/`app_definitions` de este smoke test
**fueron eliminadas al terminar** — a diferencia de la mayoría de smoke
tests de sesiones anteriores, aquí sí fue posible: ninguna de las tres
tablas nuevas tiene un `onDelete: Restrict` hacia `users` que lo
impidiera, a diferencia de `audit_entries.user_id`. El usuario/tenant de
prueba de este smoke test sí permanecen en la base, por el mismo motivo ya
documentado en sesiones anteriores.
