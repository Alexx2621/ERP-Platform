# Multi-Tenancy V1 — Propuesta

Estado: **Aceptada, implementada y verificada tres veces contra Postgres
real (manual, integration test y E2E de navegador) — sesión 22,
2026-08-30. Ver "Revisión de cierre de Foundation" en
`docs/PROJECT_STATE.md`.**

Alcance: aislamiento, jerarquía organizacional y autorización contextual de V1

## 1. Decisión V1

V1 utilizará **una base PostgreSQL y un esquema compartidos**, con discriminación por `tenant_id`. El aislamiento se aplicará en varias capas:

1. contexto de tenant resuelto en backend;
2. casos de uso y policies con scope explícito;
3. repositorios tenant-scoped sin métodos “sin scope” para datos empresariales;
4. claves, uniques y foreign keys que preserven el tenant;
5. pruebas automatizadas de acceso cruzado;
6. RLS opcional como defensa adicional cuando un spike demuestre una integración segura.

No se usará una base o schema por tenant en V1. Ese modelo eleva el costo de migraciones, pooling, operación y observabilidad antes de que existan requisitos de aislamiento físico. La arquitectura conservará una ruta futura para tenants dedicados mediante routing de conexión, pero no promete migración transparente.

## 2. Principios invariantes

- El tenant es el límite primario de seguridad y propiedad de datos.
- Ningún identificador recibido del cliente concede acceso por sí mismo.
- El backend deriva `tenant_id` de una sesión, API key, service account o mapping de integración verificado.
- Todo dato tenant-owned tiene `tenant_id NOT NULL`.
- Las relaciones tenant-owned no pueden cruzar tenants.
- La ausencia de `company_id` no convierte un registro en global; puede seguir siendo tenant-scoped.
- Un usuario global no puede acceder a un tenant sin un Membership activo.
- Permisos, rol, plan, módulo habilitado y scope deben cumplirse a la vez.
- Los procesos async llevan un snapshot de contexto mínimo y vuelven a autorizar cualquier acción sensible.
- La administración de plataforma está separada de las rutas y roles del tenant.

## 3. Modelo conceptual

```text
Platform
  |
  +-- Tenant (customer and isolation boundary)
        |
        +-- Membership -- User (global identity)
        |       |
        |       +-- RoleAssignment(s) at tenant/company/branch/warehouse scope
        |
        +-- Organization (governance/grouping)
        |       |
        |       +-- Company (legal/accounting entity)
        |               |
        |               +-- Branch (operating establishment)
        |               +-- Location (physical/logical place)
        |               +-- Warehouse (inventory facility)
        |                       +-- optional branch_id
        |                       +-- optional location_id
        |
        +-- TenantApp / Settings / Audit / business data
```

`Branch`, `Location` y `Warehouse` no forman una cadena obligatoria. Son dimensiones relacionadas bajo `Company`.

## 4. Definiciones y reglas

### 4.1 Platform

La instancia SaaS operada por el proveedor. Posee datos globales mínimos: catálogo de permisos, definiciones de apps, configuración operativa y cuentas de operadores de plataforma separadas.

No es un tenant “especial” y no debe aparecer como `tenant_id = null` para ejecutar rutas empresariales.

### 4.2 Tenant

Cliente contractual y límite de aislamiento. Controla membresías, entitlement de módulos, políticas base, branding y configuración tenant-wide.

Reglas:

- Tiene `id`, `slug`, `status`, timestamps y versionado operativo.
- Estados mínimos: `PROVISIONING`, `ACTIVE`, `SUSPENDED`, `CLOSING`, `CLOSED`.
- Suspender bloquea operaciones interactivas y nuevas escrituras según política, pero no elimina datos.
- Slug es una referencia de routing, no una credencial.
- Un tenant tiene una o más organizations; para onboarding simple se crea una organization predeterminada.

### 4.3 Organization

Agrupación administrativa dentro de un tenant. Permite representar un grupo empresarial, unidad de gobierno o agrupación de companies. No tiene por defecto semántica fiscal, inventario ni contabilidad.

Reglas:

- Pertenece exactamente a un tenant.
- Puede contener cero o más companies durante provisioning; un tenant operativo normalmente tendrá al menos una.
- V1 no requiere organizations anidadas; añadir árbol exige caso de negocio y ADR.
- No sustituye a Company en documentos legales o transacciones.

### 4.4 Company

Entidad legal/contable u operación empresarial autónoma. Es el scope habitual de master data, documentos comerciales, moneda funcional, fiscalidad y series.

Reglas:

- Pertenece a una organization y al mismo tenant.
- Un tenant puede contener varias companies.
- Código y tax identifier tienen uniques definidos por jurisdicción/scope, no globales por intuición.
- Sus registros empresariales no se comparten con otra company salvo un modelo explícito.
- Desactivarla no elimina historial.

### 4.5 Branch

Establecimiento operativo o comercial de una company: tienda, oficina, planta o sede. Puede ser relevante para permisos, ventas, POS, series o reportes.

Reglas:

- Pertenece exactamente a una company y tenant.
- Puede tener una ubicación principal, pero no equivale a Location.
- No posee stock por sí sola; el stock pertenece a warehouses/locations de inventario.

### 4.6 Location

Lugar físico o lógico reutilizable: dirección, piso, zona operativa, punto de servicio o ubicación interna. En Foundation representa estructura y dirección; las ubicaciones de bins/picking se modelarán dentro de Inventory/Warehousing cuando corresponda.

Reglas:

- Pertenece a una company; puede asociarse opcionalmente a una branch.
- Una dirección se modela como value object/estructura, no como texto opaco si debe consultarse.
- No implica capacidad de inventario.

### 4.7 Warehouse

Instalación que custodia inventario. Se introduce como master data antes de Inventory; saldos y movimientos pertenecen al bounded context Inventory.

Reglas:

- Pertenece exactamente a una company y tenant.
- Puede asociarse a una branch y/o location compatibles de la misma company.
- Puede existir sin branch (por ejemplo, centro de distribución).
- Nunca se deduce el stock desde Company o Branch.
- Los transfers futuros siempre registran warehouse origen/destino y ledger trazable.

### 4.8 User

Identidad humana global de autenticación. Guarda información mínima de identidad y seguridad; no posee permisos empresariales directos.

Reglas:

- Puede tener memberships en distintos tenants.
- El email normalizado puede ser único global si la estrategia de Identity lo confirma.
- Cambiar o bloquear una identidad afecta sus sesiones, pero la baja en un tenant se gestiona en Membership.
- PII adicional se minimiza y queda sujeta a políticas de privacidad.

### 4.9 Membership

Relación entre User y Tenant. Es el sujeto de autorización empresarial.

Reglas:

- Unique `(tenant_id, user_id)`.
- Estados mínimos: `INVITED`, `ACTIVE`, `SUSPENDED`, `REVOKED`.
- Contiene datos del vínculo, no credenciales.
- Los roles se asignan al membership con un scope.
- El acceso a companies puede derivarse de role assignments; si se materializa `membership_company_access`, se mantiene como restricción explícita y auditable, no como permiso paralelo ambiguo.

## 5. Scope de datos

Cada tipo de dato declara un único scope de ownership primario:

| Scope | Ejemplos | Columnas mínimas |
| --- | --- | --- |
| Platform | permission definitions, app definitions | sin `tenant_id` |
| Tenant | roles tenant-wide, settings, tenant apps | `tenant_id` |
| Organization | gobierno/grupo | `tenant_id`, `organization_id` |
| Company | products, customers, price lists | `tenant_id`, `company_id` |
| Branch | POS shifts, branch configuration | `tenant_id`, `company_id`, `branch_id` |
| Warehouse | stock, reservations, movements | `tenant_id`, `company_id`, `warehouse_id` |
| User preference | preferencias personales dentro del tenant | `tenant_id`, `user_id` o `membership_id` |

No todas las tablas deben copiar toda la jerarquía. Sí deben incluir las claves necesarias para aislamiento, consultas y FKs seguras. La decisión se registra por aggregate/table.

Los datos compartidos entre companies no se implementan omitiendo `company_id` accidentalmente. Deben tener un aggregate tenant-scoped explícito y reglas de publicación/consumo. V1 prefiere ownership por company para master data; un catálogo tenant-wide futuro exige diseño propio.

## 6. Resolución de contexto

### 6.1 Requests interactivas

1. Autenticar identidad y validar sesión.
2. Resolver tenant solicitado desde host/subdomain o header de contexto permitido.
3. Cargar Membership activo para `(user_id, tenant_id)`.
4. Comprobar estado `ACTIVE` de Tenant y Membership.
5. Resolver company/branch/warehouse desde la ruta o header solo si el endpoint lo requiere.
6. Verificar que cada scope pertenece al tenant y que el membership puede usarlo.
7. Crear un `ExecutionContext` inmutable.
8. Evaluar app entitlement/enablement y policy del permiso.

Conceptualmente:

```text
ExecutionContext
  requestId
  correlationId
  actor: { type, userId?, serviceAccountId? }
  tenantId
  membershipId?
  companyId?
  branchId?
  warehouseId?
  locale
  timezone
```

No se propaga el objeto HTTP dentro de Domain. Application recibe un contexto tipado con lo mínimo necesario.

### 6.2 Jobs y eventos

- El producer incluye `tenantId`, actor/correlation/causation y scopes necesarios en el envelope.
- El consumer crea un nuevo contexto de sistema limitado al handler.
- Un actor humano histórico se registra para auditoría, pero no se confunde con la identidad técnica que ejecuta el job.
- Antes de mutar, el consumer valida que tenant, módulo y recursos sigan vigentes cuando esa vigencia sea relevante.
- Nunca se confía en un payload para cambiar a otro tenant durante el handler.

### 6.3 Rutas públicas e integraciones

- Una API key guarda tenant/scopes server-side; el cliente no decide su tenant.
- Un webhook entrante se asocia a una installation/configuration conocida antes de procesar su payload.
- Un storefront resuelve tenant/storefront por dominio configurado y verificado.
- Los endpoints de onboarding de tenant son parte de un plano controlado y no simulan un contexto tenant aún inexistente.

## 7. Repositorios y transacciones

Los repositorios de datos tenant-owned requieren contexto en construcción o en cada operación. No se ofrecerá `findById(id)` sin scope; será conceptualmente `findById(context, id)` o un repositorio ya ligado al contexto.

Reglas:

- Todas las queries incluyen tenant aunque el ID sea UUID no secuencial.
- Los updates/deletes incluyen tenant y verifican filas afectadas.
- Las transacciones propagan el mismo contexto y cliente DB.
- Raw SQL queda encapsulado, parametrizado, revisado y cubierto por isolation tests.
- Los caches incluyen tenant y scope en la key; su invalidación conserva el mismo scope.
- Locks Redis incluyen tenant y aggregate; el lock no sustituye constraints/transacciones DB.

## 8. Integridad en PostgreSQL

Patrón recomendado para datos tenant-owned:

```text
PRIMARY KEY (id)
UNIQUE (tenant_id, id)
FOREIGN KEY (tenant_id, parent_id)
  REFERENCES parent (tenant_id, id)
```

Esto permite IDs simples en APIs y, a la vez, impide una FK hacia un parent de otro tenant. Prisma y PostgreSQL deberán validarse en un spike antes de estandarizar el patrón exacto.

Además:

- Uniques naturales incorporan scope: `(tenant_id, normalized_name)` o `(tenant_id, company_id, code)`.
- Checks aseguran combinaciones de scope válidas.
- Índices comienzan con `tenant_id` cuando el patrón de query lo justifica.
- Tablas globales se mantienen en allowlist documentada.
- El rol normal de aplicación no tiene privilegios de owner ni puede desactivar controles.

### 8.1 Row Level Security

RLS ofrece defensa en profundidad contra queries sin filtro, pero añade riesgos:

- variables de sesión filtradas entre conexiones del pool;
- migraciones y workers con contextos diferentes;
- comportamiento especial de owners/bypass roles;
- mayor complejidad de debugging y testing con Prisma.

Por ello, V1 empieza con enforcement de aplicación + constraints. Antes de producción se ejecutará un spike con `SET LOCAL` dentro de transacciones, PgBouncer/pool real, jobs y pruebas de fuga. Si se adopta RLS:

- será adicional, nunca el único control;
- el rol de runtime no será owner ni tendrá `BYPASSRLS`;
- toda operación tenant-owned ocurrirá dentro de una transacción que fije contexto;
- las tablas sin policy serán deny-by-default según una allowlist explícita.

## 9. RBAC con scope

### 9.1 Catálogo de permisos

Los permisos son definiciones globales registradas por Platform Core o un módulo oficial:

```text
organization.companies.read
organization.companies.manage
access.roles.read
access.roles.manage
inventory.stock.read
inventory.adjustments.create
```

No se crean permisos arbitrarios desde UI. Los roles del tenant agrupan permisos existentes.

### 9.2 Asignaciones

Un `RoleAssignment` une:

- membership;
- role;
- scope type;
- scope id cuando aplique;
- vigencia opcional;
- actor y timestamp de asignación.

Scopes iniciales: `TENANT`, `COMPANY`, `BRANCH`, `WAREHOUSE`. Organization scope se añadirá solo si aparecen políticas reales que lo necesiten.

La herencia es descendente únicamente cuando el permiso lo admita y la policy lo defina. Un rol company-scoped no concede acceso a otra company. Un permiso warehouse-scoped no autoriza automáticamente operaciones branch-scoped.

### 9.3 Evaluación de autorización

```text
allow = authenticated
    AND tenant.active
    AND membership.active
    AND app.entitled_and_enabled
    AND requested_resource.belongs_to_context
    AND role_assignment.covers_scope
    AND permission.granted
    AND domain_policy.allows
```

El resultado por defecto es deny. ABAC no será un motor genérico en V1; reglas contextuales (por ejemplo, límite de aprobación) serán policies tipadas del módulo.

## 10. Configuración y precedencia

Scopes soportados conceptualmente:

```text
platform default
  -> tenant override
      -> company override
          -> module/company override
              -> user preference (solo presentación permitida)
```

No toda setting admite todos los scopes. `SettingDefinition` declara tipo, schema, scopes permitidos, sensibilidad y estrategia de herencia. Secrets no se guardan como JSONB plano; se referencian desde un secret manager o se cifran con gestión de claves aprobada.

## 11. Provisioning y ciclo de vida

### 11.1 Provisioning mínimo

Una operación idempotente crea atómicamente:

1. Tenant en `PROVISIONING`.
2. Membership owner inicial.
3. Organization predeterminada.
4. Company inicial si el onboarding la proporciona.
5. Roles base versionados.
6. Settings requeridos.
7. Apps Foundation obligatorias.
8. Evento de provisioning.
9. Activación al completar validaciones.

Un retry no duplica ninguno de estos registros.

### 11.2 Suspensión y cierre

- `SUSPENDED`: impide login/operaciones según policy, conserva jobs imprescindibles y datos.
- `CLOSING`: congela cambios incompatibles, permite exportación/retención controlada.
- `CLOSED`: acceso normal revocado; datos siguen la política legal y de backup.
- Borrado físico es un proceso administrativo explícito, auditable y con ventanas de retención; nunca un cascade accidental.

## 12. Casos especiales

### 12.1 Operadores de soporte

No reciben roles dentro de todos los tenants. El acceso de soporte será just-in-time, con motivo, aprobación/MFA cuando corresponda, expiración, banner visible y auditoría reforzada. No entra en la primera implementación salvo funciones operativas indispensables.

### 12.2 Service accounts y API keys

Son actores separados de User/Membership. Tienen tenant, scopes, expiración, revocación, rate limit y secret hash. Nunca heredan permisos globales implícitos.

### 12.3 Analytics

Los pipelines analíticos no consultarán datos sin scope desde endpoints normales. Exportaciones incluyen tenant lineage; cualquier dataset agregado/anónimo requiere política y controles propios.

## 13. Pruebas obligatorias

- Tenant A no puede leer, actualizar, borrar ni relacionar IDs de Tenant B.
- Membership suspendido/revocado pierde acceso y sesiones según policy.
- Company/Branch/Warehouse de otro tenant o company se rechazan aunque el usuario manipule la URL.
- FKs y uniques impiden referencias cruzadas directamente en DB.
- Un job/evento con tenant incorrecto falla cerrado y no reintenta infinitamente una violación permanente.
- Cache keys y locks no colisionan entre tenants.
- Roles tenant-scoped y company-scoped respetan límites y deny-by-default.
- Operaciones raw SQL pasan la misma matriz de aislamiento.
- Si se habilita RLS, se prueban pool reuse, transacciones, worker, migraciones y rol privilegiado.

## 14. Decisiones que no deben asumirse todavía

- Compartir Products o Customers entre companies.
- Jerarquías de organizations o branches arbitrariamente profundas.
- Mover un registro empresarial de una company a otra.
- Fusionar tenants.
- Sharding, database-per-tenant o residencia por región.
- Acceso cross-tenant para grupos corporativos.

Cada caso cambia ownership, auditoría y autorización; requiere diseño y ADR antes de implementarse.
