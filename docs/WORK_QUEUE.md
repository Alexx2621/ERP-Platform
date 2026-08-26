# Work Queue

Reemplaza el modelo `docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.
Mantenida por Claude (Tech Lead/backend). Última actualización: 2026-08-26
(sesión 2, tras validación real contra Docker + integración de Tenant Context).

Rama de Claude: `ai/claude`. Rama de Codex: `ai/codex`. Integración: `develop`.

---

## Claude — backend / arquitectura

### Próximo, en orden de dependencia técnica

1. **Access Control / RBAC** — Role, Permission, RoleAssignment, catálogo de
   permisos, guards deny-by-default (`docs/MULTITENANCY.md` §9). Ya no está
   bloqueado: `TenantContextGuard` existe y está verificado end-to-end contra
   infraestructura real (ver abajo), así que una policy de permisos ya tiene
   `TenantExecutionContext` (tenantId, membershipId, companyId) disponible.
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
   existe todavía. Bajo costo, alto valor para que Codex genere un SDK real
   en vez de tipos hand-written.

### Hecho — sesión 1 (auditoría de integración)

- Auditoría completa del repo tras integrar Authentication+Users (Claude)
  con Tenancy+Membership+Organization+Company (Codex).
- Corregido: `TenantsModule`/`OrganizationsModule`/`CompaniesModule` no
  estaban importados en `AppModule` — el código de tenancy existía pero no
  se ejecutaba en la app real.
- Generada la migración faltante para `tenants`/`memberships`/
  `organizations`/`companies` (el schema había avanzado sin migración).
- Añadidas pruebas de wiring de NestJS (`auth.module.spec.ts`,
  `app.module.spec.ts`) que hubieran detectado el bug de integración.
- `docker-compose.yml` (PostgreSQL 16, Redis 7, MinIO) — escrito.
- **Redis** integrado (`apps/api/src/shared/redis`), rate limiter de
  `/api/v1/auth/*` ahora respaldado por Redis en vez de memoria.

### Hecho — sesión 2 (validación real + Tenant Context HTTP)

- **Verificación real contra Docker** (usuario instaló Docker Desktop):
  - `docker compose up -d` → postgres/redis/minio healthy.
  - `prisma migrate deploy` aplicó ambas migraciones limpiamente contra
    PostgreSQL real; `prisma migrate status` confirma cero drift.
  - Prueba directa con Prisma real: la FK compuesta
    `companies_tenant_id_organization_id_fkey` rechaza una compañía cuyo
    `organizationId` pertenece a otro tenant — el aislamiento cross-tenant
    se verificó a nivel de base de datos real, no solo con fakes.
  - Redis: roundtrip set/get real confirmado.
  - **Bug real encontrado y corregido**: `"incremental": true` en
    `tsconfig.base.json` dejó un `dist/` incompleto tras builds repetidos
    (varios `.js` no se emitían, aunque `tsc` reportaba éxito) — causa raíz
    de un caché `.tsbuildinfo` corrupto. Se quitó `incremental` de la base
    config; los builds ya tardan 3-5s así que no valía el riesgo de
    correctitud. Confirmado con conteo exacto fuente vs. compilado (92=92,
    luego 102=102 tras añadir Tenant Context).
  - Servidor real (`node dist/main.js`) arrancado contra Postgres+Redis
    reales; flujo completo probado por HTTP: login válido/inválido, `/me`,
    `/refresh` con rotación, reuso de refresh token rotado rechazado,
    logout, sesión revocada rechazada, rate limiting (verificado que la
    clave de throttle vive en Redis, no en memoria).
- **Integración HTTP de Tenant Context** (`apps/api/src/core/tenants/presentation`):
  - `TenantContextGuard`: corre después de `SessionAuthGuard`, resuelve
    `TenantExecutionContext` vía header `X-Tenant-Slug` (+ `X-Company-Id`
    opcional). Nunca confía en el header solo — siempre re-valida membership
    activo del usuario autenticado contra el tenant pedido.
  - `POST /api/v1/tenants` (provisioning, requiere sesión),
    `GET /api/v1/tenants` (lista de tenants del usuario — única query
    intencionalmente cross-tenant, ver `MembershipRepository.findActiveByUserId`),
    `GET /api/v1/tenants/current` (demuestra la cadena completa de guards).
  - `POST /api/v1/auth/register` (crea usuario + password + sesión en un
    solo paso, MASTER_SPEC §68).
  - Probado end-to-end contra la base real: registro → provisioning →
    listar tenants → `/tenants/current` con slug correcto/incorrecto/
    ausente → 401 sin autenticar. Los 4 casos se comportan exactamente
    como se diseñó.
  - 9 tests nuevos (unit + wiring), 54 tests totales pasando.

---

## Codex — frontend / testing / tooling / backend aislado

### Disponible ahora (contrato backend estable y verificado end-to-end)

- **ERP Web bootstrap** (`apps/erp-web`, React + Vite) + Design System
  mínimo: pantallas de registro/login (`POST /api/v1/auth/register`,
  `/login`, `/refresh`, `/logout`, `GET /me`) y onboarding de tenant
  (`POST /api/v1/tenants`, `GET /api/v1/tenants`, `GET /api/v1/tenants/current`
  con header `X-Tenant-Slug`). Contrato estable, no cambiará de forma
  incompatible sin ADR.
- **Integration tests con Testcontainers** (Postgres real) para los
  repositorios Prisma de auth y tenancy — hoy la verificación contra DB
  real se hizo manualmente en esta sesión; formalizarla en la suite de
  tests es justo el tipo de brecha que `docs/ARCHITECTURE.md` §12 pide.
- **CI (GitHub Actions)**: lint + typecheck + test + build en cada PR
  (MASTER_SPEC §40). No existe todavía.
- **API client/SDK** tipado para `/api/v1/auth/*` y `/api/v1/tenants/*`
  (hand-written está bien mientras Claude no añada OpenAPI).

### Ya no bloqueado

- UI de onboarding (crear tenant/empresa): el endpoint HTTP ya existe y
  está verificado contra base real.

### Sigue bloqueado

- Cualquier pantalla que dependa de RBAC/permisos visibles (RBAC es el
  próximo ítem de la cola Claude).

### Backend aislado que Codex puede tomar sin conflicto

- `docs/EVENTS.md` y `docs/PLUGINS.md` están vacíos; documentar el diseño
  ya descrito en `docs/MASTER_SPEC.md` §11-17 no toca código de nadie.

---

## Blocked

Nada bloqueado por infraestructura en este momento — Docker, PostgreSQL,
Redis y MinIO están arriba y verificados. `docker compose up -d` debe
seguir corriendo para que `apps/api` arranque localmente.

## Dependencies

- Files depende de que el código de MinIO se escriba y se pruebe contra el
  contenedor ya disponible (no bloqueado, solo pendiente de implementar).
- Workers depende de BullMQ contra el Redis ya disponible (mismo caso).
- UI de Codex para cualquier módulo depende de que ese módulo tenga
  contrato HTTP estable (no solo use cases internos).

## Integration needed

- **OpenAPI/Swagger**: MASTER_SPEC §25 lo pide desde el principio; no existe
  todavía. Próximo en la cola Claude.

## Architecture decisions needed

Ninguna pendiente de aprobación en este momento. Decisiones ya registradas:
`docs/DECISIONS.md` ADR-006 (Identity & Session Strategy). Pendientes de
numerar cuando corresponda: ADR-001 (Modular Monolith), ADR-002
(PostgreSQL/Prisma), ADR-003 (Multi-Tenancy — la implementación ya sigue el
patrón de `docs/MULTITENANCY.md` §8, verificado contra Postgres real, pero
no está registrada como ADR formal), ADR-004 (Event Architecture), ADR-005
(Plugin Architecture).
