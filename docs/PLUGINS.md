# Plugin Architecture V1 — Propuesta

Estado: **El subconjunto "mínimo" (App Registry: `AppDefinition`/
`TenantApp`/`AppConfiguration`, catálogo code-owned, chequeo real de
dependencias/dependents) está implementado y ratificado en
`docs/DECISIONS.md` ADR-005. Desde ADR-015 (Fase 11, sesión 35), el
catálogo (`FOUNDATION_APPS`) contiene los 15 módulos de negocio reales
construidos en las Fases 2-10, con sus dependencias reales, y
`AppEnablementGuard` aplica ese estado de verdad sobre los 32
controladores de esos módulos — deshabilitar una app ahora bloquea de
verdad sus propias rutas, no solo la pantalla "Apps". Un tenant nuevo
habilita automáticamente el catálogo completo al aprovisionarse
(`EnableAllCatalogAppsUseCase`), y un seeder de backfill
(`TenantAppEnablementSyncSeeder`) hace lo mismo para tenants ya
existentes en cada arranque del API. El resto de este documento
(manifests compilados en build, SemVer ranges, la máquina de estados
completa, entitlement/facturación, registries de contribución de
frontend/backend, un "Plugin SDK" separado, un modelo de confianza real
para terceros) sigue como propuesta de referencia sin implementar — ver
ADR-005 y ADR-015, ambos "Deferred".**

Alcance: módulos/apps oficiales, App Registry y extensiones controladas de V1

## 1. Decisión V1

“Plugin” en V1 significa **módulo oficial y confiable, incluido en el build y desplegado por el operador de la plataforma**. Su activación es dinámica por tenant, pero su código no se descarga ni se ejecuta dinámicamente.

V1 no permitirá:

- código de terceros;
- `eval`, import desde URL o paquetes subidos por tenants;
- procesos con permisos arbitrarios;
- migraciones ejecutadas al presionar “Install”;
- acceso directo de un módulo a tablas internas de otro;
- UI remota sin aislamiento ni revisión;
- marketplace público.

Este límite mantiene una experiencia componible sin convertir la primera versión en una plataforma de ejecución no confiable.

## 2. Modelo de capas

```text
Platform deployment
  +-- App Catalog (manifests compiled and validated)
  +-- Official module code
  +-- Global DB migrations for deployed code
  |
  +-- Plan / Entitlement (what tenant is allowed to use)
  |      |
  |      +-- TenantApp installation (accepted/configured)
  |               |
  |               +-- Enabled/Disabled at tenant scope
  |               +-- optional company configuration if app declares it
  |
  +-- Runtime registries
         backend routes/handlers/jobs
         permissions/events/settings
         frontend routes/menu/widgets/reports
```

Código desplegado, entitlement, instalación y habilitación son estados distintos.

## 3. Conceptos

### 3.1 Module

Unidad de código y ownership alineada con un bounded context o channel. Tiene API pública, persistencia propia, permisos y lifecycle hooks controlados.

### 3.2 App

Unidad visible/activable por el cliente. Puede mapear uno a uno con un módulo o componer varios módulos. Por ejemplo, una futura App “POS” depende de Products, Sales y Payments.

### 3.3 Plugin

Término de extensibilidad. En V1 es sinónimo operativo de app/módulo oficial empaquetado. En una fase futura podrá significar paquete de terceros, pero requerirá otro trust model y ADR.

### 3.4 App Catalog

Catálogo global derivado de manifests presentes en el deployment. Define qué puede habilitarse, versiones, dependencias y contribuciones.

### 3.5 TenantApp

Registro tenant-scoped del lifecycle de una app: instalación, configuración, enablement, suspensión y versión efectiva.

### 3.6 Entitlement

Derecho comercial/técnico otorgado por plan, contrato o feature grant. Tener entitlement no habilita automáticamente una app; habilitarla tampoco debe saltar el entitlement.

## 4. Manifest V1

Ejemplo conceptual, no contrato implementado:

```json
{
  "schemaVersion": 1,
  "id": "manufacturing",
  "name": "Manufacturing",
  "version": "1.0.0",
  "kind": "BUSINESS_APP",
  "platformCompatibility": ">=1.0.0 <2.0.0",
  "dependencies": [
    { "id": "products", "version": ">=1.2.0 <2.0.0", "required": true },
    { "id": "inventory", "version": ">=1.1.0 <2.0.0", "required": true },
    { "id": "purchasing", "version": ">=1.0.0 <2.0.0", "required": true }
  ],
  "permissions": [
    "manufacturing.orders.read",
    "manufacturing.orders.create"
  ],
  "settings": [
    "manufacturing.default_warehouse"
  ],
  "events": {
    "publishes": ["manufacturing.production.completed.v1"],
    "subscribes": ["inventory.stock.changed.v1"]
  },
  "backend": {
    "routes": true,
    "jobs": ["manufacturing.plan-production.v1"]
  },
  "frontend": {
    "routes": ["/manufacturing/orders"],
    "menu": ["manufacturing"],
    "widgets": ["manufacturing.production-pending"]
  }
}
```

### 4.1 Campos requeridos

- `schemaVersion`: versión del formato de manifest.
- `id`: identificador estable, lowercase kebab-case, nunca reutilizado.
- `name`: nombre de presentación localizable por key en implementación.
- `version`: Semantic Versioning del app/module contract.
- `kind`: `PLATFORM`, `BUSINESS_APP`, `CHANNEL`, `INTEGRATION` o `INDUSTRY_EXTENSION`.
- `platformCompatibility`: rango compatible con la plataforma.
- `dependencies`: IDs, rangos y obligatoriedad.
- `permissions`: catálogo declarado, no permisos otorgados.
- `settings`, `events`, `backend`, `frontend`: contribuciones allowlisted.

### 4.2 Campos excluidos de V1

- Comandos de shell.
- URLs de código ejecutable.
- SQL/migrations arbitrarias.
- Secrets en texto plano.
- Componentes frontend serializados como código.
- Hooks genéricos con acceso al contenedor de dependencias.

## 5. Validación del catálogo

CI/build valida antes de desplegar:

- unicidad de IDs y contribuciones;
- manifest contra schema;
- SemVer y platform compatibility;
- existencia y versión de dependencias;
- grafo dirigido acíclico;
- permisos con namespace del módulo;
- rutas, menu IDs, settings, jobs y event contracts sin colisiones;
- consumers que referencian schemas existentes;
- ownership/import boundaries;
- migrations presentes y compatibles para el código desplegado.

Un catálogo inválido impide el build/deployment; no se descubre el error durante una activación tenant.

## 6. Dependencias

Reglas:

- Foundation apps obligatorias no pueden deshabilitarse.
- Una dependencia requerida debe estar deployed, compatible, entitled, instalada y enabled.
- El enablement se ejecuta en orden topológico.
- No se permiten ciclos, incluyendo ciclos ocultos mediante dependencias opcionales.
- Una dependencia opcional solo activa una integración explícita; el módulo debe funcionar sin ella.
- Deshabilitar una app con dependents activos se rechaza o requiere deshabilitar el closure completo con confirmación.
- Un event subscription no elimina la necesidad de declarar dependencia cuando existe acoplamiento funcional obligatorio.

Ejemplos iniciales:

```text
POS -> Products + Sales + Payments
E-commerce -> Products + Customers + Sales + Payments
Manufacturing -> Products + Inventory + Purchasing
Accounting integration -> source modules via stable contracts/events
```

Estas dependencias se refinan al diseñar cada módulo; no autorizan implementar esos dominios durante Foundation.

## 7. Lifecycle por tenant

Estados propuestos:

```text
AVAILABLE -> INSTALLING -> INSTALLED -> ENABLING -> ENABLED
                                |             |
                                v             v
                              FAILED       DISABLING -> DISABLED
                                                |
                                                v
                                             SUSPENDED
```

### 7.1 Install

En V1 “install” no instala código ni ejecuta una migración. Valida entitlement/dependencies, crea configuración tenant-scoped y registra aceptación del módulo de código ya desplegado. Es idempotente y auditable.

### 7.2 Enable

Permite rutas, jobs y contribuciones de UI para el tenant. Antes valida configuración requerida, dependencies, estado del tenant y compatibilidad.

### 7.3 Disable

Impide nuevas operaciones y oculta entrypoints, pero:

- no borra datos;
- no elimina permisos históricos ni audit logs;
- mantiene handlers indispensables para completar/compensar workflows en curso según policy;
- cancela o pausa jobs de forma explícita;
- puede requerir preflight si existen operaciones abiertas.

### 7.4 Uninstall

No se ofrece como borrado destructivo en V1. El tenant puede deshabilitar. Retención/exportación/purga se diseñará por módulo y cumplimiento antes de introducir uninstall.

### 7.5 Upgrade

Las migrations de DB se ejecutan por deployment para todos los tenants antes de activar código compatible, usando estrategias expand/contract cuando sea necesario. `TenantApp.version` representa la versión/configuración efectiva, no un schema físicamente distinto por tenant.

## 8. Backend extension model

Cada módulo oficial registra mediante contratos tipados conocidos en build time:

- NestJS module/composition entrypoint;
- public application facade/ports;
- REST controllers bajo namespace propio;
- permission definitions;
- setting definitions;
- integration event schemas y handlers;
- BullMQ job definitions/processors;
- health/metrics contributions limitadas.

Un guard central verifica app enablement además de auth/policy. Esto no sustituye la validación dentro del use case para jobs o llamadas internas.

### 8.1 Límites

- Sin service locator global para obtener cualquier repositorio.
- Sin acceso directo a Prisma models de otro módulo.
- Sin registrar middleware global arbitrario.
- Sin monkey patching de Core.
- Sin hooks genéricos “before/after everything”.
- Las extensiones usan ports explícitos o integration events.

## 9. Frontend extension model

El ERP será una sola app modular, no microfrontends. Los módulos incluidos en el build exportan contribuciones declarativas y componentes tipados:

- `registerRoute`
- `registerMenuItem`
- `registerSettingsPage`
- `registerDashboardWidget`
- `registerReport`
- `registerCommand`

El runtime filtra contribuciones por:

1. app deployed y compatible;
2. entitlement e instalación;
3. enabled para tenant/company cuando aplique;
4. permisos del membership;
5. feature flags aprobadas.

Ocultar UI no es autorización. Cada API vuelve a validar tenant, módulo, permiso y scope.

### 9.1 Reglas de UI

- IDs y route paths con namespace del módulo.
- Un módulo no modifica directamente el sidebar raíz.
- Slots de dashboard y settings tienen contratos y budgets de rendering.
- Error boundaries aíslan fallos visuales de una contribución.
- Lazy loading puede optimizar bundles, pero el código sigue siendo parte del build confiable.
- No se cargan iframes o scripts remotos en V1.

## 10. Datos y migrations

- Cada módulo es dueño de sus tablas y repositorios.
- Las FKs hacia otro módulo se evitan cuando crean acoplamiento de lifecycle; si una invariante relacional las justifica, se documenta explícitamente.
- Ningún módulo escribe tablas de otro.
- Las migrations se revisan, versionan y ejecutan en deployment, no por tenant activation.
- Deshabilitar no hace `DROP TABLE`.
- Configuración flexible puede usar JSONB solo con schema/version y límites; las entidades principales siguen relacionales.
- Backfills grandes se ejecutan con jobs operativos observables y reentrantes.

## 11. Permisos y settings

### 11.1 Permisos

El manifest declara definiciones; el App Registry las registra globalmente. Un tenant role solo puede incluir permisos de apps disponibles y la autorización efectiva exige que la app siga enabled.

Deshabilitar una app no elimina asignaciones: quedan inefectivas y pueden restaurarse si se habilita de nuevo. Cada cambio de rol/app es auditable.

### 11.2 Settings

Cada setting declara:

- key namespaced;
- tipo/schema y default;
- scopes permitidos;
- si es required para enablement;
- sensibilidad;
- estrategia de herencia;
- migración de configuración entre versiones.

Los secrets se guardan cifrados/referenciados mediante infraestructura aprobada y se redacted en APIs/logs.

## 12. Eventos y jobs

- Published/subscribed events se declaran para visibilidad y compatibility checks.
- El handler verifica app y tenant state si su efecto depende del enablement.
- Eventos históricos no se descartan silenciosamente al deshabilitar; cada subscription define ignore, finish o compensate.
- Jobs llevan app ID/version, tenant, correlation e idempotency key.
- Desplegar una versión nueva mantiene compatibilidad con mensajes ya en cola o proporciona upcaster/handler versionado.

Ver `docs/EVENTS.md` para garantías de entrega y schemas.

## 13. App Registry

Responsabilidades V1:

- cargar y validar catálogo compilado;
- listar apps disponibles y dependencias;
- resolver dependency graph;
- consultar entitlement;
- instalar/configurar/habilitar/deshabilitar por tenant;
- exponer contribuciones backend/frontend autorizadas;
- auditar cambios;
- emitir integration events de lifecycle;
- impedir estados inconsistentes.

No es responsable de:

- ejecutar código no confiable;
- facturar el plan SaaS;
- migrar schema bajo demanda;
- resolver lógica empresarial de cada app;
- conceder permisos automáticamente fuera de roles base explícitos.

## 14. Seguridad

- Solo artifacts firmados/creados en el pipeline oficial entran al catálogo V1.
- Dependencias se fijan con lockfile y scanning de supply chain.
- Apps operan con least privilege lógico; a futuro, procesos externos requerirán credenciales y red separadas.
- Configuración y secrets nunca se interpolan en comandos.
- Rutas y jobs se registran desde allowlists tipadas.
- Integraciones salientes aplican egress/SSRF controls, timeouts y circuit breakers.
- Cambios de lifecycle requieren permisos granulares, reautenticación para acciones sensibles y audit log.

## 15. Testing obligatorio

- Manifest inválido, dependencia ausente, ciclo o rango incompatible bloquean catálogo.
- Tenant sin entitlement no puede instalar/habilitar ni invocar API.
- App disabled no aparece en UI y sus endpoints/jobs fallan cerrado según policy.
- Deshabilitar una dependency con dependents activos se rechaza.
- Install/enable/disable son idempotentes y auditables.
- Tenant A no altera TenantApp/configuración de Tenant B.
- Permisos inefectivos de app disabled no conceden acceso.
- Upgrade conserva compatibilidad con config, events y queued jobs.
- Un módulo no importa internals ni escribe tablas de otro.

## 16. Evolución a terceros

Antes de admitir plugins externos se necesita una Architecture V2 específica con, como mínimo:

- trust levels, firma, revisión y provenance;
- sandbox/proceso aislado, cuotas y resource limits;
- capabilities y least-privilege APIs;
- network egress policy y secret brokering;
- data-access consent y scopes visibles al tenant;
- formato de paquete, registry, rollback y kill switch;
- SDK estable y compatibility certification;
- UI isolation/CSP;
- migration/data ownership y uninstall semantics;
- incident response, revocation y marketplace governance.

El manifest V1 prepara vocabulario y catálogo, pero no se considerará una frontera de seguridad para código hostil.
