# Work Queue

Reemplaza el modelo `docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.
Mantenida por Claude (Tech Lead/backend). Última actualización: 2026-08-26
(sesión 4, integración de la suite E2E + primitivos de UI de `ai/codex`).

Rama de Claude: `ai/claude`. Rama de Codex: `ai/codex`. Integración: `develop`.
`develop` y `ai/claude` sincronizados en `aae6c5c` (origin, ambas ramas).

---

## Claude — backend / arquitectura

### Próximo, en orden de dependencia técnica

1. **Access Control / RBAC** — Role, Permission, RoleAssignment, catálogo de
   permisos, guards deny-by-default (`docs/MULTITENANCY.md` §9). No
   bloqueado: `TenantContextGuard` existe y está verificado end-to-end
   (unit, integration con Postgres real, y ahora E2E de navegador real),
   así que una policy de permisos ya tiene `TenantExecutionContext`
   disponible en cada request.
2. **Configuración tipada** (`SettingDefinition`/`SettingValue` por scope —
   platform/tenant/company — per `docs/ARCHITECTURE.md` §8.2, MASTER_SPEC §28).
3. **Audit** — tabla append-only, matriz de auditoría inicial (login, logout,
   cambios de status de usuario, provisioning de tenant, registro).
4. **Event Bus** — bus interno + transactional outbox mínimo. El diseño
   completo YA EXISTE en `docs/EVENTS.md` (envelope, taxonomía domain vs.
   integration event, outbox/inbox, retries/DLQ, nomenclatura) — este ítem
   es implementarlo, no diseñarlo desde cero. Ver nota de corrección más
   abajo: este archivo estuvo mal descrito como vacío en versiones previas
   de esta cola.
5. **Files** — metadata de archivos + URLs firmadas contra MinIO.
6. **Notifications** — solicitud + adapter in-app/email vía worker.
7. **Workers** — app `apps/worker` separada, consumidor de BullMQ/outbox.
8. **OpenAPI/Swagger** — MASTER_SPEC §25 lo pide desde el principio; no
   existe todavía. Bajo costo, alto valor: con esto `@erp/api-client` puede
   generarse desde el contrato en vez de mantenerse a mano.

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

### Próxima tarea definida: UI de RBAC (bloqueada hasta que Claude entregue el contrato)

Cuando el ítem 1 de la cola Claude (Access Control/RBAC) esté listo, el
contrato esperado para que Codex empiece sin ambigüedad es:

- `GET /api/v1/roles` — catálogo de roles del tenant activo (requiere
  `SessionAuthGuard` + `TenantContextGuard`, igual que `/tenants/current`).
- `GET /api/v1/permissions` — catálogo global de permisos disponibles
  (`<context>.<resource>.<action>`, docs/MULTITENANCY.md §9.1).
- `POST /api/v1/roles` — crear rol con conjunto de permisos.
- `POST /api/v1/roles/:id/assignments` — asignar rol a un membership con
  scope (`TENANT`/`COMPANY`/`BRANCH`/`WAREHOUSE`).
- Envelope de error igual al ya usado (`statusCode/code/message/details/correlationId`).

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

- UI de gestión de roles/permisos — depende del contrato de arriba
  (cola Claude, ítem 1).

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
- UI de RBAC de Codex depende del contrato HTTP de la sección de arriba.
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
