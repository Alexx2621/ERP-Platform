# Work Queue

Reemplaza el modelo `docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.
Mantenida por Claude (Tech Lead/backend). Última actualización: 2026-08-26
(sesión 3, integración de `ai/codex` → `develop`).

Rama de Claude: `ai/claude`. Rama de Codex: `ai/codex`. Integración: `develop`.
`develop` y `ai/claude` están sincronizados en `3e2b706` (origin, ambas ramas).

---

## Claude — backend / arquitectura

### Próximo, en orden de dependencia técnica

1. **Access Control / RBAC** — Role, Permission, RoleAssignment, catálogo de
   permisos, guards deny-by-default (`docs/MULTITENANCY.md` §9). No
   bloqueado: `TenantContextGuard` existe y está verificado end-to-end
   (código y automatizado vía testcontainers), así que una policy de
   permisos ya tiene `TenantExecutionContext` disponible.
2. **Configuración tipada** (`SettingDefinition`/`SettingValue` por scope —
   platform/tenant/company — per `docs/ARCHITECTURE.md` §8.2, MASTER_SPEC §28).
3. **Audit** — tabla append-only, matriz de auditoría inicial (login, logout,
   cambios de status de usuario, provisioning de tenant, registro).
4. **Event Bus** — bus interno + transactional outbox mínimo
   (`docs/ARCHITECTURE.md` §11-12, `docs/EVENTS.md` está vacío, pendiente).
5. **Files** — metadata de archivos + URLs firmadas contra MinIO.
6. **Notifications** — solicitud + adapter in-app/email vía worker.
7. **Workers** — app `apps/worker` separada, consumidor de BullMQ/outbox.
8. **OpenAPI/Swagger** — MASTER_SPEC §25 lo pide desde el principio; no
   existe todavía. Bajo costo, alto valor: con esto `@erp/api-client` puede
   generarse desde el contrato en vez de mantenerse a mano.

### Hecho — sesión 3 (integración de Codex a develop)

Revisado como Tech Lead (arquitectura, seguridad, tenant isolation,
compatibilidad de API, cambios de DB, tests, cumplimiento de MASTER_SPEC) e
integrado sin cambios: los 4 commits de `ai/codex` eran correctos tal cual.

- **ERP Web** (`apps/erp-web`, React 19 + Vite + Tailwind v4): registro,
  login, refresh automático (rota 30s antes de expirar, deduplicando
  refrescos concurrentes), logout, listado/selección de tenant,
  onboarding (provisioning de tenant+organización+empresa), workspace de
  confirmación. Access/refresh tokens **solo en memoria** (ni
  localStorage, ni sessionStorage, ni cookies) — la elección correcta para
  la pregunta que dejé abierta en ADR-006, documentada explícitamente en
  `apps/erp-web/README.md` citando el ADR.
- **`@erp/api-client`**: SDK tipado — verificado campo por campo contra mis
  DTOs/controllers reales (coincide exactamente) y verificado en runtime
  contra el servidor real esta misma sesión (register → me → listTenants →
  provisionTenant → getTenantContext → refresh → logout → 401 posterior).
- **Integration tests con Testcontainers** (`apps/api/test/integration`):
  levantan PostgreSQL real efímero, corren mis migraciones reales, y
  prueban el mismo escenario crítico que validé a mano en la sesión
  anterior (la FK compuesta rechaza una compañía cross-tenant) — ahora
  automatizado y repetible en CI.
- **CI** (`.github/workflows/ci.yml`): job de lint/typecheck/test/build +
  job separado de integración Postgres; acciones de terceros fijadas a
  SHA de commit (no a tag mutable).
- Ajustes menores de config compartidos, todos correctos: `apps/api/tsconfig.json`
  separa `test/` (integración) del build principal vía `tsconfig.test.json`;
  `jest.config.js` excluye `test/integration/` de la corrida unitaria;
  `pnpm-workspace.yaml` añade `cpu-features/protobufjs/ssh2: false` a
  `allowBuilds` (deniega explícitamente scripts de postinstall de
  dependencias transitivas de testcontainers — buena higiene de
  supply-chain, no solo permitir todo).
- Merge sin conflictos (`ai/codex` ya había sincronizado `origin/develop`
  antes de reportar). Validación completa: `pnpm install --frozen-lockfile`,
  lint, typecheck, 62 tests unitarios (api 54 + api-client 4 + erp-web 4),
  2 tests de integración con Postgres real, build de los 4 paquetes
  (incluyendo build de producción de Vite). `develop` y `ai/claude`
  empujados a origin en `3e2b706`.

### Hecho — sesiones 1-2 (resumen; detalle en versiones previas de este archivo)

Auditoría de integración auth+tenancy, corrección de `AppModule` sin
`TenantsModule`, migración de tenancy generada, Redis integrado, Docker
verificado con Postgres/Redis reales, integración HTTP de Tenant Context
(`TenantContextGuard`, `POST /auth/register`, `POST/GET /tenants`,
`GET /tenants/current`) probada end-to-end contra infraestructura real.
Bug real encontrado y corregido: `"incremental": true` en tsc dejaba
`dist/` incompleto sin fallar el build.

---

## Codex — frontend / testing / tooling / backend aislado

### Completado esta sesión (retirado de la cola)

- ~~ERP Web bootstrap~~ — hecho, integrado.
- ~~Integration tests con Testcontainers~~ — hecho, integrado.
- ~~CI (GitHub Actions)~~ — hecho, integrado.
- ~~API client/SDK~~ — hecho, integrado.

### Disponible ahora (recién desbloqueado por esta integración)

- **E2E tests (Playwright)** contra la app real: con `apps/erp-web` y la
  API ya integradas y con CI corriendo Postgres real vía Docker, el
  siguiente paso natural de `docs/ARCHITECTURE.md` §12 es un flujo E2E
  real (registro → onboarding → workspace) en un job de CI nuevo,
  siguiendo el mismo patrón que `postgres-integration` (levantar API +
  erp-web + Postgres, correr Playwright).
- **Expandir el Design System** (`apps/erp-web/src/shared/ui`): hoy solo
  existen `Button`, `FormField`, `Notice`, `BrandMark`. A medida que se
  agreguen pantallas (tenant management, próximamente RBAC) van a hacer
  falta más primitivos (Table/DataGrid, Modal, Select, Tabs — MASTER_SPEC
  §6 "Estilos").
- **Documentación**: `docs/EVENTS.md` y `docs/PLUGINS.md` siguen vacíos;
  documentar el diseño ya descrito en `docs/MASTER_SPEC.md` §11-17 no toca
  código de nadie.

### Bloqueado

- Cualquier pantalla que dependa de RBAC/permisos visibles (RBAC es el
  próximo ítem de la cola Claude — cuando exista el catálogo de permisos,
  Codex puede construir la UI de gestión de roles).

---

## Blocked

Nada bloqueado por infraestructura — Docker, PostgreSQL, Redis y MinIO
están arriba y verificados. `docker compose up -d` debe seguir corriendo
para desarrollo local.

## Dependencies

- Files depende de que el código de MinIO se escriba y se pruebe contra el
  contenedor ya disponible (no bloqueado, solo pendiente de implementar).
- Workers depende de BullMQ contra el Redis ya disponible (mismo caso).
- UI de Codex para RBAC depende de que Claude entregue el catálogo de
  permisos primero.
- E2E de Codex depende de nada nuevo — API, erp-web y Docker ya están listos.

## Integration needed

- **OpenAPI/Swagger**: MASTER_SPEC §25 lo pide desde el principio; no existe
  todavía. Próximo en la cola Claude, junto con RBAC.

## Architecture decisions needed

Ninguna pendiente de aprobación en este momento. Decisiones ya registradas:
`docs/DECISIONS.md` ADR-006 (Identity & Session Strategy) — su pregunta
abierta sobre almacenamiento de tokens en el cliente quedó resuelta en la
práctica por `apps/erp-web` (memoria, no persistente); vale la pena anotar
esa resolución en el ADR cuando se numeren los pendientes: ADR-001 (Modular
Monolith), ADR-002 (PostgreSQL/Prisma), ADR-003 (Multi-Tenancy — el patrón
de `docs/MULTITENANCY.md` §8 ya está verificado dos veces contra Postgres
real, manual y automatizado, pero sigue sin registrarse como ADR formal),
ADR-004 (Event Architecture), ADR-005 (Plugin Architecture).
