# Work Queue

Reemplaza el modelo `docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.
Mantenida por Claude (Tech Lead/backend). Última actualización: 2026-08-27
(sesión 5, implementación completa de Access Control/RBAC).

Rama de Claude: `ai/claude`. Rama de Codex: `ai/codex`. Integración: `develop`.
`develop` y `ai/claude` sincronizados en `aae6c5c` (origin, ambas ramas).

---

## Claude — backend / arquitectura

### Próximo, en orden de dependencia técnica

1. **Configuración tipada** (`SettingDefinition`/`SettingValue` por scope —
   platform/tenant/company — per `docs/ARCHITECTURE.md` §8.2, MASTER_SPEC §28).
   No bloqueado.
2. **Audit** — tabla append-only, matriz de auditoría inicial (login, logout,
   cambios de status de usuario, provisioning de tenant, registro, y ahora
   también creación de roles/asignaciones — ver hueco anotado en
   `docs/SECURITY.md` §"Access Control / RBAC").
3. **Event Bus** — bus interno + transactional outbox mínimo. El diseño
   completo YA EXISTE en `docs/EVENTS.md` (envelope, taxonomía domain vs.
   integration event, outbox/inbox, retries/DLQ, nomenclatura) — este ítem
   es implementarlo, no diseñarlo desde cero. Ver nota de corrección más
   abajo: este archivo estuvo mal descrito como vacío en versiones previas
   de esta cola.
4. **Files** — metadata de archivos + URLs firmadas contra MinIO.
5. **Notifications** — solicitud + adapter in-app/email vía worker.
6. **Workers** — app `apps/worker` separada, consumidor de BullMQ/outbox.
7. **OpenAPI/Swagger** — MASTER_SPEC §25 lo pide desde el principio; no
   existe todavía. Bajo costo, alto valor: con esto `@erp/api-client` puede
   generarse desde el contrato en vez de mantenerse a mano.
8. **Membership invitation endpoint** (Organization/Tenancy) — hoy no existe
   forma de agregar un segundo usuario a un tenant vía API; anotado como
   hueco real en `docs/SECURITY.md` durante el smoke test de RBAC. No
   bloqueado, pero bloquea que un tenant multi-usuario sea usable de punta a
   punta.

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

## Codex — frontend / testing / tooling / backend aislado

### Completado esta sesión (retirado de la cola)

- ~~E2E tests (Playwright)~~ — hecho, integrado.
- ~~Expandir el Design System (Table/Modal/Select/Tabs)~~ — hecho, integrado.

### Próxima tarea definida: UI de RBAC (desbloqueada — el backend ya existe y está verificado)

El backend de Access Control/RBAC está implementado, probado (unit +
integración con Postgres real) y verificado con un smoke test manual contra
la infraestructura Docker real (ver "Hecho — sesión 5" arriba). El contrato
HTTP real, no proyectado, es:

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

**Hueco a tener en cuenta al diseñar la UI**: hoy no existe ningún endpoint
para agregar un segundo usuario a un tenant (`POST
/api/v1/tenants/:id/memberships` o similar no existe). Una pantalla
"Roles y permisos" puede listar/crear roles y ver asignaciones existentes,
pero el flujo "invitar usuario → asignarle un rol" no se puede completar de
punta a punta hasta que Organization/Tenancy agregue ese endpoint (ítem 8 de
la cola Claude). No es una limitación de la UI ni del contrato de RBAC.

Con eso disponible, la UI natural es una pantalla "Roles y permisos" en
`apps/erp-web` usando exactamente los primitivos que Codex ya construyó
esta sesión: `Table` (listado de roles/permisos), `Modal` (crear/editar
rol), `Select` (elegir scope de la asignación), `Tabs` (separar "Roles" de
"Asignaciones" o similar). No hay trabajo de Design System pendiente para
esto — ya existe todo lo necesario.

### Disponible ahora, sin depender de RBAC

- **Extender el E2E existente**: hoy solo hay un flujo (registro →
  onboarding → workspace). Casos negativos con valor real: login con
  credenciales incorrectas, refresh/rotación visible en la UI, logout y
  redirección a `/login`.
- **Documentación**: no quedan huecos obvios — `docs/EVENTS.md` y
  `docs/PLUGINS.md` ya estaban completos (ver corrección arriba).

### Bloqueado

- Nada. La UI de gestión de roles/permisos ya no está bloqueada — el
  contrato de arriba es real y está verificado end-to-end.

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
- UI de RBAC de Codex depende del contrato HTTP de la sección de arriba —
  contrato ya entregado y verificado, ítem desbloqueado.
- Un flujo de tenant multi-usuario de punta a punta (incluida la UI de RBAC
  en su forma completa "invitar → asignar rol") depende del endpoint de
  invitación de membership (ítem 8 de la cola Claude).
- Event Bus depende únicamente de implementar el diseño ya existente en
  `docs/EVENTS.md` — no hay diseño pendiente.

## Integration needed

- **OpenAPI/Swagger**: MASTER_SPEC §25 lo pide desde el principio; no existe
  todavía. Próximo en la cola Claude, junto con RBAC.

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
