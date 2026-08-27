# Work Queue

Cola única del ERP. Reemplaza el modelo histórico
`docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.

Responsable: **Claude, propietario único del desarrollo del ERP**. La cola
abarca arquitectura, backend, frontend, datos, seguridad, pruebas,
infraestructura, documentación e integración; no existe una división
permanente por agente. Última actualización técnica: 2026-08-27 (sesión 9,
implementación completa de Audit append-only). Modelo operativo actualizado:
2026-08-27.

Rama de trabajo de Claude: `ai/claude`. Fuente integrada: `develop`.
Estable/releases: `main`. La rama `ai/codex` se conserva únicamente como
historial y no tiene cola propia. Codex solo puede intervenir en una tarea
aislada y explícitamente asignada; al terminar no selecciona trabajo adicional.

---

## Backlog activo — Claude (ownership end-to-end)

### Próximo, en orden de dependencia técnica

1. **Event Bus** — bus interno + transactional outbox mínimo. El diseño
   completo YA EXISTE en `docs/EVENTS.md` (envelope, taxonomía domain vs.
   integration event, outbox/inbox, retries/DLQ, nomenclatura) — este ítem
   es implementarlo, no diseñarlo desde cero. Ver nota de corrección más
   abajo: este archivo estuvo mal descrito como vacío en versiones previas
   de esta cola.
2. **Files** — metadata de archivos + URLs firmadas contra MinIO.
3. **Notifications** — solicitud + adapter in-app/email vía worker.
4. **Workers** — app `apps/worker` separada, consumidor de BullMQ/outbox.
5. **OpenAPI/Swagger** — MASTER_SPEC §25 lo pide desde el principio; no
   existe todavía. Bajo costo, alto valor: con esto `@erp/api-client` puede
   generarse desde el contrato en vez de mantenerse a mano.
6. **Membership invitation endpoint** (Organization/Tenancy) — hoy no existe
   forma de agregar un segundo usuario a un tenant vía API; anotado como
   hueco real en `docs/SECURITY.md` durante el smoke test de RBAC. No
   bloqueado, pero bloquea que un tenant multi-usuario sea usable de punta a
   punta.
7. **System-administration plane** — necesario antes de exponer escritura de
   settings a nivel `PLATFORM` (hoy solo existe a nivel de dominio, sin
   endpoint HTTP — ver `docs/SECURITY.md` §"Typed Configuration"). No
   bloqueado, pero deliberadamente no adelantado sin una decisión de
   arquitectura explícita sobre credenciales/autorización separadas
   (`docs/ARCHITECTURE.md` §10).
8. **"Mi actividad" / vista de administración de plataforma para eventos no
   tenant-scoped** — login/logout/cambios de status de usuario se auditan
   (`tenantId: null`) pero no son consultables por ningún endpoint todavía
   (`AuditEntriesController` solo devuelve entradas tenant-scoped). No
   bloqueado, deliberadamente no construido junto con Audit para no mezclar
   una superficie de lectura nueva con la matriz de grabación
   (`docs/SECURITY.md` §"Audit").
9. **Admin endpoint para `SetUserStatusUseCase`** — el use case y su
   auditoría (`user.status_changed`) existen y están probados, pero no hay
   ningún controller que lo invoque todavía. No bloqueado.

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

**Hueco que sigue vigente, ya reflejado correctamente en la UI integrada**:
hoy no existe ningún endpoint para agregar un segundo usuario a un tenant
(`POST /api/v1/tenants/:id/memberships` o similar no existe). La pantalla
"Roles y permisos" ya integrada lista/crea roles y asigna roles a una
membership *existente*, pero el flujo "invitar usuario → asignarle un rol"
no se puede completar de punta a punta hasta que Organization/Tenancy
agregue ese endpoint (ítem 6 de la cola Claude). Esto sigue siendo un hueco
del backend, no de la UI ni del contrato de RBAC — no debe simularse ni
inventarse mientras tanto.

### Estado operativo actual

- No existe una asignación permanente para Codex ni una cola secundaria.
- Claude continuará Event Bus, Files, Notifications y cualquier superficie de
  UI, SDK, pruebas o documentación que esos bloques requieran.
- Si el usuario o Claude asignan a Codex una tarea aislada, debe registrarse con
  alcance, criterios de aceptación, rama y validación explícitos; esa asignación
  termina al entregar el alcance indicado.
- `docs/EVENTS.md` y `docs/PLUGINS.md` ya contienen diseños completos; deben
  conservarse como fuente técnica para la implementación y ratificación de sus
  ADR.
- El flujo completo "invitar usuario → asignar rol" continúa bloqueado por el
  endpoint de invitación de membership (ítem 6 del backlog activo). Claude es
  responsable de resolver el backend y completar después la experiencia de
  punta a punta; no debe simularse mientras tanto.

---

## Blocked

Nada bloqueado por infraestructura — Docker, PostgreSQL, Redis y MinIO
están arriba y verificados. `docker compose up -d` debe seguir corriendo
para desarrollo local (incluye ahora Chromium instalado localmente para
Playwright).

## Dependencies

- Files depende de que el código de MinIO se escriba y se pruebe contra el
  contenedor ya disponible (no bloqueado, solo pendiente de implementar).
- Workers depende de BullMQ contra el Redis ya disponible (mismo caso).
- El flujo de tenant multi-usuario de punta a punta (incluida la UI de RBAC
  ya integrada, en su forma completa "invitar → asignar rol") depende del
  endpoint de invitación de membership (ítem 6 de la cola Claude).
- Escritura de settings a nivel PLATFORM depende de un plano de
  administración de plataforma separado (ítem 7 de la cola Claude) —
  deliberadamente no adelantado sin esa decisión de arquitectura.
- Event Bus depende únicamente de implementar el diseño ya existente en
  `docs/EVENTS.md` — no hay diseño pendiente.

## Integration needed

- **OpenAPI/Swagger**: MASTER_SPEC §25 lo pide desde el principio; no existe
  todavía. Sigue en la cola Claude (ítem 5).

## Architecture decisions needed

Ninguna pendiente de aprobación en este momento. Decisiones ya registradas:
`docs/DECISIONS.md` ADR-006 (Identity & Session Strategy) — su pregunta
abierta sobre almacenamiento de tokens en el cliente quedó resuelta en la
práctica por `apps/erp-web` (memoria, no persistente). Pendientes de
numerar formalmente cuando corresponda: ADR-001 (Modular Monolith), ADR-002
(PostgreSQL/Prisma), ADR-003 (Multi-Tenancy — el patrón de
`docs/MULTITENANCY.md` §8 ya está verificado tres veces contra Postgres
real: manual, integration test, y ahora E2E de navegador), ADR-004 (Event
Architecture — el diseño ya existe completo en `docs/EVENTS.md`, falta
ratificarlo), ADR-005 (Plugin Architecture — ídem, diseño completo en
`docs/PLUGINS.md`).
