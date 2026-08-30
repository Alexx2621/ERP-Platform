# Architecture V1 — Propuesta

Estado: **Aceptada para Foundation (Fase 1), implementada y verificada
contra infraestructura real de extremo a extremo — sesión 22, 2026-08-30.
Ver "Revisión de cierre de Foundation" en `docs/PROJECT_STATE.md`. El
alcance descrito aquí para Business Apps/Channels (§5.2) sigue vigente
como diseño de referencia para las fases futuras del roadmap, todavía sin
implementar.**

Alcance: arquitectura objetivo de la primera versión y Foundation

Fuente normativa: `docs/MASTER_SPEC.md`

Documentos complementarios: `MULTITENANCY.md`, `EVENTS.md`, `PLUGINS.md` y `ROADMAP.md`

## 1. Resumen ejecutivo

Architecture V1 será un **monolito modular desplegado como API y worker**, acompañado por un frontend ERP independiente. PostgreSQL será la fuente de verdad, Redis se limitará a caché, rate limiting, locks efímeros y transporte de trabajos, y el almacenamiento de archivos será compatible con S3.

La unidad principal de modularidad será el bounded context, no una capa técnica global ni una colección de microservicios. Cada módulo tendrá API pública explícita, dominio y persistencia propios; no accederá a las tablas ni a la implementación interna de otro módulo. Las operaciones que deban ser atómicas usarán llamadas síncronas explícitas y una sola transacción. Los efectos secundarios y la integración desacoplada usarán eventos con transactional outbox y entrega al menos una vez.

V1 es multi-tenant desde el primer registro: una base de datos y un esquema compartidos, `tenant_id` obligatorio en datos propiedad de un tenant, repositorios con alcance obligatorio y restricciones de base de datos que impidan referencias cruzadas. PostgreSQL Row Level Security se evaluará como defensa adicional después de validar su interacción con Prisma, pool de conexiones, migraciones y jobs; no será el único control.

Los “plugins” de V1 serán módulos oficiales, confiables, compilados y desplegados con la plataforma. El App Registry permitirá activarlos por tenant mediante manifests declarativos, pero no habrá descarga ni ejecución de código arbitrario en runtime.

## 2. Objetivos y no objetivos

### 2.1 Objetivos de V1

- Construir una Foundation segura para Tenancy, Identity, Access Control, Organization Structure, Configuration, Audit, Events, Files y operación básica de Notifications.
- Aislar dominios mediante límites verificables y contratos explícitos.
- Publicar una REST API versionada y documentada con OpenAPI.
- Permitir que API y worker escalen horizontalmente sin estado local imprescindible.
- Proteger trazabilidad, idempotencia y consistencia de datos críticos desde el diseño.
- Habilitar módulos oficiales por tenant sin contaminar el Platform Core.
- Mantener una ruta razonable de extracción futura, sin pagar desde ahora el costo de microservicios.

### 2.2 No objetivos de V1

- Microservicios, Kafka, Kubernetes, microfrontends o CQRS generalizado.
- Plugins de terceros, código descargable, sandbox de ejecución o marketplace público.
- RLS como sustituto de controles de aplicación.
- Modelar desde ahora todos los dominios de ERP.
- Operación POS offline, contabilidad, manufactura o e-commerce completo durante Foundation.
- Multi-región activa-activa o particionamiento prematuro.

## 3. Evaluación crítica del MASTER_SPEC

### 3.1 Fortalezas que se conservan

- Monolito modular como punto de partida.
- PostgreSQL como fuente de verdad y Redis como infraestructura auxiliar.
- API-first, auditabilidad, validación de backend y aislamiento multi-tenant.
- Ledger para inventario y partida doble para contabilidad futura.
- Separación entre Commerce Engine y Storefront.
- Adapters para proveedores externos.
- Enfoque incremental y rechazo explícito de complejidad prematura.

### 3.2 Tensiones resueltas en V1

| Tensión | Resolución V1 | Motivo |
| --- | --- | --- |
| “Event-driven” frente a consistencia transaccional | Eventos para propagación; llamadas síncronas para invariantes que deben resolverse antes de confirmar | Un evento no debe ocultar una dependencia crítica ni permitir estados inválidos |
| Core muy amplio frente a “Core mínimo” | Se separan capacidades de plataforma en bounded contexts; “Core” no será una carpeta de utilidades omnisciente | Reduce acoplamiento y evita un shared kernel creciente |
| Activación por empresa frente a Tenant como cliente | Catálogo desplegado a nivel plataforma, entitlement e instalación a nivel tenant; configuración funcional opcional por company solo si el módulo la admite | Evita dependencias inconsistentes y aclara licenciamiento |
| Árbol `Branch / Location / Warehouse` ambiguo | Branch, Location y Warehouse son conceptos distintos; Warehouse pertenece a Company y puede asociarse opcionalmente a Branch/Location | No toda bodega es una sucursal ni toda ubicación almacena inventario |
| Usuario “del tenant” frente a identidad reusable | `User` es identidad global; `Membership` lo vincula al tenant; los accesos se asignan al membership | Evita duplicar identidad y permite acceso a varios tenants sin compartir datos empresariales |
| Outbox “eventual” frente a confiabilidad desde Foundation | Outbox mínimo entra en Foundation | Agregarlo tarde obliga a rediseñar publicación y transacciones |

### 3.3 Riesgos principales y mitigaciones

| Riesgo | Mitigación V1 |
| --- | --- |
| Fuga de datos entre tenants por filtros olvidados | TenantContext obligatorio, repositorios scoped, FKs compuestas, pruebas negativas y revisión de queries raw |
| Monolito que degenera en acoplamiento | APIs públicas por módulo, reglas de importación, ownership de tablas y pruebas de arquitectura |
| Doble procesamiento de jobs/webhooks | Idempotency keys, inbox de consumidores, constraints únicos y handlers reentrantes |
| Plugins que se convierten en ejecución remota insegura | Solo módulos oficiales empaquetados; manifest declarativo; sin `eval`, carga remota ni migraciones runtime |
| “Shared” convertido en dominio común | Shared Kernel mínimo: primitives estables, tipos técnicos y contratos; cualquier lógica empresarial queda en su módulo |
| Auditoría usada como event store | Audit log y outbox son registros distintos, con propósitos y retenciones distintas |
| Transacción distribuida implícita | Una sola base V1; operaciones críticas coordinadas dentro del proceso y límites explícitos |
| Alcance excesivo de Foundation | Exit criteria estrictos y vertical slices; capacidades avanzadas quedan en el roadmap |

### 3.4 Decisiones pendientes que requieren ADR o spike

- Proveedor y modalidad de autenticación: implementación propia controlada o Identity Provider administrado.
- Hash de contraseña y parámetros operativos si las credenciales se administran internamente.
- Viabilidad y momento de PostgreSQL RLS con Prisma y el pool elegido.
- Librería concreta de event bus in-process y mecanismo de despacho de outbox.
- Estrategia de sesión web: cookie `HttpOnly` con sesión revocable o tokens de corta duración con refresh rotation.
- Política de residencia, retención, anonimización y borrado de datos por jurisdicción.
- Proveedor S3, observabilidad y secret manager de producción.

La aprobación de esta propuesta autoriza el diseño, pero esas elecciones de implementación deben registrarse antes de codificar la capacidad correspondiente.

## 4. Vista general

```text
                         Usuarios y sistemas externos
                  +---------------+----------------+
                  |                                |
          +-------v--------+               +-------v--------+
          | ERP Web        |               | Storefront(s)  |
          | React + Vite   |               | Next.js        |
          +-------+--------+               +-------+--------+
                  | HTTPS / REST / Webhooks         |
                  +---------------+----------------+
                                  |
                         +--------v---------+
                         | API NestJS       |
                         | /api/v1          |
                         | auth, policies,  |
                         | use cases        |
                         +---+----------+---+
                             |          |
             synchronous     |          | transaction: state + outbox
             module ports    |          |
                   +---------v----------v---------+
                   | Modular Monolith             |
                   | Platform contexts            |
                   | Business apps / channels     |
                   | Integration adapters         |
                   +------+-------------+---------+
                          |             |
                 +--------v---+    +----v----------------+
                 | PostgreSQL |    | Redis               |
                 | truth,     |    | BullMQ, cache,      |
                 | audit,     |    | limits, locks       |
                 | outbox     |    +----------+----------+
                 +------------+               |
                                      +-------v--------+
                                      | Worker NestJS  |
                                      | outbox, jobs,  |
                                      | integrations   |
                                      +---+---------+--+
                                          |         |
                                      +---v--+  +---v-------------+
                                      | S3   |  | External systems|
                                      +------+  +-----------------+
```

### 4.1 Unidades desplegables

- `api`: proceso HTTP stateless; autenticación, autorización, validación, casos de uso y consultas.
- `worker`: mismo catálogo de módulos y contratos, pero sin servidor público; consume outbox y BullMQ.
- `erp-web`: SPA administrativa React + Vite.
- `storefront`: Next.js, introducido en la fase de e-commerce; nunca contiene el Commerce Engine.
- PostgreSQL, Redis y S3-compatible storage: infraestructura externa a los procesos.

API y worker forman parte del mismo sistema lógico y pueden compartir paquetes, pero tienen entrypoints, recursos, health checks y escalado independientes.

## 5. Bounded contexts

### 5.1 Platform Foundation

| Contexto | Responsabilidad | Datos que posee |
| --- | --- | --- |
| Tenancy | Ciclo de vida del tenant, estado, slug y límites base | Tenant |
| Identity | Identidades, credenciales/sesiones, MFA y recuperación | User, Credential, Session |
| Access Control | Memberships, roles, permisos, asignaciones y policies | Membership, Role, Permission, RoleAssignment |
| Organization Structure | Organizations, Companies, Branches y Locations | Organization, Company, Branch, Location |
| Configuration | Configuración tipada por scope y preferencias | SettingDefinition, SettingValue, UserPreference |
| Audit | Registro append-only de acciones relevantes | AuditEntry |
| Eventing | Outbox, inbox, suscripciones internas y metadatos de entrega | OutboxMessage, InboxMessage |
| Files | Metadatos, ownership, autorización y ciclo de vida de objetos | FileObject |
| Notifications | Solicitudes, plantillas y estado básico de entrega | Notification, NotificationDelivery |
| App Registry | Catálogo, entitlement y activación de módulos oficiales | AppDefinition, TenantApp, AppConfiguration |

Identity no conoce empresas. Access Control enlaza identidades con tenants y scopes organizacionales. Organization Structure no implementa autenticación. Esta separación evita un módulo `users` que concentre responsabilidades incompatibles.

### 5.2 Business Apps y Channels

Se introducen por fases y no forman parte del Platform Core:

- Master Data: Party/Customers, Suppliers, Product Catalog, Pricing, Taxes, Warehousing master data.
- Inventory.
- Sales.
- Purchasing.
- Payments.
- Accounting.
- CRM.
- Manufacturing.
- Reporting/BI.
- Channels: POS, Commerce Engine/B2B, customer portal y mobile APIs.
- Integrations: payment, shipping, tax, messaging y marketplace adapters.

Los límites definitivos de cada dominio se refinan antes de implementarlo; esta lista no autoriza crear carpetas o tablas vacías.

### 5.3 Qué pertenece al Platform Core

Pertenece si cumple todos estos criterios:

1. Es necesario para operar de forma segura cualquier tenant o módulo.
2. No contiene reglas específicas de ventas, inventario, industria o canal.
3. Tiene semántica estable y transversal.
4. Puede exponerse mediante un contrato pequeño y explícito.

Por tanto, el Platform Core comprende bootstrap, contexto de ejecución, tenancy, identity/access, auditoría, configuración, eventos, archivos, localización base, observabilidad y registro de apps.

### 5.4 Qué no pertenece al Platform Core

- Customer, Supplier, Product, Price, Tax, Warehouse stock, Order, Payment, Invoice, Shipment o Journal Entry.
- Reglas de retail, restaurante, clínica, hotel, manufactura u otra industria.
- SDKs concretos de Stripe, transportistas, marketplaces o mensajería.
- Componentes visuales específicos de un módulo.
- DTOs, repositorios o tablas de un business context.
- Un “BaseService” con CRUD, transacciones o reglas compartidas de manera implícita.

## 6. Estructura interna y reglas de dependencia

Cada módulo backend seguirá, cuando aporte valor, esta forma lógica:

```text
module/
  domain/          entities, value objects, domain services, domain events
  application/     use cases, ports, commands/queries, transaction boundary
  infrastructure/  Prisma repositories, adapters, event handlers
  presentation/    REST controllers, DTO mapping
  public/          exported facade, contracts and event schemas
  tests/
```

No es obligatorio crear todas las carpetas si un módulo es pequeño. La dirección de dependencias es:

```text
presentation -> application -> domain
infrastructure -> application/domain
module A -> public contract of module B
```

Reglas obligatorias:

- Controllers validan y traducen HTTP; no contienen reglas de negocio.
- Application define el límite transaccional y orquesta ports.
- Domain no importa NestJS, Prisma, HTTP, Redis ni SDKs de proveedores.
- Prisma solo aparece en infrastructure y migraciones.
- Un módulo no consulta tablas ni importa archivos internos de otro módulo.
- Dependencias síncronas entre módulos deben ser pocas, dirigidas y libres de ciclos.
- Los eventos no sustituyen una consulta o comando cuya respuesta sea necesaria para preservar una invariante.
- Shared Kernel solo contiene primitives realmente estables: identificadores, Money/Decimal contracts, clocks, resultados/errores y observabilidad técnica.

## 7. Flujo de una request

```text
HTTP request
  -> correlation/request ID
  -> authentication
  -> tenant resolution and active membership
  -> company/scope resolution when required
  -> permission/policy check
  -> DTO validation
  -> application use case
  -> transaction
       -> scoped repositories
       -> domain rules
       -> state changes
       -> audit entry when required
       -> outbox messages when required
  -> commit
  -> response envelope / standardized error
```

El `tenant_id` de una escritura nunca se acepta como autoridad desde el body. Se deriva del contexto autenticado. Los endpoints públicos o webhooks resuelven tenant mediante una credencial, endpoint o mapping previamente registrado y aplican la misma regla.

## 8. Persistencia de Foundation

### 8.1 Estrategia

- Un clúster PostgreSQL y una base lógica compartida en V1.
- Esquema relacional normalizado; JSONB únicamente para payloads/versiones flexibles y configuración validada.
- IDs técnicos UUIDv7 cuando el soporte seleccionado quede validado; códigos legibles separados de la PK.
- `timestamptz` en UTC para instantes; fechas civiles usan `date`.
- `numeric(precision, scale)`/Decimal para dinero y cantidades; nunca `float`.
- Migraciones forward-only automatizadas, backups probados y restore drills antes de producción.
- Convención de tablas y columnas `snake_case`; código TypeScript `PascalCase`/`camelCase`.

### 8.2 Esquema conceptual mínimo

| Área | Tablas Foundation propuestas |
| --- | --- |
| Tenancy | `tenants` |
| Identity | `users`, `user_credentials`, `sessions`, `mfa_factors`, `auth_challenges` |
| Membership | `memberships`, `membership_company_access` |
| RBAC | `roles`, `permissions`, `role_permissions`, `role_assignments` |
| Organization | `organizations`, `companies`, `branches`, `locations` |
| Configuration | `setting_definitions`, `setting_values`, `user_preferences` |
| Audit | `audit_entries` |
| Events | `outbox_messages`, `inbox_messages` |
| Apps | `app_definitions`, `tenant_apps`, `app_configurations` |
| Files | `file_objects` |
| Notifications | `notifications`, `notification_deliveries` |

Esta es una propuesta de alcance, no un schema Prisma. `docs/DATABASE.md` y un ADR deben fijar columnas, FKs, índices, retención y políticas antes de crear la migración.

### 8.3 Restricciones transversales

- Toda tabla tenant-owned incluye `tenant_id NOT NULL`, salvo excepciones globales documentadas como `users`, `permissions` y `app_definitions`.
- Las referencias entre registros tenant-owned preservan tenant mediante FKs compuestas o validación equivalente respaldada por constraints.
- Uniques empresariales incluyen el scope, por ejemplo `(tenant_id, company_id, code)`.
- Entidades críticas usan estado/archivo o soft delete selectivo; no se aplica `deleted_at` universal.
- Outbox y audit no tienen UPDATE/DELETE en el rol normal de aplicación, salvo procesos de retención controlados.
- Se define optimistic concurrency (`version`) donde existan ediciones concurrentes relevantes.

## 9. API V1

- Prefijo `/api/v1` y OpenAPI como contrato publicable.
- Recursos y campos en inglés; UI traducible.
- DTOs de transporte separados del dominio y de modelos Prisma.
- Paginación server-side por cursor donde el orden sea estable; offset solo para conjuntos pequeños o UX que lo requiera.
- Filtros y sort fields en allowlist; nunca interpolación libre en SQL.
- Errores con `statusCode`, `code`, `message`, `details` seguro y `correlationId`.
- `Idempotency-Key` requerido en operaciones públicas críticas definidas por módulo.
- Optimistic concurrency mediante versión/ETag cuando aplique.
- Breaking changes requieren nueva versión o ventana de deprecación; cambios aditivos permanecen en v1.
- Webhooks son integration events firmados, versionados, reintentables y auditables.

## 10. Seguridad V1

- Deny-by-default en autenticación, permisos y activación de módulos.
- Password hashing moderno, MFA, sesiones y rotación se fijan en ADR de Identity antes de implementar.
- Cookies web, si se eligen, serán `HttpOnly`, `Secure`, `SameSite` apropiado y con protección CSRF donde corresponda.
- Rate limiting diferenciado para login, recovery, APIs públicas, checkout y webhooks.
- Secrets fuera del repositorio y logs; sanitización central de datos sensibles.
- Validación en DTO, dominio y constraints de base de datos.
- Autorización en backend por permiso + scope + estado de membership/tenant; la UI solo refleja decisiones.
- System administration usa un plano y credenciales separados; no existe un “super admin” implícito que salte filtros de tenant en endpoints normales.
- S3 mediante URLs firmadas de corta duración y verificación de ownership/tenant antes de emitirlas.
- Dependencias, imágenes y pipeline con escaneo; backups cifrados y restauración verificada.

## 11. Observabilidad y operación

- Logs JSON con timestamp, level, service, environment, correlation/trace ID, tenant ID y actor ID cuando sea seguro.
- Nunca registrar passwords, tokens, secretos, payloads de tarjeta ni PII innecesaria.
- Health endpoints separados para liveness y readiness.
- Métricas iniciales: latencia/error HTTP, pool DB, lag y fallos de outbox, colas, retries, DLQ y jobs activos.
- OpenTelemetry se introduce detrás de una configuración común; traces cruzan API, outbox, worker e integración.
- API y worker se apagan con graceful shutdown y dejan de aceptar trabajo antes de cerrar conexiones.
- Docker Compose es la experiencia local; producción inicia con contenedores administrados o VMs, no Kubernetes.

## 12. Estrategia de testing

| Nivel | Objetivo |
| --- | --- |
| Unit | Value objects, policies, entidades y reglas deterministas |
| Integration | Repositorios reales, constraints, transacciones, outbox/inbox y adapters locales |
| API/E2E | Auth, permisos, errores, idempotencia y casos de uso principales |
| Architecture | Imports permitidos, ausencia de ciclos y ownership de módulos |
| Contract | OpenAPI, schemas de eventos y adapters de proveedores |
| Security | Aislamiento entre tenants/companies, IDOR, escalación y inputs hostiles |
| Resilience | Retries, duplicados, crash después de commit y recuperación de workers |

Cada prueba tenant-aware debe usar al menos dos tenants y afirmar tanto el caso permitido como el denegado. La cobertura numérica será una señal, no el objetivo; auth, tenancy, permisos, dinero, inventario, pagos y contabilidad requieren cobertura de riesgo alta.

## 13. Monorepo V1

```text
apps/
  api/                    NestJS HTTP composition root
  worker/                 NestJS worker composition root
  erp-web/                React + Vite administrative UI
  storefront/             Next.js; introduced with Commerce

packages/
  platform/
    tenancy/
    identity/
    access-control/
    organization/
    configuration/
    audit/
    eventing/
    files/
    notifications/
    app-registry/
  modules/                business contexts, added only by roadmap phase
  integrations/           provider adapters behind module ports
  contracts/              OpenAPI/event schemas and generated-safe types
  database/               Prisma client, migrations and DB tooling
  ui/                     design system primitives
  sdk/                    generated/curated TypeScript API client
  shared-kernel/          minimal stable domain/technical primitives
  observability/          logger, metrics and tracing setup
  config/                 typed build/lint/runtime configuration
  testing/                factories, fixtures and test infrastructure

docs/
  adr/
  modules/
  tasks/
  *.md

infrastructure/
  docker/
  scripts/
```

La ubicación exacta puede simplificarse durante bootstrap. Lo obligatorio son los límites; no crear todos los paquetes vacíos. `contracts` no se convierte en un vertedero de modelos internos y `shared-kernel` no importa módulos de negocio.

## 14. Convenciones de ingeniería

### 14.1 Nombres y contratos

- Código, DB, API, permisos y eventos en inglés; documentación de producto puede estar en español.
- Casos de uso con verbo + sustantivo: `CreateCompany`, `AssignRole`.
- Permisos: `<context>.<resource>.<action>`, por ejemplo `organization.companies.read`.
- Eventos de integración: `<context>.<aggregate>.<past-tense>.v<major>`.
- Errores: constantes `UPPER_SNAKE_CASE`, estables y documentadas.
- No exponer entidades, modelos Prisma o stack traces como respuesta.

### 14.2 Git y versionado

- Branches breves: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- Commits con Conventional Commits y scope útil.
- Paquetes y plugins con Semantic Versioning.
- API y schemas de eventos se versionan por compatibilidad, no por cada release.
- Cambios de arquitectura, tenancy, auth, datos, eventos, plugins o deployment requieren ADR.

### 14.3 Definition of Done

- Reglas, scopes, permisos, eventos y auditoría identificados.
- Validación, errores e idempotencia cubiertos donde corresponda.
- Tests unitarios/integración/E2E proporcionales al riesgo.
- Migración revisada y reversible operacionalmente mediante backup/forward fix.
- OpenAPI y documentación del módulo actualizados.
- Lint, typecheck, tests, build, `git status` y diff inspeccionados.
- Security, tenant isolation, performance y observability revisados.

## 15. Criterios para extraer un microservicio

No se extrae un módulo solo porque exista como bounded context. Deben coincidir varias señales:

- Perfil de escalado o disponibilidad materialmente distinto.
- Ownership de equipo independiente y contrato suficientemente estable.
- Aislamiento regulatorio o de seguridad demostrado.
- El costo operativo y la consistencia distribuida son aceptables.
- Métricas muestran que el monolito es el límite real.

Antes de extraer, se elimina acceso cruzado a tablas, se estabilizan contratos y se documentan consistencia, retries, observabilidad y recuperación. Payment, Notifications, Search, Commerce, Inventory o Files son candidatos, no compromisos.

## 16. Architecture fitness functions

Architecture V1 se considerará preservada si CI puede verificar gradualmente:

- No hay imports desde internals de otro módulo.
- Domain no depende de frameworks o infraestructura.
- Toda tabla tenant-owned declara el scope y las FKs no cruzan tenants.
- Toda ruta privada declara autenticación y policy; excepciones públicas están allowlisted.
- Schemas OpenAPI y eventos pasan compatibility checks.
- No se usan tipos float para importes monetarios.
- No existen mutaciones de inventario fuera de su ledger cuando ese módulo sea creado.

## 17. Primera secuencia de construcción

La primera implementación debe ser un vertical slice de Foundation, no todos los esqueletos a la vez:

1. Bootstrap mínimo del monorepo, configuración tipada, CI y entorno local.
2. PostgreSQL/Prisma, transacciones, IDs, timestamps y test harness.
3. Tenant + User + Membership con dos-tenant isolation tests.
4. Session/Auth + deny-by-default RBAC scoped.
5. Organization + Company y selección segura de contexto.
6. Audit + transactional outbox + worker idempotente.
7. Configuration, App Registry mínimo, Files y Notifications base.
8. Revisión integral de Foundation antes de Master Data.

El detalle, gates y dependencias están en `docs/ROADMAP.md`.
