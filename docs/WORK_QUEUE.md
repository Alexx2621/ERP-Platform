# Work Queue

Cola única del ERP. Reemplaza el modelo histórico
`docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.

Responsable: **Claude, propietario único del desarrollo del ERP**. La cola
abarca arquitectura, backend, frontend, datos, seguridad, pruebas,
infraestructura, documentación e integración; no existe una división
permanente por agente. Última actualización técnica: 2026-08-28 (sesión 15,
endpoint de invitación de membership + UI de Miembros/Invitaciones
pendientes). Modelo operativo actualizado: 2026-08-27.

Rama de trabajo de Claude: `ai/claude`. Fuente integrada: `develop`.
Estable/releases: `main`. La rama `ai/codex` se conserva únicamente como
historial y no tiene cola propia. Codex solo puede intervenir en una tarea
aislada y explícitamente asignada; al terminar no selecciona trabajo adicional.

---

## Backlog activo — Claude (ownership end-to-end)

### Próximo, en orden de dependencia técnica

1. **System-administration plane** — necesario antes de exponer escritura de
   settings a nivel `PLATFORM` (hoy solo existe a nivel de dominio, sin
   endpoint HTTP — ver `docs/SECURITY.md` §"Typed Configuration"). No
   bloqueado, pero deliberadamente no adelantado sin una decisión de
   arquitectura explícita sobre credenciales/autorización separadas
   (`docs/ARCHITECTURE.md` §10).
2. **"Mi actividad" / vista de administración de plataforma para eventos no
   tenant-scoped** — login/logout/cambios de status de usuario se auditan
   (`tenantId: null`) pero no son consultables por ningún endpoint todavía
   (`AuditEntriesController` solo devuelve entradas tenant-scoped). No
   bloqueado, deliberadamente no construido junto con Audit para no mezclar
   una superficie de lectura nueva con la matriz de grabación
   (`docs/SECURITY.md` §"Audit").
3. **Admin endpoint para `SetUserStatusUseCase`** — el use case y su
   auditoría (`user.status_changed`) existen y están probados, pero no hay
   ningún controller que lo invoque todavía. No bloqueado.
4. **Inbox / idempotencia de consumidores** (`docs/EVENTS.md` §9) —
   deliberadamente no construido junto con el Event Bus porque hoy no existe
   ningún handler cross-proceso que lo necesite (ver ADR-004, punto 5).
   Requerido antes de registrar cualquier `DomainEventBus` handler con un
   efecto secundario no idempotente — incluyendo conectar Notifications al
   Event Bus (hoy se invoca directamente desde `TenantsController`, no vía
   `tenancy.tenant.provisioned.v1`, ver `docs/SECURITY.md` §"Notifications").
5. **Purga real de storage para archivos borrados** — `DeleteFileUseCase`
   solo marca `DELETED` en metadata; el objeto real permanece en el bucket
   indefinidamente (`docs/SECURITY.md` §"Files"). Job de retención/purga
   futuro, no bloqueado pero deliberadamente no construido junto con Files.
6. **Adapter real de Email para Notifications** — hoy solo `IN_APP` tiene
   implementación; `EMAIL`/`SMS`/`WHATSAPP`/`PUSH` son valores de canal
   reservados que producen un delivery `FAILED` explícito. Requiere elegir
   un proveedor SMTP/transaccional (no decidido todavía).
7. **`@erp/api-client` generado desde el spec OpenAPI** — hoy sigue
   mantenido a mano; ahora que `/api/docs-json` existe (sesión 14), podría
   generarse (p. ej. `openapi-typescript`) en vez de mantenerse manual. No
   bloqueado, deliberadamente no hecho junto con el spec para no arriesgar
   el SDK ya probado en un mismo cambio — refactor de proceso separado.
8. **Expirar/revocar invitaciones pendientes** — `Membership.revoke()` ya
   existe en el dominio, pero ningún endpoint lo invoca para una membership
   `INVITED`, y no hay TTL. Ver hueco documentado en `docs/SECURITY.md`
   §"Membership Invitations".

### Hecho — sesión 15 (Membership invitation endpoint + UI)

- **`apps/api/src/core/tenants/`** (backend): `InviteMembershipUseCase`
  (requiere un `User` existente y activo — `InvitedUserNotFoundError`/
  `InvitedUserDisabledError`, sin creación de cuenta por correo, MASTER_SPEC
  §90), `AcceptMembershipInvitationUseCase` (self-service, `INVITED` →
  `ACTIVE` vía `Membership.activate()` ya existente; resuelve el tenant por
  slug internamente porque el llamador todavía no tiene una membership
  `ACTIVE` con la que pasar por `TenantContextGuard`), `ListMembershipsUseCase`
  (miembros del tenant + su `User`, cualquier status), `ListPendingInvitationsUseCase`
  (invitaciones pendientes del usuario autenticado, cross-tenant por diseño
  — mismo patrón que `ListMyTenantsUseCase`). Método nuevo en
  `MembershipRepository`: `findByTenant`, `findPendingByUserId` (ambos
  implementados en Prisma y en el fake in-memory).
- **`MembershipsController`** (`tenants/presentation/`, mismo patrón de
  ubicación que `RolesController`/`AuditEntriesController` para evitar un
  ciclo de módulos): `POST /api/v1/tenants/memberships` (invitar, permiso
  nuevo `tenants.memberships.manage`), `GET /api/v1/tenants/memberships`
  (listar miembros, permiso nuevo `tenants.memberships.read`),
  `GET /api/v1/tenants/memberships/pending` (mis invitaciones pendientes,
  solo `SessionAuthGuard` — cross-tenant), `POST /api/v1/tenants/memberships/:id/accept`
  (aceptar, deliberadamente **sin** `TenantContextGuard` a nivel de clase —
  ver el docstring del controller). Invitar dispara una notificación
  `IN_APP` real al invitado (`RequestNotificationUseCase`, mismo patrón que
  `TenantsController.provision()`) y una entrada de auditoría
  (`tenants.membership.invited`/`.accepted`).
- **Sin migración nueva** — las tablas `memberships`/`tenants` ya existían;
  este bloque es lógica de aplicación y consultas nuevas sobre schema ya
  aplicado.
- Tests: 6 nuevos archivos de spec (3 use cases + wiring de módulo
  actualizado) — 186 tests unitarios totales en `apps/api` (antes 174), más
  8 tests en `@erp/api-client` (antes 7) y 16 en `erp-web` (sin cambio neto,
  una suite existente se ajustó al nuevo `<Select>` de miembro). Suite de
  integración ampliada con un escenario completo contra Postgres real:
  invitar → email desconocido rechazado → invitación duplicada rechazada →
  listado tenant-scoped correcto (aislamiento cross-tenant) → aceptación
  rechazada para un usuario distinto del invitado (IDOR-resistant) →
  aceptación real por el usuario correcto.
- **UI** (`apps/erp-web`): pestaña nueva "Miembros" en la pantalla "Roles y
  permisos" (tabla de miembros + botón "Invitar miembro" con modal), y el
  modal "Asignar rol" ahora usa un `<Select>` poblado con los miembros
  reales del tenant en vez de pedir un `membershipId` escrito a mano —
  cierra el hueco de UX ya documentado en el historial de Codex. Nueva
  sección "Invitaciones pendientes" en el tenant picker (`TenantListPage`,
  `/tenants`) con botón "Aceptar" por invitación; al aceptar, el tenant
  aparece de inmediato en "Tus espacios". 4 métodos nuevos en
  `@erp/api-client` (`inviteMembership`, `listMemberships`,
  `listPendingInvitations`, `acceptMembershipInvitation`).
- **E2E real** (`apps/e2e/tests/membership-invitations.spec.ts`, Chromium
  real vía Testcontainers): registra un segundo usuario real por API,
  invita desde la UI del owner, y usando un **segundo `BrowserContext`
  aislado** (sesión propia del invitado, sin compartir tokens en memoria con
  el owner) inicia sesión, ve la invitación pendiente, la acepta por UI, y
  confirma que el tenant aparece en su propia lista de espacios — de punta a
  punta contra infraestructura real, no simulado. `onboarding.spec.ts`
  ajustado al nuevo selector `<Select name="membershipId" label="Miembro">`.
- Documentación actualizada: `docs/SECURITY.md` (nueva sección "Membership
  Invitations" con modelo de amenazas y huecos conocidos; cerrado el hueco
  "No membership-invitation endpoint yet" ya documentado en la sección de
  RBAC, marcado con tachado).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test` en
  `@erp/api` (186/186) y `@erp/erp-web` (16/16) y `@erp/api-client` (8/8),
  `pnpm build` (7 paquetes/apps), `pnpm --filter @erp/api test:integration`
  (12/12 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (3/3 Playwright con Chromium real,
  incluyendo el nuevo test de dos contextos de navegador) — todo verde.
  Smoke test manual adicional contra la infraestructura Docker real (antes
  de escribir el E2E): registro de 3 usuarios reales, provisioning,
  invitar → email desconocido (404) → invitación duplicada (409) → listar
  miembros → aceptar con usuario incorrecto (404, IDOR-resistant) → aceptar
  con slug incorrecto (404) → aceptar correctamente (201, `ACTIVE`) →
  reaceptar (409, transición inválida) → `GET /tenants/current` confirma
  que el invitado ya resuelve contexto de tenant → sin permiso, el invitado
  no puede invitar (403) → tras asignarle el rol Owner vía RBAC ya
  existente, sí puede invitar a un tercero → `GET /audit-entries` confirma
  las auditorías nuevas. Datos de prueba limpiados después.

### Hecho — sesión 14 (OpenAPI/Swagger)

- **`@nestjs/swagger@11.4.7`** (no la última `12.x` — esa requiere
  `@nestjs/core`/`@nestjs/common` `^12.0.0`, mientras este proyecto sigue en
  Nest 11; confirmado con `pnpm peers check` antes y después del ajuste de
  versión). `main.ts` construye el documento con `DocumentBuilder` (título,
  descripción con el contrato de headers multi-tenant, `addBearerAuth`
  bajo el nombre `"session"`, un tag por bounded context) y lo publica en
  `GET /api/docs` (Swagger UI) + `GET /api/docs-json` (spec crudo) —
  **alcanzable en todo entorno deliberadamente**: el spec describe formas
  de request/response y requisitos de permiso, no secretos, así que no hay
  razón de confidencialidad para ocultarlo; reconsiderar solo si un futuro
  developer portal autenticado (MASTER_SPEC §89) lo reemplaza.
- **Los 8 controllers y sus 18 DTOs existentes quedaron decorados de
  verdad**, no solo el bootstrap: `@ApiProperty`/`@ApiPropertyOptional` en
  cada campo de cada DTO de request y de response (incluyendo los DTOs
  anidados que antes eran objetos inline sin tipar, ahora clases propias
  con su propio schema — p. ej. `SessionUserDto`,
  `ProvisionedTenantSummaryDto`), `@ApiOperation`/`@ApiResponse` por
  endpoint (incluyendo los códigos de error reales del sistema:
  `409 ROLE_NAME_IN_USE`, `404 NOTIFICATION_NOT_FOUND`, etc.), `@ApiTags`
  por módulo, `@ApiBearerAuth("session")` en todo lo que exige
  `SessionAuthGuard`. El endpoint de subida de `Files` usa
  `@ApiConsumes("multipart/form-data")` + `@ApiBody` con schema binario —
  probado que Swagger UI realmente ofrece un selector de archivo, no solo
  un campo de texto.
- **Nuevo decorador compuesto reusable `ApiTenantHeaders()`**
  (`apps/api/src/shared/swagger/api-tenant-headers.decorator.ts`):
  documenta `X-Tenant-Slug`/`X-Company-Id` una sola vez y se aplica en los
  6 controllers detrás de `TenantContextGuard` (Roles, AuditEntries,
  Notifications, Settings, Files a nivel de clase; Tenants solo en
  `current()`, ya que `provision()`/`listMine()` no usan ese guard) — evita
  repetir la misma documentación de headers 6 veces.
- **Verificado contra el servidor real, no solo compilado**: `GET
  /api/docs` y `/api/docs-json` responden `200` reales; el JSON generado
  tiene 22 rutas, 7 tags, 28 schemas; inspeccionado el schema de
  `RegisterDto`/`SessionResponseDto` campo por campo contra el JSON real
  devuelto por el servidor — coincide exactamente con las validaciones
  `class-validator` reales (`maxLength`, `minLength`, etc. se reflejan
  automáticamente desde los mismos decoradores). Confirmado que el flujo
  real (`POST /auth/register`) sigue funcionando idéntico tras decorar
  todo — Swagger es puramente aditivo, no reescribe ningún DTO/controller
  existente.
- **Bug de entorno encontrado y corregido durante esta sesión (no de
  código)**: `pnpm install` empezó a fallar con `[ERR_PNPM_IGNORED_BUILDS]`
  tras instalar `@nestjs/swagger` (arrastra `@scarf/scarf`, un paquete de
  telemetría de instalación) — bloqueaba cualquier comando de turbo que
  revisa el estado de dependencias antes de correr (incluido `typecheck`).
  Corregido rechazando explícitamente ese script (`pnpm approve-builds
  "!@scarf/scarf"`, que persiste la decisión en `pnpm-workspace.yaml`) en
  vez de aprobarlo a ciegas — no hay razón para que un paquete de telemetría
  ejecute nada en este repo. Se limpió también una entrada residual de
  `minimumReleaseAgeExclude` que apuntaba a la versión `12.0.1` descartada.
- Tests: sin tests nuevos — Swagger es metadata de decoradores sobre
  código ya probado, no lógica nueva que testear; la cobertura existente
  (174 tests api, integración, E2E) ya confirma que el comportamiento real
  no cambió. Documentado explícitamente en vez de simplemente omitido.
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  (174/174), `pnpm build` (7 paquetes), `pnpm --filter @erp/api
  test:integration` (10/10 contra Postgres real), y `pnpm --filter @erp/e2e
  test:e2e` (2/2 Playwright, con "API docs available at /api/docs"
  confirmado en el log del proceso real arrancado por el harness) — todo
  verde.

### Hecho — sesión 13 (Workers: extracción del outbox dispatcher)

- **Nuevo paquete compartido `packages/events` (`@erp/events`)**: todo el
  dominio del outbox (`OutboxMessage`, `appendOutboxMessage`,
  `DomainEventBus`, `DispatchOutboxBatchUseCase`,
  `PrismaOutboxMessageRepository`, `OutboxDispatcherScheduler`) se movió
  desde `apps/api/src/core/events/` a este paquete, con un módulo Nest
  reusable `OutboxDispatcherModule` listo para importar. Decisión
  arquitectónica clave: `PrismaOutboxMessageRepository` ya no depende de la
  clase concreta `PrismaService` de ninguna app — depende de un token DI
  `PRISMA_CLIENT` (`infrastructure/prisma-client.token`) que cada app
  consumidora provee globalmente (`useExisting` sobre su propio
  `PrismaService`), igual patrón que ya usaban `PrismaService`/`RedisService`
  en `apps/api`. Esto mantiene el paquete desacoplado de la infraestructura
  concreta de cada proceso.
- **`apps/api` ya no tiene el dispatcher en absoluto.** Solo importa
  `appendOutboxMessage`/`OutboxMessage` desde `@erp/events` (usado por
  `PrismaTenantProvisioningRepository`, sin cambios de comportamiento —
  sigue insertando dentro de la misma transacción del productor). Se quitó
  `EventsModule` de `AppModule`, y `OUTBOX_DISPATCH_INTERVAL_MS` del
  `EnvironmentVariables`/`.env` de `apps/api` (ya no aplica ahí).
- **Nueva app `apps/worker`**: composition root NestJS mínimo — importa
  `ConfigModule` (con su propio `EnvironmentVariables` reducido: solo
  `PORT`, `DATABASE_URL`, `OUTBOX_DISPATCH_INTERVAL_MS`, sin tokens/S3/rate
  limits que no le conciernen), su propio `PrismaModule` (provee tanto
  `PrismaService` como `PRISMA_CLIENT` para `@erp/events`), y
  `OutboxDispatcherModule` directamente desde el paquete compartido. Expone
  `GET /health` (liveness únicamente, MASTER_SPEC §37 — no valida
  conectividad a Postgres, ver hueco documentado en `docs/SECURITY.md`) en
  el puerto 3001 por defecto.
- **Verificado end-to-end contra Docker real, con los dos procesos
  corriendo simultáneamente**: `apps/api` (sin actividad de dispatcher en
  su propio log) aprovisionó un tenant real y escribió la fila `PENDING` al
  outbox; `apps/worker` (proceso completamente separado, puerto 3001) la
  reclamó y publicó (`claimed=1 published=1 failed=0`) — confirmado en el
  log de CADA proceso por separado, no uno combinado. La notificación
  automática de provisioning (sesión 12, llamada directa desde
  `TenantsController`, no vía el bus) se confirmó intacta tras el refactor.
- **Arnés E2E actualizado** (`apps/e2e/src/global-setup.ts`): ahora también
  arranca el proceso real de `apps/worker` (puerto 3011, distinto del 3001
  de desarrollo local para evitar colisiones) junto a Postgres/Redis/MinIO
  efímeros — la arquitectura de dos procesos se prueba de forma real, no
  simulada. `pretest:e2e` ahora compila `@erp/api` y `@erp/worker`. El log
  del E2E confirma el mismo patrón de separación de procesos que el smoke
  test manual.
- **ADR-004 enmendado** (`docs/DECISIONS.md`): se tachó la decisión
  original ("el dispatcher corre in-process en la API") y se agregó una
  sección "Amendment (2026-08-28)" completa documentando el nuevo diseño,
  sin reescribir el historial de la decisión original.
- Tests: 18 tests movidos a `packages/events` (mismos tests, mismas
  aserciones, cero tests nuevos añadidos ya que la lógica no cambió — solo
  su ubicación y cómo obtiene su conexión a Postgres) + 1 test de wiring
  nuevo (`WorkerModule wiring`) — 174 tests unitarios en `apps/api` (antes
  192, -18 por la extracción), 18 en `@erp/events`, 1 en `@erp/worker`.
  Suite de integración de `apps/api` (10/10) actualizada para importar
  desde `@erp/events` en vez de rutas internas — mismo comportamiento
  verificado contra Postgres real (incluyendo reclamo concurrente y
  recuperación de lease, que ahora también prueban indirectamente el
  paquete compartido).
- Documentación actualizada: `docs/DECISIONS.md` (ADR-004 enmendado),
  `docs/SECURITY.md` (sección Event Bus actualizada con la nueva topología
  de dos procesos y el hueco del healthcheck liveness-only),
  `docs/DATABASE.md` (rutas actualizadas a `packages/events`).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  (174 api + 18 events + 1 worker + resto sin cambios), `pnpm build`
  (7 paquetes: se agregaron `@erp/events` y `@erp/worker`),
  `pnpm --filter @erp/api test:integration` (10/10 contra Postgres real),
  y `pnpm --filter @erp/e2e test:e2e` (2/2 Playwright, ahora arrancando
  api+worker+erp-web como tres procesos reales separados) — todo verde.

### Hecho — sesión 12 (Notifications)

- **`apps/api/src/core/notifications/`** (nuevo módulo, leaf sin
  dependencias como `access-control`/`audit`/`events`): `Notification`
  (la solicitud/contenido — sin estado de entrega propio),
  `NotificationDelivery` (un intento de entrega por canal; V1 despacha
  sincrónicamente, así que una fila nace ya `SENT` o `FAILED`, nunca
  `PENDING`), `RequestNotificationUseCase` (el punto de entrada "cualquier
  módulo puede solicitar una notificación sin conocer al proveedor" de
  MASTER_SPEC §48 — deliberadamente **no expuesto por HTTP**: un endpoint
  público que dejara notificar a un usuario arbitrario sería superficie de
  abuso), `ListNotificationsUseCase`, `MarkNotificationReadUseCase` (mismo
  patrón IDOR-resistant que `GetFileDownloadUrlUseCase`: "no encontrada" y
  "de otro tenant/destinatario" devuelven el mismo `404
  NOTIFICATION_NOT_FOUND`).
- **Solo `IN_APP` tiene adapter real.** `EMAIL`/`SMS`/`WHATSAPP`/`PUSH` son
  valores de canal reservados sin implementación (`IMPLEMENTED_NOTIFICATION_CHANNELS`)
  — pedir uno produce un delivery `FAILED` explícito con `failureReason`, no
  una excepción, así que un caller que pide varios canales igual recibe los
  que sí funcionan. Mismo patrón "declarado pero diferido" que
  `BRANCH`/`WAREHOUSE` en `RoleAssignment`.
- **Contrato HTTP nuevo**: `GET /api/v1/notifications` (`unreadOnly`,
  `limit`), `PUT /api/v1/notifications/:id/read` (`204`). Vive físicamente
  en `tenants/presentation/notifications.controller.ts` por la misma razón
  que `RolesController`/`AuditEntriesController`: necesita
  `TenantContextGuard`, y `NotificationsModule` debe mantenerse sin
  dependencia de Tenants. **Sin `PermissionGuard`** — una notificación es
  siempre personal al llamador (`ctx.actor.userId`), no una acción
  administrativa con grant, mismo razonamiento que `PreferencesController`.
- **Primer productor real**: `TenantsController.provision()` llama
  `RequestNotificationUseCase` directamente (llamada de aplicación
  síncrona, no vía Event Bus) tras el provisioning exitoso, notificando al
  owner. Decisión explícita documentada en el propio controller y en
  `docs/SECURITY.md`: un handler de `DomainEventBus` con este tipo de
  efecto secundario no idempotente (crear una fila) requiere primero la
  tabla de inbox/idempotencia (ADR-004 punto 5, todavía no construida) —
  conectarlo a `tenancy.tenant.provisioned.v1` queda como backlog futuro
  (ítem 7 de esta cola), no simulado ni adelantado sin resolver esa
  dependencia.
- Tablas nuevas (migración `20260828003322_notifications_foundation`,
  generada y **aplicada contra Postgres real** vía `prisma migrate dev`, no
  solo diffeada): `notifications`, `notification_deliveries`, con FK real a
  `tenants`/`users`, `@@unique([notificationId, channel])` (duplicado de
  canal por notificación estructuralmente imposible), y `ON DELETE CASCADE`
  de delivery→notification (única tabla de Foundation donde cascade es
  correcto: una entrega no tiene sentido sin su notificación). Detalle
  completo en `docs/DATABASE.md` §"Notifications tables".
- Sin permiso RBAC nuevo — las notificaciones son personales, no
  administradas por rol (mismo criterio que `UserPreference`). Sin
  auditoría nueva — no encaja como "operación crítica" de MASTER_SPEC §10 y
  auditar una notificación sería redundante con su propia existencia.
- Tests: 6 nuevos archivos de test (2 entidades, 3 use cases, wiring de
  módulo) — 192 tests unitarios totales en `apps/api` (antes 163), todos
  pasando. Suite de integración contra Postgres real ampliada con un
  escenario completo: solicitud con 2 canales (`IN_APP` SENT + `EMAIL`
  FAILED) → FK real a tenant/recipient → aislamiento cross-tenant y
  cross-recipient (un tenant/usuario distinto no ve la notificación) →
  filtro `unreadOnly` → `markRead` rechazado con `404` desde otro tenant →
  `markRead` real → confirmación de que desaparece de `unreadOnly` pero
  sigue en el listado completo con `readAt` poblado.
- Smoke test manual contra la infraestructura Docker real: registro →
  provisioning → confirmado que se creó automáticamente la notificación
  `tenancy.tenant_provisioned` con delivery `IN_APP` `SENT` → `GET
  /notifications` y `?unreadOnly=true` la muestran → `PUT .../read` real
  (`204`) → desaparece de `unreadOnly` pero conserva `readAt` en el
  listado completo → un segundo tenant/usuario real solo ve su propia
  notificación de provisioning y recibe `404 NOTIFICATION_NOT_FOUND` al
  intentar marcar la del primero. Datos de prueba limpiados después.
  **Nota operativa** (no un bug de código): Docker Desktop se había
  detenido entre la sesión anterior y esta (el daemon no respondía);
  reiniciado antes de correr `test:integration` y el smoke test — los
  contenedores existentes (`restart: unless-stopped`) se recuperaron solos
  una vez el daemon volvió a estar arriba.
- Documentación actualizada: `docs/DATABASE.md` (nueva sección
  Notifications tables), `docs/SECURITY.md` (nueva sección Notifications
  con modelo de amenazas y huecos conocidos, incluyendo por qué no está
  conectado al Event Bus todavía).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  (192/192), `pnpm build` (5 paquetes), `pnpm --filter @erp/api
  test:integration` (10/10 contra Postgres real vía Testcontainers) — todo
  verde.

### Hecho — sesión 11 (Files: metadata + almacenamiento S3/MinIO)

- **`apps/api/src/core/files/`** (nuevo módulo): `FileObject` (metadata +
  ownership, sin las bytes del archivo — soft-delete explícito vía
  `markDeleted`, MASTER_SPEC §33), `FileStoragePort` (interfaz que
  desacopla dominio/aplicación del SDK de AWS — `S3FileStorageAdapter` es
  la única implementación), `UploadFileUseCase` (sube al storage **antes**
  de persistir el metadata — si la escritura en DB falla después, el
  resultado es un objeto huérfano inofensivo en el bucket, nunca una fila
  que reclama una key que jamás se escribió), `GetFileDownloadUrlUseCase`
  (verifica tenant/ownership antes de emitir la URL firmada — mismo patrón
  IDOR-resistant que el resto de Foundation: "no encontrado" y "de otro
  tenant" devuelven exactamente el mismo `404 FILE_NOT_FOUND`),
  `ListFilesUseCase`, `DeleteFileUseCase` (soft-delete, no borra el objeto
  real del bucket — ver hueco documentado abajo).
- **Almacenamiento real S3/MinIO** (`infrastructure/`): `S3FileStorageAdapter`
  (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, `forcePathStyle`
  configurable para MinIO vs. S3 real), `S3BucketBootstrapper` (crea el
  bucket configurado al iniciar si no existe — `docker compose up -d` +
  primer arranque es suficiente para desarrollo local, sin paso manual
  `mc mb`). Nuevas dependencias: `@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`, `multer` (+ `@types/multer`).
  `FileInterceptor` usa el almacenamiento en memoria por defecto de Multer
  — el archivo nunca toca disco local (MASTER_SPEC §22).
- **Contrato HTTP nuevo**: `POST /api/v1/files` (multipart, permiso
  `files.upload`), `GET /api/v1/files` (permiso `files.read`),
  `GET /api/v1/files/:id/download-url` (URL firmada de corta duración,
  `FILES_DOWNLOAD_URL_TTL_SECONDS`, default 300s — permiso `files.read`),
  `DELETE /api/v1/files/:id` (soft-delete, permiso `files.delete`). 3
  permisos nuevos agregados a `FOUNDATION_PERMISSIONS`. Auditoría:
  `file.uploaded`/`file.deleted` grabados desde `FilesController`, mismo
  patrón que Configuration/RBAC/provisioning.
- Tabla nueva (migración `20260827235703_files_foundation`, generada y
  **aplicada contra Postgres real** vía `prisma migrate dev`, no solo
  diffeada): `file_objects`, con FK real a `tenants`/`users`, el mismo FK
  compuesto `(tenant_id, company_id) → companies` ya usado por
  `setting_values`/`audit_entries`/`outbox_messages`, y `storage_key`
  `UNIQUE` (colisión de key estructuralmente imposible, no solo
  improbable). Detalle completo en `docs/DATABASE.md` §"Files table".
- **Bug real encontrado y corregido durante el smoke test manual contra
  MinIO real**: subir sin el campo `file` en el multipart causaba
  `file.originalname` sobre `undefined`, capturado por el filtro global de
  excepciones como un `500 INTERNAL_ERROR` genérico — no una fuga de
  seguridad (sin stack trace expuesto) pero sí un hueco de correctitud
  contrario a MASTER_SPEC §61. Corregido con una verificación explícita en
  `FilesController.upload` que devuelve `400 FILE_REQUIRED` por el
  envelope estándar. Re-verificado contra el servidor real reiniciado.
- Tests: 6 nuevos archivos de test (dominio, 4 use cases, wiring de
  módulo) — 163 tests unitarios totales en `apps/api` (antes 138), todos
  pasando. Suite de integración contra Postgres real ampliada con un
  escenario completo: subida → FK real a tenant/company/owner → aislamiento
  cross-tenant (un segundo tenant no ve ni puede descargar el archivo) →
  URL firmada real → soft-delete → confirmación de que el archivo
  desaparece de listados pero sigue recuperable por id → rechazo por FK
  compuesto de un `companyId` de otro tenant.
- Smoke test manual contra la infraestructura Docker real, **incluyendo
  MinIO real** (no solo Postgres): registro → provisioning → subida
  multipart real de un archivo → confirmado el objeto real en el bucket
  (`S3BucketBootstrapper` lo creó automáticamente en este mismo arranque)
  → `GET /files` lo lista → `GET /files/:id/download-url` devuelve una URL
  firmada real de MinIO → **el contenido descargado por esa URL coincide
  byte a byte con el archivo original** → un segundo tenant real recibe
  `404 FILE_NOT_FOUND` al intentar acceder → soft-delete real → confirmado
  que desaparece de `GET /files` y que la URL de descarga ya no se emite →
  `GET /audit-entries` confirma `file.uploaded`/`file.deleted` con el
  `correlationId` de cada request. Toda la data de prueba (filas de DB y
  objetos del bucket) limpiada después.
- **Arnés E2E actualizado** (`apps/e2e/src/global-setup.ts`): agrega un
  contenedor MinIO real vía `@testcontainers/minio` (mismo patrón que
  Postgres/Redis) y propaga `FILES_S3_*` al proceso real de `apps/api` que
  el E2E arranca. Encontrado al correr el E2E tras cablear `FilesModule`:
  sin esto, `validateEnvironment` rechazaba el arranque por faltar
  `FILES_S3_ENDPOINT`/`FILES_S3_ACCESS_KEY_ID`/`FILES_S3_SECRET_ACCESS_KEY`/
  `FILES_S3_BUCKET` (los tres primeros no tienen default deliberadamente,
  igual que `DATABASE_URL`/`REDIS_URL`). CI (`e2e` job) no necesitó cambios
  más allá de renombrar su descripción — Testcontainers gestiona MinIO
  dinámicamente dentro del propio proceso de test, igual que ya hacía con
  Postgres/Redis.
- Documentación actualizada: `docs/DATABASE.md` (nueva sección Files
  table), `docs/SECURITY.md` (nueva sección Files con modelo de amenazas y
  huecos conocidos, incluyendo el bug real de `FILE_REQUIRED` encontrado
  durante el smoke test y que no hay purga real de storage al borrar).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  (163/163), `pnpm build` (5 paquetes), `pnpm --filter @erp/api
  test:integration` (9/9 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (2/2 Playwright con Chromium real,
  ahora también contra MinIO real vía Testcontainers, confirmado en el log
  del servidor real: `S3BucketBootstrapper` creando el bucket efímero) —
  todo verde.

### Hecho — sesión 10 (Event Bus / transactional outbox)

- **`apps/api/src/core/events/`** (nuevo módulo, leaf sin dependencias como
  `access-control`/`audit`): `OutboxMessage` (entidad de dominio con
  `markProcessing`/`markPublished`/`markFailed`, backoff exponencial
  cap 300s, dead-letter a `FAILED` tras 5 intentos),
  `appendOutboxMessage(client, input)` (función pura que inserta usando el
  cliente Prisma/transacción que el llamador ya tenga abierto — nunca abre
  su propia transacción, para garantizar atomicidad real con la escritura
  de estado del productor), `DomainEventBus` (pub/sub in-process, sin
  persistencia propia — la durabilidad viene enteramente de la fila de
  outbox ya comprometida antes de invocar el bus), `DispatchOutboxBatchUseCase`
  (reclama un lote vía `FOR UPDATE SKIP LOCKED`, publica cada mensaje en el
  bus, marca `PUBLISHED` o aplica backoff/dead-letter), `OutboxDispatcherScheduler`
  (poll periódico con `setInterval` nativo administrado por el ciclo de vida
  `OnModuleInit`/`OnModuleDestroy` de Nest — decisión explícita de no usar
  `@nestjs/schedule` ni BullMQ para esto, ver ADR-004).
- Tabla nueva (migración `20260827232432_event_bus_outbox`, generada y
  **aplicada contra Postgres real** vía `prisma migrate dev`, no solo
  diffeada): `outbox_messages`, con FK a `tenants`/`users` y el mismo patrón
  de FK compuesto `(tenant_id, company_id) → companies` ya usado por
  `setting_values`/`audit_entries`. Detalle completo en
  `docs/DATABASE.md` §"Event Bus / transactional outbox table".
- **Primer productor real**: `PrismaTenantProvisioningRepository.create()`
  ahora hace `appendOutboxMessage` dentro de la misma `$transaction` que ya
  crea tenant/membership/organization/company, publicando
  `tenancy.tenant.provisioned.v1` (payload: ids/códigos de tenant,
  organización, compañía, membership del owner). `correlationId` propagado
  desde el request HTTP (`request.correlationId`) hasta el use case y el
  repositorio.
- **ADR-004 ratificado** (`docs/DECISIONS.md`): documenta las 7 decisiones
  concretas de implementación V1 — atomicidad vía cliente Prisma pasado
  explícitamente (no un servicio con conexión propia), bus in-process (no
  BullMQ) para el fan-out, dispatcher in-process con `setInterval` (no
  `apps/worker` todavía), `FOR UPDATE SKIP LOCKED` vía raw SQL, ausencia
  deliberada de `inbox_messages` hasta que exista un consumidor cross-proceso
  real, política de retry/backoff, y la convención de nomenclatura ya usada.
- Tests: 5 nuevos archivos de test (dominio, `appendOutboxMessage`,
  `DomainEventBus`, `DispatchOutboxBatchUseCase`, wiring de módulo) — 138
  tests unitarios totales en `apps/api` (antes 120), todos pasando. Suite de
  integración contra Postgres real ampliada con 3 escenarios: (1) outbox
  insertado en la misma transacción que el provisioning real, despachado de
  punta a punta y confirmado `PUBLISHED`; (2) reclamo concurrente real de 4
  filas por dos claimants simultáneos vía `Promise.all`, sin solapamiento de
  IDs (verifica `FOR UPDATE SKIP LOCKED` bajo carga real, no solo en teoría);
  (3) recuperación de una fila `PROCESSING` cuyo lease expiró, sin que un
  segundo worker haya "crasheado" realmente — solo pasa el tiempo de lease.
- Smoke test manual contra la infraestructura Docker real (no
  Testcontainers): registro → provisioning de tenant real → confirmado
  exactamente 1 fila `PENDING` en `outbox_messages` con el payload correcto
  → dispatcher ejecutado → fila pasa a `PUBLISHED` con `publishedAt`
  poblado. Confirmado en el log real que hoy no hay ningún handler
  registrado para `tenancy.tenant.provisioned.v1` (el bus lo señala como
  DEBUG, no error) — el primer consumidor real queda para Notifications.
  Datos de prueba limpiados después.
- Documentación actualizada: `docs/DATABASE.md` (nueva sección Event Bus /
  transactional outbox table), `docs/SECURITY.md` (nueva sección Event Bus
  con modelo de amenazas y límites conocidos, incluyendo que ningún handler
  de producción está registrado todavía), `docs/DECISIONS.md` (ADR-004
  ratificado, header actualizado para quitarlo de la lista de pendientes).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test` (138/138),
  `pnpm build` (5 paquetes), `pnpm --filter @erp/api test:integration`
  (8/8 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (2/2 Playwright con Chromium real, sin
  regresiones) — todo verde.

### Hecho — sesión 9 (Audit append-only)

- **`apps/api/src/core/audit/`** (nuevo módulo, leaf sin dependencias como
  `access-control`): `AuditEntry` (append-only, sin update/delete en ningún
  nivel — dominio, aplicación, ni interfaz de repositorio),
  `RecordAuditEntryUseCase` (el único punto de escritura, **nunca lanza** —
  atrapa cualquier fallo del repositorio y lo loguea, para que un problema
  de auditoría nunca convierta una acción exitosa del usuario en un 500),
  `ListAuditEntriesUseCase` (solo entradas tenant-scoped, límite máximo 200).
- **Matriz de auditoría cubierta** (los cinco bloques pedidos):
  autenticación (`user.registered`, `auth.login.succeeded`/`.failed`,
  `auth.logout`, `auth.sessions.revoked_all` — todas en `AuthController`),
  cambios de estado (`user.status_changed`, dentro de
  `SetUserStatusUseCase` mismo, ya que no existe controller que lo invoque
  todavía), provisioning (`tenant.provisioned` +
  `access_control.owner_role.seeded`, en `TenantsController.provision()`,
  compartiendo `correlationId` por ser la misma operación lógica),
  asignaciones RBAC (`access_control.role.created`,
  `access_control.role_assignment.created`, en `RolesController`), cambios
  de configuración (`configuration.setting.changed`, en
  `SettingsController.set()`, capturando el valor efectivo *previo* — con
  su scope de origen — antes de escribir el nuevo).
- **Decisión de diseño explícita**: grabado a nivel de controller (no
  inyectado dentro de `LoginUseCase`/`ProvisionTenantUseCase`/etc.) para no
  tocar las firmas públicas de esos use cases ni su cobertura de tests
  existente — el costo es que la escritura de auditoría no comparte
  transacción de base de datos con la acción que describe (mismo tipo de
  compromiso ya aceptado para el auto-seed del rol Owner). Documentado en
  detalle en `docs/SECURITY.md` §"Audit".
- **`GET /api/v1/audit-entries`** — nuevo endpoint, requiere el nuevo
  permiso `audit.entries.read`. Vive físicamente en `tenants/presentation/`
  (no en `audit/`) por la misma razón que `RolesController`: necesita
  `TenantContextGuard`/`CurrentTenantContext`, y `AuditModule` debe
  mantenerse sin dependencia de Tenants para que Auth/Users/Tenants/Access
  Control/Configuration puedan depender de él sin ciclo.
- Tabla nueva (migración `20260827194023_audit_foundation`, generada y
  **aplicada contra Postgres real** vía `prisma migrate dev`, no solo
  diffeada): `audit_entries`, con FK real a `users`/`tenants` y el mismo
  patrón de FK compuesto `(tenant_id, company_id) → companies` ya usado por
  `setting_values`. Detalle completo en `docs/DATABASE.md` §"Audit table".
- Nuevo permiso `audit.entries.read` agregado a `FOUNDATION_PERMISSIONS`.
- Tests: 11 nuevos tests unitarios (dominio, ambos use cases —incluyendo
  el contrato "nunca lanza" contra un repositorio que falla—, wiring de
  módulo) — 120 tests unitarios totales en `apps/api` (antes 109), más el
  test existente de `SetUserStatusUseCase` reescrito para su nueva firma de
  entrada. Suite de integración contra Postgres real ampliada con un
  escenario completo: aislamiento cross-tenant con dos tenants reales, y
  **el mismo contrato "nunca lanza" verificado contra una violación de FK
  real de Postgres**, no solo un mock.
- Smoke test manual contra la infraestructura Docker real (no
  Testcontainers): registro → login fallido → provisioning con compañía →
  creación de rol → cambio de setting → `GET /api/v1/audit-entries`
  devuelve exactamente las 4 entradas tenant-scoped esperadas (provisioning
  y auto-seed del Owner comparten `correlationId`), con `previousValues`
  del cambio de setting mostrando correctamente el valor efectivo anterior
  (`{"value":"USD","source":"DEFAULT"}`) — confirmado que login/registro
  (tenantId null) NO aparecen en la vista tenant-scoped, y que un segundo
  tenant real solo ve sus propias 2 entradas. Datos de prueba limpiados
  después.
- Documentación actualizada: `docs/DATABASE.md` (nueva sección Audit
  table), `docs/SECURITY.md` (nueva sección Audit con modelo de amenazas y
  huecos conocidos; cerrados los tres huecos de auditoría ya documentados
  en las secciones de Authentication/RBAC/Configuration, marcados con
  tachado en vez de borrados para conservar el historial de la decisión).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test` (120/120),
  `pnpm build` (5 paquetes), `pnpm --filter @erp/api test:integration`
  (5/5 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (2/2 Playwright con Chromium real, sin
  regresiones pese a instrumentar seis rutas distintas con llamadas de
  auditoría) — todo verde.

### Hecho — sesión 8 (integración de UI de Configuración + SDK + E2E de `ai/codex`)

Revisado como Tech Lead e integrado sin cambios de código — los 2 commits
eran correctos tal cual, ambos consistentes con el contrato HTTP real
publicado en la sección Codex de este mismo archivo:

- **`b29d70b` (feat(erp-web): show temporary development progress)** —
  panel estático de avance del roadmap en el workspace (`development-progress-panel.tsx`),
  sin llamadas a backend, explícitamente etiquetado como indicador interno
  ("No representa horas, presupuesto ni fecha de entrega"). Detectado durante
  la revisión: su lista de "próximos hitos" seguía nombrando "Configuración
  tipada" como pendiente pese a que ya se integró en el commit padre directo
  (`429b93b`) — corregido en un commit de seguimiento propio (no se reescribió
  el commit de Codex) junto con esta actualización de documentación.
- **`febd05c` (feat(erp-web): add settings management)** — pantalla
  "Ajustes" completa (`features/configuration/settings-page.tsx`) con
  pestañas Ajustes/Preferencias, editor de valor consciente de `dataType`
  (texto/número/booleano/JSON), y los 5 métodos nuevos en `@erp/api-client`
  (`listSettingDefinitions`, `listEffectiveSettings`, `setSettingValue`,
  `listUserPreferences`, `setUserPreference`) — verificados campo por campo
  contra los DTOs reales del backend. Codifica la restricción de seguridad
  de PLATFORM directamente en TypeScript (`WritableSettingScope =
  Exclude<SettingScope, "PLATFORM">`) y en el copy de la UI ("Los valores de
  plataforma son de solo lectura"), en vez de inventar una UI de
  administración de plataforma que no existe. E2E real (Testcontainers +
  API compilada + Vite) cubre catálogo → efectivo → override COMPANY
  (verificado que gana sobre el valor por defecto en la vista) →
  preferencia nueva, con los bodies de request verificados contra la forma
  real de los DTOs.
- Validación completa ejecutada por mí tras el merge: `pnpm lint`,
  `pnpm typecheck`, `pnpm test` (132 tests: api 109, api-client 7,
  erp-web 16), `pnpm build` (5 paquetes), `pnpm --filter @erp/api
  test:integration` (4/4 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (**2/2 Playwright con Chromium real**)
  — todo verde. Nota operativa: la primera corrida de E2E chocó con
  procesos `node`/`vite` huérfanos de sesiones anteriores ocupando los
  puertos 3000/5173; liberados y la corrida se repitió limpia antes de
  darla por válida — ver también la corrección de contenido del panel de
  avance arriba. Merge sin conflictos (`ai/codex` era ancestro lineal
  directo de mi commit de Typed Configuration).

### Hecho — sesión 7 (Typed Configuration)

- **`apps/api/src/core/configuration/`** (nuevo módulo): `SettingDefinition`
  (catálogo global code-owned, 3 claves fundacionales:
  `localization.currency`, `localization.timezone`, `localization.locale`,
  MASTER_SPEC §29), `SettingValue` (valor concreto en un scope
  `PLATFORM`/`TENANT`/`COMPANY`), `UserPreference` (preferencia global al
  usuario, sin catálogo — MASTER_SPEC §28). Resolución con fallback real
  COMPANY → TENANT → PLATFORM → default de la definición
  (`GetEffectiveSettingUseCase`).
- **Contrato HTTP nuevo** (detalle completo en la sección Codex más abajo):
  `GET /api/v1/settings/definitions`, `GET /api/v1/settings`,
  `PUT /api/v1/settings/:key`, `GET /api/v1/preferences`,
  `PUT /api/v1/preferences/:key`.
- **Decisión de seguridad explícita**: la escritura a nivel `PLATFORM` NO
  está expuesta por HTTP — `SetSettingValueDto.scopeType` solo acepta
  `TENANT`/`COMPANY`. El dominio y la aplicación sí soportan `PLATFORM`
  completo (para uso futuro por un plano de administración de plataforma
  que todavía no existe), pero exponerlo hoy le permitiría a cualquier
  admin de tenant sobreescribir el default global de todos los tenants —
  una escalación de privilegios real, no una feature faltante. Documentado
  en `docs/SECURITY.md` §"Typed Configuration" y en el docstring de
  `SettingsController`.
- Tablas nuevas (migración `20260827183903_typed_configuration`, generada y
  **aplicada contra Postgres real** vía `prisma migrate dev`, no solo
  diffeada): `setting_definitions`, `setting_values`, `user_preferences`.
  Detalle completo en `docs/DATABASE.md` §"Configuration tables". El FK
  compuesto `setting_values(tenant_id, company_id) → companies(tenant_id, id)`
  reutiliza exactamente el mismo patrón de seguridad de tenant que
  `role_assignments` de RBAC.
- 2 permisos nuevos agregados a `FOUNDATION_PERMISSIONS`:
  `configuration.settings.read`, `configuration.settings.manage` — nota:
  por el hueco ya documentado de "no hay backfill retroactivo de permisos",
  cualquier tenant aprovisionado *antes* de este cambio no los tendrá
  automáticamente en su rol Owner (sin impacto real hoy: no hay tenants de
  producción).
- Tests: 29 nuevos tests unitarios (dominio, use cases, wiring de módulo) —
  109 tests unitarios totales en `apps/api` (antes 80), todos pasando. Suite
  de integración contra Postgres real ampliada con un escenario completo:
  cadena de resolución PLATFORM→TENANT→COMPANY→default con datos reales,
  aislamiento cross-tenant, y el catch de `P2003`→`CompanyNotFoundInTenantError`
  para un `companyId` de otro tenant.
- Smoke test manual contra la infraestructura Docker real (no
  Testcontainers): registro → aprovisionamiento con compañía → catálogo de
  3 definiciones → efectivos en default → `PUT` TENANT → efectivo resuelve a
  TENANT → `PUT` COMPANY → efectivo con `X-Company-Id` resuelve a COMPANY
  (no a TENANT) → `companyId` de otro tenant rechazado con
  `404 COMPANY_NOT_FOUND` → valor de tipo incorrecto rechazado con
  `400 INVALID_SETTING_VALUE` → clave desconocida rechazada con
  `404 SETTING_NOT_FOUND` → preferencia de usuario creada y leída sin
  necesitar contexto de tenant. Datos de prueba limpiados después.
- Documentación actualizada: `docs/DATABASE.md` (nueva sección
  Configuration tables), `docs/SECURITY.md` (nueva sección Typed
  Configuration con modelo de amenazas y huecos conocidos, incluyendo la
  decisión explícita de no exponer `PLATFORM` por HTTP todavía).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test` (109/109),
  `pnpm build` (5 paquetes), `pnpm --filter @erp/api test:integration`
  (4/4 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (2/2 Playwright con Chromium real, sin
  regresiones tras registrar las nuevas rutas) — todo verde.

### Hecho — sesión 6 (integración de UI de RBAC + E2E de ciclo de sesión de `ai/codex`)

Revisado como Tech Lead e integrado sin cambios — los 2 commits eran
correctos tal cual, ambos consistentes con el contrato HTTP real publicado
en la sección Codex de este mismo archivo:

- **`9561cf7` (feat(erp-web): add roles and permissions management)** —
  pantalla "Roles y permisos" en `apps/erp-web` (`features/access-control/
  roles-permissions-page.tsx`) con pestañas Roles/Permisos (`Tabs`), tabla
  de roles con acción "Asignar" (`Table`), modales de creación de rol y
  asignación (`Modal`/`Select`), y los 4 métodos nuevos en
  `@erp/api-client` (`listRoles`, `listPermissions`, `createRole`,
  `assignRole`) con sus tipos en `contracts.ts` — verificados campo por
  campo contra los DTOs reales del backend (`RoleResponseDto`,
  `PermissionResponseDto`, `RoleAssignmentResponseDto`). Correctamente
  **no** inventa un flujo de invitación de membership: el formulario de
  asignación pide un `membershipId` ya existente y lo dice explícitamente
  en la propia pantalla ("La API todavía no ofrece invitaciones, listado de
  miembros ni consulta de asignaciones") — respeta el hueco real documentado
  en `docs/SECURITY.md`/ítem 8 de esta cola en vez de simularlo.
- **`8814a5e` (test(e2e): cover authentication session lifecycle)** —
  extiende `apps/e2e/tests/onboarding.spec.ts` para cubrir, dentro del mismo
  flujo real contra infraestructura real (Testcontainers + API compilada +
  Vite): rotación de tokens en refresh (`accessToken`/`refreshToken`
  distintos al reemitidos), replay de un refresh token ya rotado (`401
  UNAUTHENTICATED`, código real del backend, no inventado), navegación real
  a "Roles y permisos" y creación/asignación de un rol vía la UI nueva de
  Codex, logout (`204`) y confirmación de revocación (`GET /auth/me` con el
  token ya revocado responde `401 SESSION_REVOKED`, también un código real
  existente), y bloqueo de rutas protegidas tras logout. Nuevo
  `apps/e2e/tests/authentication.spec.ts` cubre login con credenciales
  inválidas para cuenta existente vs. inexistente, verificando el mismo
  mensaje de error en ambos casos (resistencia a enumeración de cuentas,
  ADR-006). Nuevas pruebas unitarias en `auth-context.spec.tsx` para
  coalescencia de refresh concurrente y limpieza de sesión ante fallo de
  refresh.
- Validación completa ejecutada por mí tras el merge: `pnpm lint`,
  `pnpm typecheck`, `pnpm test` (98 tests: api 80, api-client 6, erp-web 12),
  `pnpm build` (5 paquetes), `pnpm --filter @erp/api test:integration`
  (3/3 contra Postgres real vía Testcontainers), y
  `pnpm --filter @erp/e2e test:e2e` (**2/2 Playwright con Chromium real**,
  contra Postgres+Redis efímeros, API compilada real y Vite real) — todo
  verde. Merge sin conflictos (`ai/codex` era ancestro lineal directo de mi
  commit de RBAC).

### Hecho — sesión 5 (Access Control / RBAC)

- **`apps/api/src/core/access-control/`** (nuevo módulo): `Permission`
  (catálogo global code-owned, `FOUNDATION_PERMISSIONS` = `access.roles.read`,
  `access.roles.manage`, `access.permissions.read`), `Role` (tenant-scoped,
  agrupa permisos), `RoleAssignment` (otorga un Role a un Membership en scope
  `TENANT`/`COMPANY` — `BRANCH`/`WAREHOUSE` diferidos porque esas entidades
  no existen aún), `PermissionGuard` + `@RequirePermission()` deny-by-default
  (`docs/MULTITENANCY.md` §9.3). `SeedOwnerRoleUseCase` crea automáticamente
  un rol "Owner" con todos los permisos vigentes al aprovisionar un tenant.
- Tablas nuevas (migración `20260827021429_rbac_foundation`, generada y
  **aplicada contra Postgres real** vía `prisma migrate dev`, no solo
  diffeada): `permissions`, `roles`, `role_permissions`, `role_assignments`.
  Detalle completo en `docs/DATABASE.md` §"Access Control tables".
- Bug arquitectónico real encontrado y corregido durante la implementación:
  `RolesController` vivía físicamente en `access-control/` pero necesitaba
  `TenantContextGuard`/`CurrentTenantContext` de `tenants/` — eso creaba un
  ciclo de carga de módulos a nivel de `require`/`import` (tenants →
  access-control → tenants) que no aparecía como ciclo de DI de NestJS pero
  sí rompía en runtime (`CurrentTenantContext is not a function`),
  descubierto recién al correr la suite de tests completa. Solución: mover
  `RolesController` a `tenants/presentation/roles.controller.ts` (donde
  físicamente pertenece por sus dependencias de guard/contexto), e importar
  todo lo de dominio de RBAC (use cases, DTOs, `PermissionGuard`,
  `handleAccessControlError`) desde el contrato público de `access-control`.
  `AccessControlModule` mantiene cero dependencia de Tenants.
- Tests: 12 nuevos archivos de test (dominio, use cases, guard, wiring de
  módulo) — 80 tests unitarios totales en `apps/api` (antes 45), todos
  pasando. Suite de integración contra Postgres real (Testcontainers)
  ampliada con un escenario de RBAC completo: scoping TENANT vs. COMPANY,
  aislamiento cross-tenant vía el FK compuesto, y el catch de
  `P2003`→`MembershipNotFoundInTenantError` para un `membershipId`
  inexistente — verificado con datos reales, no solo con fakes en memoria.
- Smoke test manual contra la infraestructura Docker real (no
  Testcontainers): registro → aprovisionamiento de tenant → verificado que
  el rol "Owner" se auto-sembró con los 3 permisos vigentes → `GET
  /api/v1/roles` y `GET /api/v1/permissions` responden 200 con el owner →
  un segundo membership real sin asignaciones de rol recibe `403
  PERMISSION_DENIED` en el mismo endpoint. Datos de prueba limpiados después.
- Documentación actualizada: `docs/DATABASE.md` (nueva sección Access
  Control tables), `docs/SECURITY.md` (nueva sección Access Control / RBAC
  con modelo de amenazas y huecos conocidos, incluyendo el hueco real de
  "no hay endpoint de invitación de membership" descubierto durante el
  smoke test).
- Validación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test` (80/80),
  `pnpm build` — los 5 paquetes del monorepo, no solo `@erp/api` — y
  `pnpm --filter @erp/api test:integration` (3/3 contra Postgres real vía
  Testcontainers), todo verde.

### Corrección de esta sesión (no es trabajo nuevo, es un error de esta cola)

`docs/EVENTS.md` (338 líneas) y `docs/PLUGINS.md` (368 líneas) **no están
vacíos** — tienen diseños completos de Event Architecture V1 y Plugin
Architecture V1 desde el commit inicial del repositorio (`11e7343`). Yo
afirmé lo contrario en sesiones anteriores de este archivo sin haberlos
leído; fue un error mío, detectado por el usuario. Consecuencia real: los
ítems 4 (Event Bus) y una futura App Registry ya tienen especificación
lista (schemas de outbox, envelope, taxonomía, testing obligatorio en
EVENTS.md; manifest, lifecycle, dependency graph en PLUGINS.md) — lo que
falta es implementarlos y, eventualmente, ratificarlos como ADR-004/ADR-005
formales, no escribir el diseño.

### Hecho — sesión 4 (integración de suite E2E + Design System)

Revisado como Tech Lead e integrado sin cambios: los 2 commits eran
correctos tal cual.

- **`apps/e2e`** (Playwright): E2E de navegador real. `global-setup.ts`
  levanta PostgreSQL y Redis efímeros vía Testcontainers, corre mis
  migraciones reales, arranca el proceso compilado real de `apps/api` y el
  dev server real de Vite para `erp-web`, espera señales HTTP concretas
  (401 de `/auth/me` sin token, 200 de erp-web) antes de continuar. El test
  (`onboarding.spec.ts`) cubre registro → onboarding → workspace por UI,
  verificando código de respuesta HTTP real (201) y cuerpo de la respuesta
  de `/auth/register` y `/tenants`, más el estado final de la UI. Sube el
  límite de rate-limiting solo en el entorno E2E (`LOGIN_RATE_LIMIT_MAX=50`
  vía env var) — no toca el default de producción.
- **Primitivos de UI nuevos** (`apps/erp-web/src/shared/ui`): `Table`,
  `Modal`, `Select`, `Tabs`. `Modal` usa el elemento nativo `<dialog>`
  (focus trap y ESC gratis, sin dependencia nueva). `Tabs` implementa el
  patrón WAI-ARIA completo (roving tabindex, navegación con flechas/
  Home/End). Mismos tokens de Tailwind + CSS custom properties que los
  componentes existentes — sin patrón de estilos inconsistente ni
  dependencia de UI pesada introducida.
- **CI**: nuevo job `e2e` (instala Chromium de Playwright, corre la suite,
  sube el reporte HTML como artifact en cualquier resultado no cancelado).
- Validación completa ejecutada por mí: `pnpm install --frozen-lockfile`,
  lint, typecheck, 66 tests unitarios (api 54, api-client 4, erp-web 8:
  +4 de los nuevos primitivos), 2 tests de integración con Postgres real,
  **1 test E2E de Playwright con Chromium real, pasando contra
  Postgres+Redis+API+erp-web reales**, build de los 5 paquetes. `develop`
  y `ai/claude` empujados a origin en `aae6c5c`.
- Detectado y corregido: `.claude/settings.local.json` (hooks locales del
  usuario apuntando a `127.0.0.1:47321`) no estaba en `.gitignore` — se
  agregó la entrada; el archivo en sí nunca se integró al repo.

### Hecho — sesiones 1-3 (resumen; detalle en versiones previas de este archivo)

Auditoría de integración auth+tenancy, Redis, Docker verificado con
Postgres/Redis reales, integración HTTP de Tenant Context probada
end-to-end, integración de ERP Web + `@erp/api-client` + Testcontainers +
CI base (sesión 3). Bug real encontrado y corregido: `"incremental": true`
en tsc dejaba `dist/` incompleto sin fallar el build.

---

## Historial integrado — contribuciones anteriores de Codex

Esta sección conserva información técnica útil de trabajos ya integrados. No
es una cola activa, no concede ownership continuo y no autoriza a Codex a
seleccionar tareas. Claude es responsable de mantener, extender y validar todo
este código desde el cambio de modelo operativo.

### Trabajo completado e integrado

- ~~E2E tests (Playwright)~~ — hecho, integrado (sesión 4).
- ~~Expandir el Design System (Table/Modal/Select/Tabs)~~ — hecho, integrado
  (sesión 4).
- ~~UI de RBAC ("Roles y permisos")~~ — hecho, integrado (sesión 6,
  `9561cf7`). Ver "Hecho — sesión 6" arriba para el detalle completo.
- ~~E2E del ciclo completo de sesión (rotación, replay, revocación,
  logout)~~ — hecho, integrado (sesión 6, `8814a5e`). Ver "Hecho — sesión 6"
  arriba.
- ~~UI de Configuración ("Ajustes") + SDK + E2E~~ — hecho, integrado
  (sesión 8, `febd05c`). Ver "Hecho — sesión 8" arriba para el detalle
  completo.
- ~~Panel de avance de desarrollo~~ — hecho, integrado (sesión 8,
  `b29d70b`, con una corrección de contenido de seguimiento). Ver "Hecho —
  sesión 8" arriba.

### Contrato HTTP de referencia para RBAC (ya consumido por la UI integrada)

El backend de Access Control/RBAC está implementado, probado (unit +
integración con Postgres real) y verificado con un smoke test manual contra
la infraestructura Docker real (ver "Hecho — sesión 5" arriba), y ahora
también consumido de punta a punta por la UI de `apps/erp-web` y por el E2E
de Playwright (ver "Hecho — sesión 6"). El contrato HTTP real es:

- `GET /api/v1/roles` — catálogo de roles del tenant activo. Requiere
  `SessionAuthGuard` + `TenantContextGuard` + `PermissionGuard` con
  `access.roles.read`. Responde `RoleResponseDto[]`: `{ id, name, isSystem,
  permissionKeys: string[] }`.
- `GET /api/v1/permissions` — catálogo global de permisos disponibles.
  Requiere `access.permissions.read`. Responde `PermissionResponseDto[]`:
  `{ key, description }`. Hoy solo 3 permisos existen:
  `access.roles.read`, `access.roles.manage`, `access.permissions.read`.
- `POST /api/v1/roles` — crear rol. Requiere `access.roles.manage`. Body:
  `{ name: string, permissionKeys: string[] }`. `201` con `RoleResponseDto`.
  Errores: `409 ROLE_NAME_IN_USE`, `400 UNKNOWN_PERMISSION_KEYS` (con
  `details.keys`).
- `POST /api/v1/roles/:id/assignments` — asignar rol a un membership.
  Requiere `access.roles.manage`. Body: `{ membershipId: string, scopeType:
  "TENANT" | "COMPANY", scopeId?: string }` (`scopeId` requerido solo si
  `scopeType` es `COMPANY`; **no** existe todavía `BRANCH`/`WAREHOUSE`, ver
  hueco en `docs/SECURITY.md`). `201` con `RoleAssignmentResponseDto`.
  Errores: `404 ROLE_NOT_FOUND`, `404 MEMBERSHIP_NOT_FOUND`, `409
  ROLE_ASSIGNMENT_DUPLICATE`.
- Cualquier ruta protegida por `PermissionGuard` sin el permiso requerido
  responde `403 PERMISSION_DENIED`.
- Envelope de error igual al ya usado (`statusCode/code/message/details/correlationId`).

~~**Hueco que sigue vigente...**~~ — cerrado en la sesión 15: el endpoint
`POST /api/v1/tenants/memberships` ya existe, y la pantalla "Roles y
permisos" ya invita miembros y asigna roles usando un selector real de
miembros, sin pedir un `membershipId` escrito a mano. Ver "Hecho — sesión
15" arriba.

### Estado operativo actual

- No existe una asignación permanente para Codex ni una cola secundaria.
- Claude continuará con el ítem 1 de "Próximo" y cualquier superficie de UI,
  SDK, pruebas o documentación que ese bloque requiera.
- Si el usuario o Claude asignan a Codex una tarea aislada, debe registrarse con
  alcance, criterios de aceptación, rama y validación explícitos; esa asignación
  termina al entregar el alcance indicado.
- `docs/EVENTS.md` y `docs/PLUGINS.md` ya contienen diseños completos; deben
  conservarse como fuente técnica para la implementación y ratificación de sus
  ADR.
- ~~El flujo completo "invitar usuario → asignar rol" continúa bloqueado...~~
  — cerrado en la sesión 15, ver "Hecho — sesión 15" arriba.

---

## Blocked

Nada bloqueado por infraestructura — Docker, PostgreSQL, Redis y MinIO
están arriba y verificados. `docker compose up -d` debe seguir corriendo
para desarrollo local (incluye ahora Chromium instalado localmente para
Playwright).

## Dependencies

- ~~El flujo de tenant multi-usuario de punta a punta...~~ — cerrado en la
  sesión 15 (endpoint de invitación + UI completa, ver "Hecho — sesión 15").
- Escritura de settings a nivel PLATFORM depende de un plano de
  administración de plataforma separado (ítem 1 de la cola Claude) —
  deliberadamente no adelantado sin esa decisión de arquitectura.
- Un `DomainEventBus` handler con efecto secundario no idempotente depende
  de construir primero `inbox_messages` (ítem 4 de la cola Claude, ver
  ADR-004 punto 5) — esto incluye conectar Notifications al Event Bus.
- Una purga real de storage para archivos borrados (ítem 5 de la cola
  Claude) depende de definir una ventana de retención — no bloqueado, solo
  pendiente de diseñar como job auditado, no borrado ad-hoc.
- Un adapter real de Email para Notifications (ítem 6 de la cola Claude)
  depende de elegir un proveedor SMTP/transaccional — no decidido todavía.
- `@erp/api-client` generado desde OpenAPI (ítem 7 de la cola Claude)
  depende de elegir una herramienta de generación (p. ej.
  `openapi-typescript`) — no decidido todavía, no bloqueado.
- Expirar/revocar invitaciones pendientes (ítem 8 de la cola Claude) depende
  de decidir una política de TTL — no bloqueado, no decidido todavía.

## Integration needed

Ninguna pendiente en este momento — OpenAPI/Swagger (MASTER_SPEC §25) quedó
resuelto en la sesión 14 (`GET /api/docs`, `GET /api/docs-json`).

## Architecture decisions needed

Ninguna pendiente de aprobación en este momento. Decisiones ya registradas:
`docs/DECISIONS.md` ADR-006 (Identity & Session Strategy) — su pregunta
abierta sobre almacenamiento de tokens en el cliente quedó resuelta en la
práctica por `apps/erp-web` (memoria, no persistente); ADR-004 (Event
Architecture — implementado y ratificado en sesión 10, enmendado en sesión
13 para reflejar la extracción del dispatcher a `apps/worker`). Pendientes de
numerar formalmente cuando corresponda: ADR-001 (Modular Monolith), ADR-002
(PostgreSQL/Prisma), ADR-003 (Multi-Tenancy — el patrón de
`docs/MULTITENANCY.md` §8 ya está verificado tres veces contra Postgres
real: manual, integration test, y ahora E2E de navegador), ADR-005 (Plugin
Architecture — el diseño ya existe completo en `docs/PLUGINS.md`, falta
implementar y ratificar).
