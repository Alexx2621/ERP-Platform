# Project State

Última actualización: 2026-09-03 (sesión 35), tras implementar la Fase 11
(Plugin Platform) completa a nivel de alcance proporcional — el catálogo
del App Registry (`FOUNDATION_APPS`) pasó de estar vacío a contener los 15
módulos de negocio reales construidos en las Fases 2-10, con sus
dependencias reales, y un `AppEnablementGuard` nuevo aplica ese estado de
verdad sobre los 32 controladores de esos módulos — deshabilitar una app
ahora bloquea de verdad sus propias rutas HTTP, no solo la pantalla
"Apps" — a pedido explícito del usuario ("Continua con la siguiente fase
y dejala terminada de una vez"), inmediatamente después de cerrar la Fase
10. Ver "PHASE 11 — Plugin Platform" en `## Current Phase` y "Hecho —
sesión 35" en `docs/WORK_QUEUE.md` para el detalle completo, incluyendo
la decisión de alcance deliberada y documentada en `docs/DECISIONS.md`
ADR-015 (nuevo): un tenant nuevo habilita automáticamente el catálogo
completo al aprovisionarse (preservando el comportamiento previo de la
plataforma, donde todos los módulos ya funcionaban para todos los
tenants), y un seeder de backfill habilita retroactivamente a cada
tenant ya existente en cada arranque real del API — verificado que
ningún tenant real perdió acceso a ningún módulo al activar la aplicación
real del enforcement. Deliberadamente fuera de alcance: un "Plugin SDK"
separado (`@erp/api-client`, ya generado desde OpenAPI real, cumple ese
rol para consumidores internos), rangos SemVer/certificación de
compatibilidad (cada app tiene una sola versión, sin ruta de upgrade que
reconciliar todavía), registries de contribución de frontend/backend
declarativos (el workspace sigue usando botones estáticos, y ocultar UI
nunca sustituye la autorización real del backend, per PLUGINS.md §9), y
cualquier modelo de confianza real para plugins de terceros (PLUGINS.md
§16 ya es el spike que el roadmap pedía, sin código nuevo). Ver
"PHASE 10 — Manufacturing" en `## Current Phase` y "Hecho — sesión 34" en
`docs/WORK_QUEUE.md` para el detalle completo, incluyendo la decisión de
alcance deliberada y documentada en `docs/DECISIONS.md` ADR-014 (nuevo):
el motor completo se construyó y se verificó de extremo a extremo contra
Postgres real (incluyendo emisión/devolución/recepción genuinamente
parciales a través de múltiples llamadas, y una carrera de 7 emisiones
genuinamente concurrentes contra 10 unidades reales de existencia), pero
**ningún costo se calcula en ningún lugar del módulo** — `docs/ROADMAP.md`
§14 condiciona explícitamente el costeo a "un modelo de costeo aprobado
antes de calcular costos", y ningún modelo de costeo se ha aprobado jamás
para este código base; calcular un costo aunque fuera "simple" habría
codificado en silencio una política de valuación no aprobada, y no habría
tenido dónde postear correctamente dado que Accounting (Fase 8, ADR-012)
sigue deliberadamente sin ninguna integración automática. Tampoco se
construyó trazabilidad de lote/serie — `docs/ROADMAP.md` §14 la condiciona
igualmente a "si el mercado lo requiere", y hacerlo habría significado
construir una versión parcial e inconsistente encima del propio hueco ya
documentado de Inventory (Fase 3) en vez de resolverlo una sola vez donde
realmente pertenece. Noveno módulo de negocio del código base con
dependencias directas y sin ciclos hacia Catalog, Warehouses e Inventory,
y el segundo (tras Accounting) sin ninguna dependencia hacia, ni desde,
Sales/Purchasing/POS/Commerce/CRM. **Bug real de UI encontrado y
corregido durante la propia escritura del test de `apps/erp-web`, antes
de cualquier commit**: `ProductSelectFields` (componente compartido entre
el selector del producto terminado y el selector de "agregar componente")
marcaba su `<select>` como `required` de forma incondicional; el
mini-formulario de "agregar componente" limpia sus propios campos a `""`
después de cada clic en "Agregar componente" para permitir agregar el
siguiente — dejando un campo `required` vacío en el DOM que el propio
navegador (y jsdom, fielmente) bloquea en silencio al enviar el formulario
externo, sin lanzar ninguna excepción ni disparar jamás el `onSubmit` —
corregido con un prop `required` opcional (`true` por defecto, `false`
para el mini-formulario de agregar componente), el mismo patrón que
Purchasing/CRM ya usaban correctamente para sus propios campos de
"agregar línea"/"agregar etapa" sin `required`.

Actualización previa: 2026-09-02 (sesión 33), tras implementar el módulo
de CRM (Fase 9) completo — Lead (con conversión real a `Customer` vía el
contrato público de Customers), Pipeline/PipelineStage configurables,
Opportunity (con transición `OPEN → WON | LOST` terminal), y Activity
(exactamente una relación entre lead/oportunidad/cliente real) — a pedido
explícito del usuario ("Continua con la fase 9"), inmediatamente después
de cerrar la Fase 8. Ver "PHASE 9 — CRM" en `## Current Phase` y "Hecho —
sesión 33" en `docs/WORK_QUEUE.md` para el detalle completo, incluyendo la
decisión de alcance deliberada y documentada en `docs/DECISIONS.md`
ADR-013: el motor de CRM se construyó completo y se verificó de extremo a
extremo contra Postgres real, pero **ningún handler consume eventos de
Sales** — ningún módulo de este código base, salvo Tenants, ha publicado
jamás un evento real de dominio por el outbox, y construir un consumidor
especulativo contra un schema de evento inventado (sin productor real que
lo valide) habría sido exactamente el tipo de maquinaria prematura que
MASTER_SPEC §59/§93 advierte evitar. Octavo módulo de negocio del código
base y el segundo (tras Sales) con una dependencia real y directa hacia
Customers — `CrmModule` importa `CustomersModule` directamente, una
dependencia dirigida y libre de ciclos.

Actualización previa: 2026-09-02 (sesión 32), tras implementar el módulo
de Contabilidad (Fase 8) completo — Chart of Accounts, Fiscal Periods,
Journal Entries/Lines de partida doble, reversión, y los reportes Balance
de Comprobación/Ledger de cuenta — a pedido explícito del usuario
("Continua con la fase 8 y terminala de una vez"). Ver "PHASE 8 —
Accounting" en `## Current Phase` y "Hecho — sesión 32" en
`docs/WORK_QUEUE.md` para el detalle completo, incluyendo la decisión de
alcance deliberada y documentada en `docs/DECISIONS.md` ADR-012: el motor
manual completo se construyó y se verificó de extremo a extremo contra
Postgres real (incluyendo una carrera de idempotencia genuinamente
concurrente sobre `(sourceType, sourceId)`), pero **ninguna
contabilización automática se conectó desde Sales, Payments, Purchasing
ni Inventory** — hacerlo exige una política contable real y específica de
jurisdicción (qué cuenta, en qué momento, base de caja o devengado) que
este código base no tiene base para inventar, y un asiento automático
incorrecto sería un daño real a los libros de una empresa, un riesgo
categóricamente mayor que cualquier otra simulación ya evitada en este
proyecto. Séptimo módulo de negocio del código base y el único sin
ninguna dependencia cruzada con otro módulo de negocio — una decisión de
diseño explícita, no una omisión.

Actualización previa: 2026-09-02 (sesión 31), tras implementar el motor de
Commerce (Fase 7A) completo — Storefront (multi-tienda, handle público
globalmente único), catalog publication (StorefrontProduct), Cart/CartLine
anónimos, y Checkout (idempotente por `cartId`, sin gateway credenciado —
ADR-011) — **la primera API genuinamente pública y sin autenticación de
todo el código base** (`/api/v1/storefront/:storefrontCode/*`), a pedido
explícito del usuario ("Ok, continua con la fase 7 y terminala de una
vez"). Ver "Hecho — sesión 31" en `docs/WORK_QUEUE.md` para el detalle
completo, incluyendo la verificación directa contra Postgres real de la
concurrencia genuina del checkout (5 solicitudes simultáneas, un solo
`CommerceOrder` sobreviviente) y dos bugs reales encontrados y corregidos
durante la propia verificación E2E (DTOs del carrito/checkout sin
decoradores de `class-validator`, rechazados por el `ValidationPipe`
global aunque el cuerpo real fuera válido; y el controlador admin
devolviendo `productCode`/`productName` vacíos tras publicar/despublicar
un producto). Sexto módulo de negocio del código base, con seis
dependencias directas y sin ciclos — la mayor superficie de cualquier
módulo hasta ahora — y el segundo (tras POS) cuyo flujo de escritura
principal orquesta otros módulos de negocio en vez de poseer su propio
dominio transaccional. La construcción del storefront Next.js (Fase 7B) se
delegó a un subagente en background con el contrato público ya estable y
verificado; su resultado se revisa e integra por separado.

Actualización previa: 2026-09-01 (sesión 30), tras implementar POS
completo — Registers, Shifts, Cash Movements, Sales (ring-up de un pedido
real vía el contrato público de Sales/Payments, idempotente por
`idempotencyKey`) y Returns (con reembolso opcional del pago original) —
**cerrando la Fase 6 por completo en un solo bloque de trabajo**, a pedido
explícito del usuario ("Continua con la fase 6 y dejala terminada de una
vez"). Ver "Hecho — sesión 30" en `docs/WORK_QUEUE.md` para el detalle
completo, incluyendo la verificación directa contra Postgres real de sus
exit criteria ("Cierres y cash movements son auditables y Decimal-safe",
"Reintentos de terminal no duplican ventas/pagos") y el límite documentado
y honesto de esa segunda garantía bajo una carrera genuinamente simultánea
(no una reintentona secuencial). Quinto módulo de negocio del código base
y el primero cuyo flujo de escritura principal es en sí mismo una
orquestación de otros dos módulos de negocio (Sales y Payments) en vez de
poseer su propio dominio transaccional.

Actualización previa: 2026-09-01 (sesión 29), tras implementar Purchasing
completo — Purchase Orders/lines con aprobación separada de administración
(segregation of duties real, no solo diseñada), Receipts genuinamente
parciales contra el ledger de Inventory, Returns a proveedor, y Supplier
Invoices como documento independiente — **cerrando la Fase 5 por completo
en un solo bloque de trabajo**, a pedido explícito del usuario ("continua
con la fase 5 y terminala de una vez"). Ver "Hecho — sesión 29" en
`docs/WORK_QUEUE.md` para el detalle completo, incluyendo la verificación
directa contra Postgres real de sus exit criteria ("Recepción parcial,
cancelación y devolución conservan trazabilidad", "Permisos de aprobación
y segregation of duties están probados"). Cuarto módulo de negocio del
código base y segundo (tras Sales) en depender directamente de Inventory
como "port transaccional" real — `RecordReceiptUseCase` ganó su primer
caller real, cumpliendo lo que su propio docstring ya anticipaba desde la
sesión 26 ("Purchasing, Phase 5, will call this once it exists").

Actualización previa: 2026-08-31 (sesión 28, segundo bug real), tras
corregir un segundo bug real reportado por el usuario, esta vez contra el
tenant "Web Space" ya en uso: todos los módulos (Apps, Catálogo, y por el
mismo mecanismo cualquier otro con un permiso agregado después de la
sesión 5) mostraban "No tienes permiso para realizar esta acción." Causa
raíz confirmada contra Postgres real: `SeedOwnerRoleUseCase` otorga al rol
Owner "todos los permisos que existan al momento del provisioning"
únicamente — un hueco ya documentado ("sin backfill retroactivo de
permisos") que nunca se había manifestado hasta ahora porque, hasta esta
sesión, ningún tenant real se usaba de forma continua a través de tantas
fases. El rol Owner de "Web Space" (aprovisionado sesión 5, cuando el
catálogo tenía 3 permisos) seguía con exactamente esos 3, de 46 que existen
hoy. Se agregó `SyncOwnerRolePermissionsUseCase` +
`OwnerRolePermissionSyncSeeder`, que corre en cada arranque de la API y
sincroniza el rol Owner de cada tenant con el catálogo vigente —
verificado contra Postgres real (14 de 17 tenants reales tenían el rol
desactualizado; "Web Space" quedó en 46/46 tras el arranque real). Ver
"Hecho — sesión 28 (segundo bug)" en `docs/WORK_QUEUE.md` para el detalle
completo.

Actualización previa de la misma sesión: 2026-08-31 (sesión 28), tras
corregir un bug real reportado por el usuario contra la infraestructura
Docker real: ningún endpoint del backend permitía listar las empresas de
un tenant, así que reabrir un tenant ya existente (fuera del flujo directo
de onboarding) perdía su `companyId` para siempre, dejando cada módulo de
negocio mostrando "Selecciona una empresa..." pese a existir una empresa
real ya provisionada. Se agregó `GET /api/v1/tenants/companies`
(descubrimiento de empresas de un tenant) y `TenantListPage` ahora lo
resuelve automáticamente (empresa única) o pide elegir (varias empresas)
antes de entrar al workspace. También se corrigió el panel "Avance del
desarrollo" del workspace, que seguía mostrando datos estáticos de cuando
Foundation cerró (sesión 22) sin reflejar el cierre real de las Fases 2, 3
y 4. Ver "Hecho — sesión 28" en `docs/WORK_QUEUE.md` para el detalle
completo, verificado con un nuevo escenario E2E de Playwright contra
infraestructura real. Ningún cambio de alcance de fase en ninguno de los
dos bugs.

Última actualización de fase previa: 2026-08-31 (sesión 27), tras implementar Sales y
Payments completos — Quotes/Sales Orders/lines con reserva de inventario
vía un port transaccional real, Returns como registro independiente, y
captura/reembolso de pagos idempotentes vía CASH/BANK_TRANSFER —
**cerrando la Fase 4 por completo en un solo bloque de trabajo**. Ver
"Hecho — sesión 27" en `docs/WORK_QUEUE.md` para el detalle completo,
incluyendo las garantías de sus exit criteria ("Confirm/cancel/return
tienen invariantes y compensaciones probadas", "Duplicar request no
duplica orden, cargo ni refund") verificadas contra Postgres real, no
solo razonadas, dos bugs reales encontrados y corregidos antes/durante la
verificación (una invariante de bodega violada en la conversión de
cotizaciones; auditoría duplicada en una recaptura idempotente de pago), y
ADR-009 nuevo (Payment Gateway Adapters V1). Modelo de trabajo vigente:
`docs/WORK_QUEUE.md` (reemplaza `docs/tasks/FOUNDATION-00X.md`/
`CURRENT.md`, que quedan como historial).

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

PHASE 11 — Plugin Platform, **iniciada y formalmente cerrada el
2026-09-03 (sesión 35, en un solo bloque de trabajo, a alcance
proporcional)**, a pedido explícito del usuario ("Continua con la
siguiente fase y dejala terminada de una vez"), inmediatamente después de
cerrar la Fase 10: el catálogo del App Registry (`FOUNDATION_APPS`,
`apps/api/src/core/app-registry/application/app-catalog.ts`) pasó de
estar deliberadamente vacío (ADR-005, sesión 22) a contener los 15
módulos de negocio reales construidos en las Fases 2-10 — `catalog`,
`customers`, `suppliers`, `taxes`, `warehouses`, `accounting`, `pricing`
(→ `catalog`), `crm` (→ `customers`), `inventory` (→ `catalog`,
`warehouses`), `sales` (→ `catalog`, `warehouses`, `taxes`, `pricing`,
`customers`, `inventory`), `payments` (→ `sales`), `purchasing` (→
`catalog`, `warehouses`, `suppliers`, `inventory`), `pos` (→
`warehouses`, `sales`, `payments`), `commerce` (→ `catalog`,
`warehouses`, `customers`, `sales`, `payments`), `manufacturing` (→
`catalog`, `warehouses`, `inventory`) — cada `dependsOnKeys` verificado
contra el `imports` real de su propio `*.module.ts`, no adivinado. **Por
primera vez desde que el App Registry se construyó (sesión 22),
deshabilitar una app tiene un efecto real**: `AppEnablementGuard`
(`apps/api/src/core/app-registry/presentation/app-enablement.guard.ts`,
nuevo) se aplica a nivel de clase (`@RequireApp(key)`, leído vía
`Reflector.getAllAndOverride` sobre handler y clase, a diferencia de
`RequirePermission` que solo lee a nivel de método) sobre los 32
controladores de los 15 módulos de negocio, justo después de
`TenantContextGuard` — rechazando con `403 APP_NOT_ENABLED_FOR_TENANT`
real cuando la app no está `ENABLED` para el tenant. La única excepción
deliberada es el controlador público de Commerce
(`StorefrontPublicController`), que nunca corre `TenantContextGuard` en
absoluto (resuelve su propio contexto desde el `storefrontCode` público),
así que la precondición del guard no le aplica de la misma forma — queda
fuera de alcance, documentado explícitamente, no una omisión. **Un tenant
nuevo habilita automáticamente el catálogo completo al aprovisionarse**
(`EnableAllCatalogAppsUseCase`, nuevo, llamado desde
`TenantsController.provision()` justo después de `seedOwnerRole`, mismo
patrón "best-effort no atómico" que cada paso posterior al provisioning
ya usa) — sin esto, activar el enforcement real habría dejado a *todo*
tenant nuevo con *cero* módulos de negocio funcionando, ya que
`tenant_apps` empieza vacío para cualquiera; auto-habilitar todo preserva
exactamente el comportamiento previo de la plataforma (todos los módulos
ya funcionaban para todos los tenants) mientras hace que el mecanismo de
habilitar/deshabilitar sea genuinamente real desde este punto. **Un
seeder de backfill nuevo (`TenantAppEnablementSyncSeeder`,
`apps/api/src/core/tenants/application/`) corre en cada arranque del
API**, mismo patrón "esperar explícitamente al otro seeder, no confiar en
el orden de `onModuleInit` del mismo módulo" que
`OwnerRolePermissionSyncSeeder` ya estableció para el catálogo de
permisos (bug real de la sesión 28) — habilita retroactivamente cada app
del catálogo que un tenant `ACTIVE` ya existente todavía no tuviera,
verificado contra Postgres real backfilleando exactamente las apps
faltantes de un tenant parcialmente habilitado, sin re-tocar lo que ya
tenía. **Bug real de diseño encontrado y corregido durante la propia
escritura de tests, antes de cualquier commit**: la primera versión de
`EnableAllCatalogAppsUseCase` reportaba como "recién habilitada"
*cualquier* app que pasara por `EnableAppUseCase` sin lanzar excepción —
pero como `EnableAppUseCase` es en sí mismo idempotente (no-op exitoso
para una app ya `ENABLED`), esto hacía que un segundo backfill sobre un
tenant ya completamente habilitado reportara *todas* las apps como
"recién habilitadas", en vez de ninguna — corregido consultando el estado
previo de cada `TenantApp` antes de intentar habilitarla, devolviendo
solo las genuinamente nuevas. **Bug real encontrado y corregido durante
la propia escritura del E2E**: la pantalla de Ventas
(`SalesWorkspace`) muestra un aviso a nivel de página completa
("Todavía no hay clientes en esta empresa...") *antes* de montar
siquiera la pestaña de Cotizaciones cuando la empresa no tiene clientes
reales — así que el primer intento del E2E, sin haber creado un cliente
real de antemano, nunca disparaba la petición real a `/sales/quotes` que
el test necesitaba observar para confirmar el `403` real; corregido
agregando la creación de un cliente real antes de ese paso, no un ajuste
al código de producción (el comportamiento de la UI ya era correcto).
`AppRegistryModule` se convirtió en un **módulo hoja deliberado, sin
ninguna dependencia hacia ningún otro módulo del Core** — antes de esta
fase importaba `AuthModule`/`TenantsModule`/`AccessControlModule`/
`AuditModule` únicamente para `AppsController`; como ahora los 15 módulos
de negocio necesitan importar `AppRegistryModule` (para el guard), y
`AppRegistryModule` ya necesitaba `TenantsModule` (para
`TenantContextGuard`), mantener ambas direcciones habría creado un ciclo
real de módulos en cuanto `TenantsModule` también necesitara
`AppRegistryModule` (para auto-habilitar el catálogo al aprovisionar) —
resuelto con el mismo patrón ya usado repetidamente en este código base
(`RolesController`, `AuditEntriesController`, `NotificationsController`,
`MembershipsController`): `AppsController` se movió físicamente a
`tenants/presentation/apps.controller.ts`. El exit criteria implícito de
`docs/PLUGINS.md` §15 se cumple de forma literal y verificada, no
aproximada: deshabilitar "Ventas" mientras "Pagos"/"Punto de
venta"/"Comercio" siguen habilitados y dependen de ella es rechazado
real (`409`); deshabilitar los tres primero y luego "Ventas" tiene éxito
real; la propia pantalla de Ventas falla entonces con un `403` real
(`AppEnablementGuard`, no solo la pantalla "Apps" mostrándola
deshabilitada); re-habilitarla restaura la pantalla de inmediato.
Alcance deliberadamente diferido, documentado en `docs/DECISIONS.md`
ADR-015 (nuevo), no fabricado: un "Plugin SDK" separado (`@erp/api-client`,
ya generado desde OpenAPI real desde la sesión 21, cumple ese rol para
consumidores internos — "Plugin" en V1 es sinónimo de "módulo oficial
empaquetado", `docs/PLUGINS.md` §1, no un paquete de terceros), rangos
SemVer/certificación de compatibilidad (cada app del catálogo tiene una
sola versión, `"1.0.0"`, sin ruta de upgrade que reconciliar todavía),
un "marketplace interno" visualmente distinto (la pantalla "Apps" ya
existente, ahora con las 15 apps reales, ya es exactamente lo que
`docs/PLUGINS.md` §13 describe), registries de contribución de
frontend/backend declarativos (`registerRoute`/`registerMenuItem`/etc. —
el workspace sigue usando botones estáticos; ocultar UI nunca sustituye
la autorización real del backend, `docs/PLUGINS.md` §9, y el backend ya
la implementa), gatear el storefront público de Commerce sobre la
habilitación de "commerce", y cualquier modelo de confianza real para
plugins de terceros (`docs/PLUGINS.md` §16 ya es el spike que el roadmap
pedía — una lista documentada de prerequisitos concretos que este
código base todavía no cumple, sin código nuevo). 4 permisos nuevos NO
fueron necesarios (`apps.read`/`apps.manage` ya existían desde ADR-005).
Sin migración de base de datos — reutiliza las tres tablas ya existentes
de `app_definitions`/`tenant_apps`/`app_configurations`. Tests: 19 tests
unitarios nuevos en `apps/api` (4 de `EnableAllCatalogAppsUseCase`, 5 de
`IsAppEnabledForTenantUseCase`, 5 de `AppEnablementGuard`, 3 de
`TenantAppEnablementSyncSeeder`, 2 de `app-catalog.spec.ts` extendido
verificando el catálogo real de 15 apps) — 1055 tests unitarios totales
en `apps/api` (antes 1036). 1 escenario de integración nuevo contra
Postgres real (`prisma-repositories.integration-spec.ts`): el catálogo
real completo sembrado y validado, habilitación completa de un tenant
nuevo en una sola pasada, backfill real de un tenant parcialmente
habilitado (confirmando que solo las apps faltantes se reportan como
nuevas), y aislamiento cross-tenant al deshabilitar — 48/48 en total
(antes 47). **E2E real reescrito por completo**
(`apps/e2e/tests/app-registry.spec.ts`, Chromium vía Testcontainers,
reemplazando la versión de sesión 22 que usaba dos apps fixture
insertadas por SQL directo — ya no aplicable, dado que el catálogo real
ahora existe): ciclo de vida completo por navegador real — un cliente
real creado, las 15 apps reales confirmadas habilitadas tras el
aprovisionamiento, un intento real de deshabilitar "Ventas" con
dependents activos rechazado, los tres dependents reales deshabilitados
en el orden correcto, "Ventas" deshabilitada con éxito real, la propia
pantalla de Ventas fallando con un `403` real, un intento real de
habilitar un dependiente antes que su propia dependencia rechazado,
"Ventas" re-habilitada con éxito real, y la pantalla de Ventas
restaurada — 18/18 Playwright en total (mismo conteo de archivos que
antes, un solo archivo reescrito, no uno nuevo).

PHASE 10 — Manufacturing, **iniciada y formalmente cerrada el 2026-09-03
(sesión 34, en un solo bloque de trabajo)**, a pedido explícito del
usuario ("Continua con la fase 10 en una sola sesión"), inmediatamente
después de cerrar la Fase 9: `BillOfMaterial`/`BillOfMaterialComponent`
(receta versionada e inmutable — `version` auto-asignado por
`CreateBillOfMaterialUseCase` como `existingCount(product) + 1`, nunca
provisto por el llamador; revisar una receta significa crear una fila
nueva, nunca editar componentes ya existentes), `ProductionOrder`
(`DRAFT → CONFIRMED → CLOSED`, `CANCELLED` alcanzable solo desde
`DRAFT`/`CONFIRMED` y nunca si ya existe actividad real —
`ProductionOrderHasActivityError`, mismo patrón que
`PurchaseOrderHasReceiptsError` de Purchasing), `ProductionOrderMaterial`
(requerimiento snapshoteado una sola vez desde el componente de la BOM,
escalado por `quantityPlanned` — nunca re-derivado de la BOM después, así
que una revisión posterior de la receta nunca altera en silencio una orden
ya creada), `ProductionOrderMaterialMovement` (ledger tipado `ISSUE`/
`RETURN`, siempre positivo — la dirección la lleva `type`, no el signo,
mismo patrón de ledger tipado que `InventoryMovement` pero sin su
convención de cantidad con signo), `ProductionOrderOperation` (pasos
simples del proceso, siempre agregados al final, sin work centers ni
ruteo), y `ProductionOrderFinishedGoodsReceipt` (recepción genuinamente
parcial de producto terminado) — `apps/api/src/modules/manufacturing`.
**Emisión, devolución y recepción de producto terminado genuinamente
parciales a través de múltiples llamadas**, validadas contra una suma
corriente sobre el propio ledger de este módulo (nunca un contador
guardado que pudiera desincronizarse), mismo patrón ya establecido por
`CreatePurchaseReceiptUseCase`/`CreatePurchaseReturnUseCase` de
Purchasing — necesario porque `ReleaseReservationUseCase` de Inventory
solo soporta liberar la cantidad *completa* de una reserva, incompatible
con consumo de material genuinamente parcial; por eso este módulo nunca
usa el mecanismo de reservas de Inventory en absoluto. Cada emisión/
devolución/recepción real postea de inmediato el movimiento real
correspondiente en el ledger real de Inventory
(`RecordIssueUseCase`/`RecordReturnUseCase`/`RecordReceiptUseCase`,
`referenceType: "PRODUCTION_ORDER"`, valor nuevo agregado a
`InventoryMovementReferenceType`) — este módulo nunca muta un saldo
directamente. **`GetProductionOrderUseCase`** calcula `quantityCompleted`
sumando en cada llamada las filas reales de
`ProductionOrderFinishedGoodsReceipt` — nunca una columna guardada, la
misma filosofía "leer el ledger, nunca un contador que pueda desviarse"
ya establecida por `InventoryBalance`/el Balance de Comprobación de
Accounting/el resumen de pipeline de CRM. `ResolveManufacturingProductTargetUseCase`
exige `Product.trackInventory === true` tanto para el producto terminado
como para cada componente — reutilizando deliberadamente el único flag de
`Product` genuinamente exigido en otro lugar del código base, en vez de
inventar un flag `manufacturable` nuevo: `sellable`/`purchasable` ya
existen en `Product` como metadata de MASTER_SPEC §19 pero, verificado por
inspección antes de tomar esta decisión, ningún módulo los exige jamás —
un tercer flag igualmente muerto habría sido exactamente el tipo de
metadata sin cumplir que este código base ha evitado en todos lados (ver
`docs/DECISIONS.md` ADR-014). **Noveno módulo de negocio del código base**,
con tres dependencias directas y sin ciclos (Catalog, Warehouses,
Inventory), y el segundo (tras Accounting) sin ninguna dependencia hacia,
ni desde, ningún otro módulo de negocio salvo esas tres. El exit criteria
de `docs/ROADMAP.md` §14 ("ninguna producción altera stock sin ledger") se
cumple literalmente, no de forma aproximada — verificado con 7 solicitudes
de emisión de material genuinamente concurrentes contra 10 unidades reales
de existencia, confirmando exactamente 5 éxitos y 2 rechazos con
`InsufficientInventoryError` real de Inventory, saldo final nunca
negativo — la salvaguarda real bajo concurrencia genuina es la propia
invariante de saldo de Inventory (`onHand >= reserved`, bajo
`SELECT ... FOR UPDATE`), no la suma corriente de este módulo, que por
diseño tiene una ventana de carrera bajo concurrencia genuina y depende de
Inventory como la red de seguridad real. **Bug real de UI encontrado y
corregido durante la propia escritura de tests de `apps/erp-web`, antes de
cualquier commit** (detallado en la entrada de "Completed" más abajo):
`ProductSelectFields` marcaba su `<select>` como `required` de forma
incondicional, rompiendo el envío del formulario externo cuando el
mini-formulario de "agregar componente" limpia sus propios campos a `""`
tras cada clic — corregido con un prop `required` opcional. 4 permisos
nuevos (`manufacturing.boms.read`/`.manage`,
`manufacturing.orders.read`/`.manage`), auditoría real en las 8 acciones
de escritura de los dos controladores
(`manufacturing.bill_of_material.created`/`.status_changed`,
`manufacturing.order.created`/`.confirmed`/`.closed`/`.cancelled`,
`manufacturing.material.issued`/`.returned`,
`manufacturing.finished_goods.received`,
`manufacturing.operation.added`/`.completed`). Tabla nueva (migración
`20260903032203_manufacturing`, **generada y aplicada directamente contra
Postgres real** vía el mismo workaround no-interactivo ya establecido,
combinando siete tablas nuevas, dos enums nuevos, y la extensión de
`InventoryMovementReferenceType` con `PRODUCTION_ORDER`, aplicada
limpiamente al primer intento). Contrato HTTP nuevo, dos controladores
(`/api/v1/manufacturing/bills-of-material`, `.../orders`, con 20 rutas en
total incluyendo materiales/operaciones/recepciones anidadas bajo una
orden). **`@erp/api-client`**: ~18 tipos y 19 métodos nuevos generados
desde el spec OpenAPI real, sin bugs de fidelidad de decoradores — todos
los DTOs llevaron `type:`/`nullable:` explícitos desde el inicio. **UI**
(`apps/erp-web/src/features/manufacturing/`, ruta nueva `/manufacturing`,
botón "Manufactura" en el workspace): pestañas Listas de materiales/
Órdenes de producción, ambas cargadas una sola vez a nivel de página junto
con productos/bodegas — aplicando proactivamente la misma lección que la
propia UI de POS tuvo que corregir reactivamente en la sesión 30. El
detalle de una orden confirmada incluye secciones de Materiales
(emitir/devolver), Operaciones (agregar/completar), y Producto terminado
(registrar recepción parcial), todas dentro del mismo modal. **Dos bugs
reales de colisión de selector encontrados y corregidos durante la propia
escritura del E2E, mismo patrón ya documentado en sesiones anteriores de
este proyecto** (`Tabs` nunca desmonta paneles inactivos, y
`page.getByText()`, a diferencia de `page.getByRole()`, no respeta el
atributo `hidden` al resolver coincidencias): el estado vacío "Todavía no
hay listas de materiales" coincidía como substring con el aviso "Todavía
no hay listas de materiales activas..." de la pestaña de Órdenes (montada
en paralelo) — corregido con `{ exact: true }`; y una búsqueda de texto
por el nombre del componente dentro del modal de creación de BOM
coincidía con las tres apariciones de ese texto (las dos opciones `
<option>` de los selectores de producto terminado/componente, más el
ítem de la lista de borrador) — corregido escopando la aserción a
`getByRole("listitem").filter({ hasText })` en vez de una búsqueda de
texto libre en todo el diálogo. Tests: 64 tests unitarios nuevos en
`apps/api` (33 de dominio, 30 de aplicación incluyendo el escenario de
emisión/devolución/recepción genuinamente parciales y el rechazo de
cancelación con actividad real, 1 de wiring del módulo) — 1036 tests
unitarios totales en `apps/api` (antes 968). 3 escenarios de integración
nuevos contra Postgres reales
(`manufacturing.integration-spec.ts`): ciclo de vida completo BOM→
ProductionOrder→Confirm→emisión/devolución parciales→recepción de
producto terminado parcial→Close con precisión decimal real verificada
(`2.5 × 4 = 10.0000`), rechazo real de un componente de otra compañía, y
el escenario de concurrencia genuina de 7 emisiones simultáneas — 47/47
en total (antes 44). 23/23 tests en `@erp/api-client` (antes 22). 55/55
tests en `apps/erp-web` (antes 53). **E2E real nuevo**
(`apps/e2e/tests/manufacturing.spec.ts`, Chromium vía Testcontainers):
ciclo de vida completo por navegador real — dos productos reales
(terminado y componente) y una bodega reales, recepción real de stock del
componente, una BOM real con un componente real, una orden de producción
real → confirmación real → emisión parcial real (8 de 20 requeridos) →
devolución parcial real (2 de vuelta) → saldo del componente real
verificado (44.0000 = 50 recibidas − 8 emitidas + 2 devueltas) →
recepción parcial real de producto terminado (3 de 10 planificadas) →
cierre real de la orden con completitud parcial (comportamiento
intencional, no bloqueado) → saldo del producto terminado real verificado
(3.0000) — 18/18 Playwright en total (antes 17).

PHASE 9 — CRM, **iniciada y formalmente cerrada el 2026-09-02 (sesión 33,
en un solo bloque de trabajo)**, a pedido explícito del usuario ("Continua
con la fase 9"), inmediatamente después de cerrar la Fase 8: Lead
(`NEW → CONTACTED → QUALIFIED`, libremente revisitable; `CONVERTED`/`LOST`
terminales — `Lead.isTerminal`), Pipeline/PipelineStage (pipelines
configurables por compañía, con `isWon`/`isLost` por etapa — nunca ambos a
la vez, validado en el dominio), Opportunity (`OPEN → WON | LOST`,
terminal — `UpdateOpportunityUseCase`/`MoveOpportunityStageUseCase`
rechazan cualquier mutación posterior), y Activity (exactamente una
relación entre prospecto/oportunidad/cliente real, validada en dos
niveles — la aplicación primero, con un error tipado y mapeable a HTTP;
el dominio como respaldo) — `apps/api/src/modules/crm`. **Segundo módulo
de negocio del código base (tras Sales) con una dependencia real y directa
hacia Customers**: `ConvertLeadUseCase` llama a
`FindCustomerByEmailUseCase`/`CreateCustomerUseCase` del contrato público
de Customers — resuelve un cliente ya existente por correo (mismo patrón
de resolución de invitado ya usado por el checkout de Commerce) o crea uno
nuevo, nunca una copia paralela de los datos del cliente. `CrmModule`
importa `CustomersModule` directamente, una dependencia dirigida y libre
de ciclos. **Bug real de dominio encontrado y corregido durante la propia
escritura de tests, antes del primer commit**: `Opportunity.update()`
mutaba `this.props.name` antes de validar `amount`, así que un
`assertValidNonNegativeDecimal` fallido dejaba un cambio de nombre
parcialmente aplicado — corregido validando ambos campos antes de mutar
cualquiera. El exit criteria de `docs/ROADMAP.md` §13 ("pipeline
configurable, permisos de equipo y privacidad verificados") se satisface
con RBAC estándar por compañía (8 permisos nuevos:
`crm.leads.read/.manage`, `crm.pipelines.read/.manage`,
`crm.opportunities.read/.manage`, `crm.activities.read/.manage`) más un
campo `ownerId` en Lead/Opportunity/Activity (por defecto el usuario que
crea, reasignable) — una decisión deliberada de no inventar una entidad
"Team" nueva que no existe en ningún otro módulo de Foundation, y
`Lead.consentMarketing`/`consentedAt` reales para el consentimiento.
**Ningún handler consume eventos de Sales** — la decisión central de la
fase, documentada en `docs/DECISIONS.md` ADR-013 (nuevo): ningún módulo de
este código base, salvo Tenants, ha publicado jamás un evento real de
dominio por el outbox, y construir un consumidor especulativo contra un
schema de evento inventado habría sido la misma maquinaria prematura que
MASTER_SPEC §59/§93 advierte evitar; `CreateActivityUseCase` queda
exportado desde `CrmModule` por adelantado, el mismo precedente ya usado
por `RecordReceiptUseCase`/`ConfirmSalesOrderUseCase` antes de tener su
primer caller real. Tabla nueva (migración `20260902195127_crm`,
**generada y aplicada directamente contra Postgres real** vía el mismo
workaround no-interactivo ya establecido, aplicada limpiamente al primer
intento). Contrato HTTP nuevo, cuatro controladores
(`/api/v1/crm/leads`, `.../pipelines`, `.../opportunities`,
`.../activities`). Alcance deliberadamente fuera de Fase 9, sin
aprobación explícita: consumidor real de eventos de Sales (ADR-013, la
decisión central de esta fase), entidad "Team" dedicada, forecasting/
pipeline ponderado por probabilidad, scoring/deduplicación de leads, e
importación masiva — ver "Known limitations" en `docs/SECURITY.md` "CRM".
Próxima fase no bloqueada: PHASE 10 — Manufactura (`docs/ROADMAP.md`
§14), salvo indicación distinta del usuario.

PHASE 8 — Accounting, **iniciada y formalmente cerrada el 2026-09-02
(sesión 32, en un solo bloque de trabajo)**, a pedido explícito del
usuario ("Continua con la fase 8 y terminala de una vez"): Account
(Chart of Accounts, `type` derivando `normalBalance` en el dominio, nunca
una columna almacenada), FiscalPeriod (`OPEN → CLOSED`, terminal —
reabrir queda deliberadamente fuera de alcance, ver docstring de la
propia entidad), JournalEntry/JournalEntryLine (append-only,
`CreateJournalEntryUseCase` valida la invariante de partida doble en dos
niveles — cada línea exactamente un lado positivo, en el dominio; la suma
de débitos igual a la suma de créditos de todo el asiento, en la
aplicación), `ReverseJournalEntryUseCase` (crea un asiento nuevo
balanceado con cada línea invertida, nunca edita el original), y los
reportes `GetTrialBalanceUseCase`/`GetAccountLedgerUseCase` (recalculados
en cada llamada directamente desde el ledger real, nunca un saldo
almacenado) — `apps/api/src/modules/accounting`. **El único módulo de
negocio del código base sin ninguna dependencia cruzada**: no importa
Catalog/Sales/Payments/Purchasing/Inventory/Commerce/POS, y ninguno de
esos módulos lo llama a él tampoco — una decisión de alcance explícita y
deliberada (ver `docs/DECISIONS.md` ADR-012), no una omisión. El exit
criteria de `docs/ROADMAP.md` §12 ("Todo asiento balancea y los períodos
cerrados están protegidos") se verificó contra Postgres real: un asiento
desbalanceado rechazado, una cuenta inactiva rechazada, un intento de
contabilizar contra un período ya cerrado rechazado con
`NoOpenFiscalPeriodForDateError` real tras cerrarlo en el mismo test. El
otro exit criteria ("Reprocesar source events no duplica postings") se
satisface mediante el mismo mecanismo de idempotencia por
`(sourceType, sourceId)` ya usado por Payments/POS/Commerce —
`@@unique([tenantId, companyId, sourceType, sourceId])` real, con las
semánticas de Postgres de que cada `NULL` es distinto para unicidad,
permitiendo asientos manuales ilimitados sin `sourceType`/`sourceId` —
verificado con 5 solicitudes de contabilización genuinamente concurrentes
compartiendo una clave de origen simulada, convergiendo las 5 en el mismo
asiento y sobreviviendo exactamente una fila. Ningún módulo real llama
todavía a este mecanismo (ver ADR-012 para el razonamiento completo de
por qué no se automatizó ninguna contabilización desde Sales/Payments/
Purchasing/Inventory en esta fase) — se verificó con una clave de origen
simulada, el mismo precedente ya sentado por el inbox de ADR-008 antes de
tener su primer consumidor real. 7 permisos nuevos
(`accounting.accounts.read/.manage`, `accounting.periods.read/.manage`,
`accounting.entries.read/.manage`, `accounting.reports.read`). Alcance
deliberadamente fuera de Fase 8, sin aprobación explícita: contabilización
automática desde cualquier otro módulo de negocio (ADR-012, la decisión
central de esta fase), Balance General/Estado de Resultados formales más
allá del Balance de Comprobación, reapertura de períodos, workflow de
aprobación tipo maker-checker para asientos manuales, contabilidad
multi-moneda, y una funcionalidad dedicada de reconciliación bancaria —
ver "Known limitations" en `docs/SECURITY.md` "Accounting".

PHASE 7 — Commerce (7A, Commerce Engine), **iniciada y formalmente
cerrada el 2026-09-02 (sesión 31, en un solo bloque de trabajo)**:
Storefront (multi-tienda por `docs/ROADMAP.md` §11, `code` público
globalmente único — mismo precedente ya sentado por `Tenant.slug` —
`defaultWarehouseId` opcional), StorefrontProduct (join de publicación de
catálogo, idempotente al publicar), Cart/CartLine (anónimos por diseño,
sin sesión ni autenticación — `Cart.id` es en sí mismo el token público
de carrito), y CommerceOrder (creado únicamente después de que un
`SalesOrder` real, canal `ECOMMERCE`, se confirma vía el contrato público
de Sales — `CheckoutUseCase` orquesta la resolución/creación del cliente
invitado, la orden, las líneas, la confirmación y, opcionalmente, la
captura de pago, enteramente a través de los contratos públicos de
Catalog/Customers/Sales/Payments, nunca una ruta de escritura paralela) —
`apps/api/src/modules/commerce`, ver "Hecho — sesión 31" en
`docs/WORK_QUEUE.md` para el detalle completo. **Primera API pública y
sin autenticación de todo el código base**
(`/api/v1/storefront/:storefrontCode/*`, `PublicStorefrontContextGuard`
resuelve tenant/company/storefront únicamente desde el handle público,
nunca desde headers de sesión), con rate limiting propio
(`COMMERCE_RATE_LIMIT_MAX`/`_WINDOW_SECONDS`, Redis, ventana separada de
la de login). El exit criteria de `docs/ROADMAP.md` §11 ("Checkout
repetido/webhook duplicado conserva exactamente un efecto") se verificó
con 5 solicitudes de checkout genuinamente concurrentes contra Postgres
real compartiendo el mismo `cartId`: las 5 resuelven con éxito, las 5
convergen en el mismo `CommerceOrder.id`, y existe exactamente una fila al
final — idempotencia basada en el propio `Cart.id` (nunca una clave
generada por el llamador, a diferencia de POS), ya que un carrito solo
puede convertirse una vez — ver `docs/DECISIONS.md` ADR-011 para el
razonamiento completo y el mismo límite bajo carrera genuinamente
simultánea ya documentado y aceptado para POS (ADR-010), heredado aquí sin
volver a discutirlo. El otro exit criteria ("Storefront no contiene
reglas autoritativas de Commerce") se satisface por diseño: el storefront
Next.js (Fase 7B, delegado a un subagente en background con este mismo
contrato público ya estable) solo puede llamar la API pública, sin lógica
de negocio propia. Modelo de pago/cumplimiento deliberadamente honesto
(ADR-011): sin gateway credenciado (heredado de ADR-009), un checkout sin
`paymentReference` deja el pedido `CONFIRMED` y sin pagar
(`CommerceOrder.paymentId: null`, un estado normal y esperado, no un
error) para que el personal capture el pago después desde la propia
pantalla de Pagos ya existente; nunca se despacha automáticamente — el
despacho sigue siendo una acción posterior y manual vía Sales. Sexto
módulo de negocio del código base, con seis dependencias directas y sin
ciclos (Catalog, Warehouses, Customers, Sales, Payments, Users — esta
última para el actor no interactivo "Storefront System" que satisface la
columna `NOT NULL` `InventoryMovement.createdByUserId` en un checkout
anónimo) — la mayor superficie de cualquier módulo hasta ahora, y el
segundo (tras POS) cuyo flujo de escritura principal orquesta otros
módulos de negocio en vez de poseer su propio dominio transaccional. De
paso, `Customers` ganó `FindCustomerByEmailUseCase` (resolución de
cliente invitado repetido por email, con `email` ahora normalizado a
minúsculas en escritura — un bug real de datos corregido durante esta
sesión, ya que antes se guardaba tal cual lo tipeara el llamador,
rompiendo silenciosamente el emparejamiento case-insensitive) y
`ListProductVariantsUseCase`/`getProduct`/`getProductVariant` se sumaron
al contexto de pruebas compartido de Sales (`buildSalesTestContext`).
**Dos bugs reales encontrados y corregidos durante la propia verificación
E2E, no simulados**: (1) los DTOs `CreateCartDto`/`CheckoutRequestDto`
del controlador público se declararon sin ningún decorador de
`class-validator`, lo que bajo el `ValidationPipe` global
(`forbidNonWhitelisted: true`) los NestJS/`class-validator` rechazaba
como "property ... should not exist" incluso para un cuerpo realmente
válido — corregido agregando `@IsOptional()`/`@IsString()`/`@IsNotEmpty()`
explícitos; (2) `StorefrontsController.publish()`/`.unpublish()`
devolvían `productCode`/`productName` como cadenas vacías en vez de
resolver el producto real, lo que la UI de administración mostraba
literalmente como `"()"` — corregido inyectando `GetProductUseCase` en el
controlador. Alcance deliberadamente fuera de Fase 7A, sin aprobación
explícita: motor de promociones/descuentos/cupones (no existe en ningún
módulo de este código base todavía), motor de impuestos real en el lado
público, ruteo real por dominio/hostname (`Storefront.domain` es
metadata puramente informativa), autenticación/cuenta de cliente con
historial de pedidos, búsqueda más allá del listado plano de productos
publicados (MASTER_SPEC §85), y job de abandono de carrito — ver "Known
limitations" en `docs/SECURITY.md` "Commerce". La Fase 7B (Storefront
Next.js, `apps/storefront`) se completó en la misma sesión: construida por
un subagente en background contra el contrato público ya estable,
revisada de forma independiente ("Trust but verify" — lectura directa de
la lógica de negocio clave, grep de términos prohibidos, re-ejecución
independiente de las 5 validaciones) e integrada sin cambios de código.
Ambos bloques (7A y 7B) quedaron commiteados, mergeados a `develop` y
empujados en un solo commit (`c671412`).

PHASE 6 — POS, **iniciada y formalmente cerrada el 2026-09-01 (sesión 30,
en un solo bloque de trabajo)**: PosRegister (una caja/terminal atada a
una `Warehouse`), PosShift (`OPEN → CLOSED`, a lo sumo un turno `OPEN` por
caja a la vez — invariante de aplicación, no un índice parcial),
PosCashMovement (ledger append-only de ingresos/egresos de efectivo),
PosSale (creado únicamente después de que un `SalesOrder` real, canal
`POS`, se confirma y despacha y su `Payment` real queda `CAPTURED` —
`RingUpSaleUseCase` orquesta la creación de la orden, la línea, la
confirmación, la captura del pago y el despacho enteramente a través de
los contratos públicos de Sales y Payments, nunca una ruta de escritura
paralela), y PosReturn (mismo patrón, con reembolso opcional siempre por
el monto completo del pago original) — `apps/api/src/modules/pos`, ver
"Hecho — sesión 30" en `docs/WORK_QUEUE.md` para el detalle completo. El
exit criteria de `docs/ROADMAP.md` §10 ("Cierres y cash movements son
auditables y Decimal-safe") se verificó con un turno real que combina
movimientos de caja, una venta en efectivo y una devolución con reembolso
completo, confirmando contra Postgres real que el efectivo esperado
calculado coincide exactamente con la aritmética hecha a mano, usando
únicamente BigInt (nunca floats de JavaScript). El otro exit criteria
("Reintentos de terminal no duplican ventas/pagos") se verificó con 5
solicitudes de `ringUpSale` genuinamente concurrentes contra Postgres real
compartiendo la misma `idempotencyKey`: las 5 resuelven con éxito, las 5
convergen en el mismo `PosSale.id`, y existe exactamente una fila al
final — pero esa garantía tiene un límite documentado explícitamente, no
oculto: bajo una carrera genuinamente simultánea (no una reintentona
secuencial tras perder la respuesta, que es el caso real que un terminal
POS produce en la práctica), cada llamador puede crear su propia
`SalesOrder`/`Payment` real antes de que cualquiera confirme el
`PosSale`, dejando órdenes reales huérfanas aunque el `PosSale` final siga
siendo único — ver "Known limitations" en `docs/SECURITY.md` "POS" y el
docstring de `RingUpSaleUseCase` para el razonamiento completo de por qué
esto se dejó fuera de alcance deliberadamente. Quinto módulo de negocio
del código base, con tres dependencias directas y sin ciclos a
Warehouses, Sales y Payments — el primero cuyo flujo de escritura
principal es en sí mismo una orquestación de otros dos módulos de negocio
en vez de poseer su propio dominio transaccional; `payments` ganó su
primer `@@unique([tenantId, id])` (primer consumidor de FK, mismo patrón
ya usado por `customers`/`taxes`/`suppliers` antes). Alcance
deliberadamente fuera de Fase 6, sin aprobación explícita: adapters de
hardware real (lector de código de barras, impresora térmica, gaveta,
pantalla de cliente — MASTER_SPEC §24 y la "Restricción" del propio
`docs/ROADMAP.md` §10 los difieren hasta que exista hardware real que
validar), operación offline (explícitamente excluida por la misma
"Restricción" hasta que exista un ADR sobre device identity, ledger
local, resolución de conflictos, correlativos, reservas y
reconciliación), reembolso parcial (heredado de ADR-009), y número de
venta/ticket legible — ver "Known limitations" en `docs/SECURITY.md`
"POS".

PHASE 5 — Purchasing, **iniciada y formalmente cerrada el 2026-09-01
(sesión 29, en un solo bloque de trabajo)**: PurchaseOrder/PurchaseOrderLine
(`DRAFT → CONFIRMED → CLOSED`, `CANCELLED` solo desde `DRAFT`/`CONFIRMED`
y nunca si ya existe un `PurchaseReceipt` real), PurchaseReceipt/
PurchaseReceiptLine (registro propio append-only, recepción genuinamente
parcial contra el mismo pedido a través de múltiples recepciones),
PurchaseReturn/PurchaseReturnLine (registro propio, nunca una mutación de
estado de la orden), y SupplierInvoice (documento independiente,
`RECORDED → CANCELLED`, deliberadamente sin conexión a ningún flujo de
pago real) — `apps/api/src/modules/purchasing`, ver "Hecho — sesión 29" en
`docs/WORK_QUEUE.md` para el detalle completo. El exit criteria de
`docs/ROADMAP.md` §9 ("Permisos de aprobación y segregation of duties
están probados") se implementó con un permiso genuinamente distinto
(`purchasing.orders.approve`, separado de `purchasing.orders.manage`) y se
verificó con dos memberships reales y dos `RoleAssignment` reales contra
Postgres real, no solo diseñado. El otro exit criteria ("Recepción
parcial, cancelación y devolución conservan trazabilidad") se verificó con
dos recepciones parciales reales que agotan exactamente lo pedido, un
intento de exceder por `0.0001` rechazado, y un intento de cancelar un
pedido con una recepción real ya existente rechazado — todo contra
Postgres real (`apps/api/test/integration/purchasing.integration-spec.ts`).
Cuarto módulo de negocio del código base con dependencias directas y sin
ciclos a Catalog, Warehouses, Suppliers e Inventory; segundo módulo (tras
Sales) en depender de Inventory como "port transaccional" real —
`RecordReceiptUseCase` ganó su primer caller real (`RecordIssueUseCase` ya
lo tenía, vía Sales), y `InventoryMovementReferenceType` ganó
`PURCHASE_ORDER`/`PURCHASE_RETURN`. Alcance deliberadamente fuera de Fase
5, sin aprobación explícita: Purchase Requests (condicionado por el propio
`docs/ROADMAP.md` §9 a "cuando el workflow lo justifique", nunca cumplido
— la segregación de funciones ya la cubre la aprobación de la propia
orden), número de orden legible, impuestos en líneas de orden, validación
cruzada entre el monto de una factura de proveedor y las líneas/recepciones
de su orden, y cualquier conexión real con Payments — ver "Known
limitations" en `docs/SECURITY.md` "Purchasing".

PHASE 4 — Sales y Payments, **iniciada y formalmente cerrada el
2026-08-31 (sesión 27, en un solo bloque de trabajo)**: Quote/QuoteLine
(`DRAFT → CONVERTED | CANCELLED`, nunca reserva inventario),
SalesOrder/SalesOrderLine (`DRAFT → CONFIRMED → FULFILLED`, `CANCELLED`
solo desde `DRAFT`/`CONFIRMED`), SalesReturn/SalesReturnLine (registro
propio append-only, nunca una mutación de estado de la orden), y Payment
(agregado independiente, `CASH`/`BANK_TRANSFER`, captura/reembolso
idempotentes) — `apps/api/src/modules/sales`,
`apps/api/src/modules/payments`, ver "Hecho — sesión 27" en
`docs/WORK_QUEUE.md` para el detalle completo. El patrón de transacción
compensatoria de `ConfirmSalesOrderUseCase` (libera toda reserva ya hecha
en el intento actual si una línea posterior falla por stock insuficiente)
y la idempotencia real de `CapturePaymentUseCase` (constraint
`@@unique([tenantId, companyId, idempotencyKey])`, no solo un chequeo de
aplicación) fueron verificados con escenarios genuinamente concurrentes
contra Postgres real (`apps/api/test/integration/sales.integration-spec.ts`,
`.../payments.integration-spec.ts`), cumpliendo los exit criteria de
`docs/ROADMAP.md` §8 directamente, no solo por inspección de código.
Tercera dependencia genuina entre módulos de negocio del código base
(Sales → Catalog + Warehouses + Taxes + Pricing + Customers + Inventory,
la más transversal hasta ahora) y primer módulo (Payments → Sales) que
depende de otro módulo de negocio, no solo del Core/Master Data. Alcance
deliberadamente fuera de Fase 4, sin aprobación explícita (ver ADR-009):
un motor de reglas fiscales real, resolución automática de lista de
precios, número de orden/cotización legible, confirm/fulfill parcial por
línea, Invoice/Shipment, adapters de pago con credenciales reales,
verificación de webhooks, reconciliación por timeout, reembolso parcial —
ver "Known limitations" en `docs/SECURITY.md` "Sales"/"Payments". Próxima
fase no bloqueada: PHASE 5 — Purchasing (`docs/ROADMAP.md` §9), salvo
indicación distinta del usuario.

PHASE 3 — Inventory, **iniciada y formalmente cerrada el 2026-08-31
(sesión 26, en un solo bloque de trabajo)**: Movement Ledger
(`InventoryMovement`, append-only, `quantity` decimal con signo),
`InventoryBalance` (proyección on-hand/reservado — `available` siempre
calculado, nunca persistido), `InventoryReservation`
(reservar/liberar existencias), `InventoryTransfer` (`IN_TRANSIT →
COMPLETED | CANCELLED`, transferencias entre bodegas) —
`apps/api/src/modules/inventory`, ver "Hecho — sesión 26" en
`docs/WORK_QUEUE.md` para el detalle completo. La invariante única
(`nextOnHand >= 0 AND nextReserved >= 0 AND nextOnHand >= nextReserved`)
bajo `SELECT ... FOR UPDATE` fue verificada con escritores concurrentes
reales contra Postgres real (`apps/api/test/integration/
inventory.integration-spec.ts`), cumpliendo el exit criteria de
`docs/ROADMAP.md` §7 directamente, no solo por inspección de código.
Alcance deliberadamente fuera de Fase 3, sin aprobación explícita:
ubicaciones/bins de bodega, lote/serie/vencimiento — ver "Known
limitations" en `docs/SECURITY.md` "Inventory" (su hueco de conexión con
Sales/Purchasing/POS ya cerró parcialmente en la sesión 27: Sales es
ahora un llamador real).

PHASE 2 — Master Data, **iniciada el 2026-08-31 (sesión 23) y formalmente
cerrada el 2026-08-31 (sesión 25)**, los tres bloques descritos en
`docs/ARCHITECTURE.md` §5.2 completos: Catálogo (Units of Measure,
Categories, Brands, Products, Product Variants — `apps/api/src/modules/
catalog`, sesión 23), Customers/Suppliers (`apps/api/src/modules/
customers`, `apps/api/src/modules/suppliers`, sesión 24) y Taxes/
Warehouses/Pricing (`apps/api/src/modules/taxes`, `.../warehouses`,
`.../pricing`, sesión 25 — ver "Hecho — sesión 25" en
`docs/WORK_QUEUE.md`). Alcance deliberadamente diferido a fases futuras,
no simulado: motor de reglas fiscales real, resolución de qué lista de
precios aplica a una venta, precios de lista por variante, asociación
Warehouse↔Branch/Location, import/export masivo — ver "Known limitations"
en `docs/SECURITY.md` "Catalog", "Customers / Suppliers" y
"Taxes / Warehouses / Pricing".

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
- **Catálogo — Fase 2, primer módulo de negocio** (`apps/api/src/modules/
  catalog`, Claude, sesión 23): `UnitOfMeasure`, `Category` (árbol
  auto-referenciado vía `parentId`), `Brand`, `Product` (con las
  invariantes precio-vs-variantes de MASTER_SPEC §19), `ProductVariant`
  (SKU único a nivel tenant, atributos JSON dinámicos). Primer módulo bajo
  `apps/api/src/modules/` (sibling de `core/`, nunca dentro de él) y
  primeros campos monetarios reales del código base (`basePrice`/
  `baseCost`/`price`/`cost`, strings decimales canónicas, nunca `float`).
  A diferencia de Foundation, `companyId` es obligatorio, no opcional.
  8 permisos nuevos (`catalog.*.read`/`.manage`), auditoría real en las 5
  entidades. Tablas nuevas (migración `20260831040628_catalog_master_data`,
  **generada y aplicada directamente contra Postgres real**), incluyendo
  un índice único real sobre una columna `jsonb`
  (`ProductVariant.attributes`). **Dos bugs reales encontrados y
  corregidos mediante smoke test manual contra Postgres real, no
  detectados por tests unitarios**: recorte de ceros decimales al leer de
  Postgres (`.toString()` de Decimal.js → corregido a `.toFixed(4)`), y
  pérdida de datos en actualizaciones parciales (un campo omitido se
  borraba a `null` en vez de preservarse — corregido con un contrato de
  tres estados omitir/`""`/valor). UI nueva (`apps/erp-web/src/features/
  catalog`, ruta `/catalog`): pestañas Unidades/Categorías/Marcas/
  Productos, con un componente genérico `SimpleMasterDataPanel<T>`
  reutilizado por los tres primeros. **Dos bugs reales de re-render
  encontrados durante la verificación E2E**: ids/names de formulario
  colisionando entre pestañas simultáneamente montadas (corregido con un
  prop `fieldPrefix`), y un ciclo de refetch/pérdida de estado optimista
  causado por estado compartido entre el padre `CatalogPage` y sus tres
  paneles hijos (corregido memoizando `load`/`create`/`setStatus` con
  `useCallback` sin depender del campo que cambiaba en cada tecleo). Un
  tercer bug encontrado por el E2E: `ProductsPanel` cargaba sus selects de
  unidad/categoría/marca solo al montar, antes de que el usuario pudiera
  haber creado ninguno — corregido con el mismo patrón "recargar al
  activarse la pestaña" ya usado por `AuditPanel` de platform-admin
  (sesión 18). **Verificado con un E2E de Playwright real** (Chromium):
  crea unidad/categoría/marca reales, activa/desactiva estado, crea un
  producto sin variantes con precio base y uno con variantes, agrega una
  variante real con atributos JSON — todo contra el backend real. Detalle
  completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 23").
- **Customers, Suppliers — Fase 2, segundo bloque** (`apps/api/src/modules/
  customers`, `apps/api/src/modules/suppliers`, Claude, sesión 24):
  entidades separadas y deliberadas (no una abstracción "Party"
  compartida — ver el docstring sobre `model Customer` en `schema.prisma`
  y `docs/SECURITY.md` "Customers / Suppliers"), cada una con code, name,
  legalName, taxId, email, phone, addressLine, city, country, status.
  Contrato de tres estados (omitir/`""`/valor) para actualizaciones
  parciales aplicado desde el inicio — la lección del bug real de Catálogo
  (sesión 23) esta vez se aplicó proactivamente. Unicidad real de `taxId`
  por compañía a nivel de base de datos, permitiendo múltiples registros
  sin `taxId` (Postgres permite múltiples `NULL` en un índice único) y
  permitiendo que un cliente y un proveedor compartan el mismo `taxId`
  (tablas separadas). 4 permisos nuevos (`customers.*`/`suppliers.*`),
  auditoría real. Tabla nueva (migración
  `20260831054432_customers_suppliers_master_data`, **generada y aplicada
  directamente contra Postgres real**, limpiamente al primer intento).
  Contrato HTTP nuevo (`GET/POST /api/v1/customers`, `PUT /:id`,
  `PUT /:id/status`, mismo patrón para `/api/v1/suppliers`). UI nueva
  ("Contactos", `apps/erp-web/src/features/contacts`, ruta `/contacts`)
  con pestañas Clientes/Proveedores y un componente genérico
  `ContactPanel<T>` compartido (la UI, a diferencia del backend, no carga
  riesgo de divergencia de reglas de negocio) que incluye edición completa,
  no solo crear+alternar estado. **Bug real encontrado y corregido antes
  de llegar a producción** (durante la propia redacción del E2E): una
  singularización naïve por regex del label plural ("Proveedores" →
  "proveedore" en vez de "proveedor") habría roto el botón "Nuevo
  proveedor" — corregido con un prop `singularLabel` explícito. Las
  lecciones de re-render de Catálogo se aplicaron desde el primer borrador,
  así que los tests de `apps/erp-web` pasaron en el primer intento sin
  necesitar depuración de re-render. **Verificado con un E2E de Playwright
  real**: crea un cliente real con taxId/email, lo edita (cambia nombre,
  limpia el taxId vía `""`), alterna su estado, crea un proveedor real —
  todo contra el backend real. De paso, corregido un bug de documentación
  preexistente: el docstring de `Product` en `schema.prisma` referenciaba
  un "ADR-009" que nunca se escribió — corregido para apuntar a la
  sección real de `docs/SECURITY.md`. Detalle completo en
  `docs/WORK_QUEUE.md` ("Hecho — sesión 24").
- **Taxes, Warehouses, Pricing — Fase 2, bloque de cierre** (`apps/api/src/
  modules/taxes`, `.../warehouses`, `.../pricing`, Claude, sesión 25):
  `Tax` (code, name, `rate` como porcentaje en string decimal canónico,
  `numeric(7,4)`), `Warehouse` (code, name, dirección plana, sin
  Branch/Location porque ninguna existe todavía en el schema),
  `PriceList` (code, name, currency, `validFrom`/`validUntil` como `date`
  civil con vigencia validada en el dominio) y `PriceListItem`
  (referencia solo a `Product`, nunca a `ProductVariant` — soportar
  variantes habría exigido un índice único parcial que Prisma no expresa
  declarativamente; sin columna de estado propia, quitar un ítem es un
  `DELETE` real). **Primera dependencia genuina entre módulos de negocio
  del código base**: `AddPriceListItemUseCase` (Pricing) llama al
  `GetProductUseCase` público de Catalog (nuevo, agregado a su contrato
  exportado), no a su repositorio crudo — `PricingModule` importa
  `CatalogModule` directamente, dependencia dirigida y libre de ciclos.
  6 permisos nuevos (`taxes.*`/`warehouses.*`/`pricing.price-lists.*`),
  auditoría real en las 7 acciones nuevas. Tabla nueva (migración
  `20260831170111_pricing_taxes_warehouses_master_data`, **generada y
  aplicada directamente contra Postgres real**, combinando tres módulos
  en una sola migración limpiamente al primer intento). Contrato HTTP
  nuevo (`GET/POST /api/v1/taxes`, `/api/v1/warehouses`,
  `/api/v1/pricing/price-lists` con ítems anidados). UI nueva
  ("Comercial", `apps/erp-web/src/features/commercial`, ruta
  `/commercial`) con pestañas Impuestos/Bodegas/Precios — tres paneles
  dedicados en vez de uno genérico, ya que los tres shapes de campo
  divergen demasiado para justificar la abstracción; el panel de Precios
  incluye un modal anidado de ítems con selector de producto que filtra
  `hasVariants` del lado del cliente. **Dos fallos reales de test (no de
  producción) encontrados y corregidos durante la propia escritura de
  tests**: el `hint` de `FormField` se concatena al nombre accesible de su
  `<label>`, rompiendo una coincidencia exacta de `getByLabelText`; y
  "Ciudad" colisionaba entre el encabezado de columna, la celda de valor y
  la etiqueta del modal (montado permanentemente por `Tabs`) — ambos
  corregidos ajustando las aserciones del test, no el código de
  producción. **Verificado con un smoke test manual completo contra
  Docker/Postgres real**: impuesto y bodega reales creados, producto
  `hasVariants` real rechazado de una lista de precios, precisión decimal
  confirmada vía `psql` directo contra `numeric(14,4)`/`numeric(7,4)` sin
  recorte de ceros, `DELETE` real de un ítem confirmado con conteo de
  filas en Postgres, y las 12 entradas de auditoría de la sesión completa
  verificadas en orden. Detalle completo en `docs/WORK_QUEUE.md`
  ("Hecho — sesión 25").
- **Inventory — Fase 3, completa** (`apps/api/src/modules/inventory`,
  Claude, sesión 26, en un solo bloque de trabajo): `InventoryMovement`
  (ledger append-only, `quantity` decimal con signo — el delta de saldo de
  cualquier fila es siempre exactamente su propio valor),
  `InventoryBalance` (proyección reconciliable, `available =
  onHand - reserved` siempre calculado en `domain/decimal.ts` con
  aritmética `BigInt` exacta — el dominio nunca importa `Prisma.Decimal`,
  primera vez que un módulo de este código base necesita *calcular* con
  decimales dentro del dominio, no solo validarlos), `InventoryReservation`
  (reservar/liberar sin mover físicamente, solo liberación completa),
  `InventoryTransfer` (`IN_TRANSIT → COMPLETED | CANCELLED`; crear una
  transferencia descuenta el origen de inmediato vía `TRANSFER_OUT`, no es
  solo una intención — `in_transit` es una consulta sobre transferencias,
  nunca una tercera columna de saldo). **La invariante única que hace todo
  el módulo concurrency-safe** —
  `nextOnHand >= 0 AND nextReserved >= 0 AND nextOnHand >= nextReserved`,
  aplicada bajo `SELECT ... FOR UPDATE` — previene de forma uniforme
  oversell, reservas negativas y sobre-reserva sin necesitar una rama por
  tipo de movimiento; **verificada con escritores concurrentes reales
  contra Postgres real**: 7 `RecordIssueUseCase` concurrentes de 2
  unidades cada uno contra 10 unidades reales de existencia producen
  exactamente 5 éxitos, 2 rechazos con `InsufficientInventoryError`, y un
  saldo final de `0.0000` — nunca negativo —, repetido para reservas
  concurrentes. Tracking a nivel de variante (a diferencia de Pricing, que
  lo evitó deliberadamente en sesión 25) resuelto con dos índices únicos
  parciales escritos a mano en la migración, ya que Prisma no puede
  expresar índices parciales declarativamente. **Segunda dependencia
  genuina entre módulos de negocio**: Inventory importa `CatalogModule`
  (`GetProductUseCase`+`GetProductVariantUseCase`, este último nuevo) y
  `WarehousesModule` (`GetWarehouseUseCase`, nuevo), ambas dirigidas y
  libres de ciclos. **Bug real de schema encontrado por el propio test de
  integración de este módulo, antes del primer commit**:
  `InventoryMovement.correlationId` se había declarado `@db.Uuid`, pero
  `CorrelationIdMiddleware` acepta el header `X-Correlation-Id` del
  cliente sin garantizar formato UUID — corregido a `varchar(100)`
  (mismo tipo que `audit_entries`/`outbox_messages` ya usaban) antes de
  compartir la migración. 7 permisos nuevos
  (`inventory.balances.read`/`inventory.movements.*`/
  `inventory.reservations.*`/`inventory.transfers.*`), auditoría real en
  las 7 acciones de escritura. Tabla nueva (migración
  `20260831175237_inventory_ledger`, **generada vía `prisma migrate diff
  --script` en vez de `prisma migrate dev --create-only`**, que falla en
  este entorno no interactivo — técnica documentada como reutilizable).
  Contrato HTTP nuevo, un controlador (`InventoryController`, 12 rutas
  bajo `/api/v1/inventory`). UI nueva ("Inventario",
  `apps/erp-web/src/features/inventory`, ruta `/inventory`) con 4
  pestañas (Existencias/Movimientos/Reservas/Transferencias) y un
  componente reutilizable `ProductAndVariantFields` compartido por los 5
  formularios que apuntan a una unidad vendible. **Dos bugs reales
  encontrados y corregidos durante la propia escritura de tests**: dos
  tests que cambiaban de pestaña con `getByRole` síncrono antes de que el
  fetch async de bodegas/productos resolviera (corregido a `findByRole`);
  y los paneles de Reservas/Transferencias recargaban la lista completa
  tras crear en vez de anexar el objeto recién creado, rompiendo la
  convención ya establecida por `PriceListsPanel` (corregido a append
  optimista). **Verificado con un E2E de Playwright real**
  (`apps/e2e/tests/inventory.spec.ts`, corrida limpia contra
  infraestructura efímera tras detener los servidores persistentes, mismo
  protocolo de sesión 18): producto y dos bodegas reales, recepción real,
  intento de salida con oversell real rechazado (`409`, error visible en
  la UI), ledger real, reserva real creada y liberada (confirmando el
  efecto en disponible), transferencia real creada y completada
  (confirmando la llegada a destino). **Smoke test manual adicional
  verificado contra Docker/Postgres real**: recepción con decimales de 4
  dígitos, salida real, oversell real rechazado, precisión decimal y tipo
  de `correlation_id` confirmados directamente vía `psql`, auditoría real
  confirmada. Detalle completo en `docs/WORK_QUEUE.md`
  ("Hecho — sesión 26").
- **Sales y Payments — Fase 4, completa** (`apps/api/src/modules/sales`,
  `apps/api/src/modules/payments`, Claude, sesión 27, en un solo bloque de
  trabajo): `Quote`/`QuoteLine` (`DRAFT → CONVERTED | CANCELLED`, nunca
  reserva inventario — solo un `SalesOrder` confirmado lo hace),
  `SalesOrder`/`SalesOrderLine` (`DRAFT → CONFIRMED → FULFILLED`,
  `CANCELLED` alcanzable solo desde `DRAFT`/`CONFIRMED` — una orden
  despachada se corrige con una devolución, no una cancelación),
  `SalesReturn`/`SalesReturnLine` (registro propio append-only, sin
  columna de estado — nunca una mutación de `SalesOrder`). **Patrón nuevo:
  entidades de doble factory** — `QuoteLine`/`SalesOrderLine` tienen
  `.create()` (calcula `lineTotal` vía `domain/decimal.ts`, aritmética
  `BigInt` sin dependencias — `tax = applyPercentage(subtotal, taxRate)`,
  primeras operaciones de multiplicación/porcentaje de este código base)
  y `.fromProps()` (confía en el valor persistido) porque `lineTotal` es
  un hecho histórico, no un valor que deba recalcularse silenciosamente
  al leer. **Módulo más transversal del código base hasta ahora**: 6
  dependencias directas y sin ciclos (Catalog, Warehouses, Taxes, Pricing,
  Customers, Inventory). `ConfirmSalesOrderUseCase` implementa el patrón
  de transacción compensatoria que `docs/ROADMAP.md` §8 exige
  explícitamente: reserva línea por línea vía el `CreateReservationUseCase`
  real de Inventory, y si una línea falla por stock insuficiente, libera
  cada reserva ya hecha en el intento actual antes de relanzar el error —
  **verificado contra Postgres real con un escenario multi-línea genuino**
  donde la segunda línea falla de verdad: reservas previas liberadas,
  saldo completamente disponible, orden permanece `DRAFT`.
  `FulfillSalesOrderUseCase` reutiliza `ReleaseReservationUseCase` +
  `RecordIssueUseCase` de Inventory en vez de un tipo de movimiento nuevo.
  `CreateSalesReturnUseCase` valida contra la suma corriente de todas las
  devoluciones previas de una línea (lectura de ledger, nunca un contador
  guardado) y postea `RETURN` real vía Inventory. **Bug real encontrado y
  corregido antes del primer commit**: `ConvertQuoteToSalesOrderUseCase`
  asignaba `warehouseId` a toda línea convertida sin verificar
  `product.trackInventory`, violando la invariante que
  `ConfirmSalesOrderUseCase` asume — corregido resolviendo cada línea vía
  el `GetProductUseCase` público de Catalog. **`apps/api/src/modules/
  payments/`**: `Payment` (agregado independiente de `SalesOrder`),
  `PaymentGateway` (puerto con `capture()`/`refund()` síncronos y siempre
  terminales), `CashPaymentGatewayAdapter` (siempre exitoso, sin
  referencia), `BankTransferPaymentGatewayAdapter` (exige una referencia
  de transferencia real o falla con razón explícita). **Deliberadamente
  sin ningún adapter con credenciales** (Stripe/PayPal/etc., ver ADR-009
  nuevo) — fabricar uno así habría violado MASTER_SPEC §90 más gravemente
  que cualquier otra simulación ya evitada, precisamente por tratarse de
  dinero real. Idempotencia real de `CapturePaymentUseCase` vía
  `@@unique([tenantId, companyId, idempotencyKey])`, con reacción real a
  `PaymentIdempotencyConflictError` para la carrera concurrente genuina —
  **verificado contra Postgres real con 5 capturas genuinamente
  concurrentes**: las 5 resuelven con éxito, coinciden en el mismo
  `Payment.id`, exactamente una creó la fila y las otras 4 fueron réplicas
  reales, y exactamente una fila existe al final. **Segundo bug real
  encontrado por el propio smoke test manual**: cada recaptura idempotente
  escribía una segunda entrada de auditoría (`payments.payment.captured`)
  para un único cargo real — corregido haciendo que `CapturePaymentUseCase.
  execute()` devuelva `{ payment, wasReplayed }` y que el controller solo
  audite cuando `!wasReplayed`; re-verificado contra Postgres real (14
  entradas de auditoría → 13, con una sola captura). 8 permisos nuevos
  (`sales.quotes.*`/`sales.orders.*`/`sales.returns.*`/`payments.*`),
  auditoría real en las 11 acciones de escritura nuevas. Tabla nueva
  (migración `20260831224651_sales_and_payments`, **generada y aplicada
  directamente contra Postgres real**, combinando ambos módulos en una
  sola migración). Contrato HTTP nuevo (`/api/v1/sales/quotes`,
  `/api/v1/sales/orders`, `/api/v1/sales/returns`, `/api/v1/payments`).
  UI nueva ("Ventas", `apps/erp-web/src/features/sales`, ruta `/sales`)
  con pestañas Cotizaciones/Pedidos/Devoluciones; convertir una cotización
  cambia automáticamente a la pestaña Pedidos y abre el detalle de la
  orden recién creada; los Pagos viven dentro del detalle de un pedido, no
  como página propia. **Verificado con un E2E de Playwright real**
  (`apps/e2e/tests/sales.spec.ts`): ciclo de vida completo por navegador
  real — cliente y producto reales, cotización → línea → conversión a
  pedido → confirmación (reserva real) → captura de pago CASH real →
  despacho real → saldo de inventario real verificado → devolución real →
  saldo restaurado verificado. **Smoke test manual adicional verificado
  contra Docker/Postgres real**: ciclo completo con precisión decimal
  confirmada, reintento idempotente confirmado (`sameAsFirst: true`), y
  las 13 entradas de auditoría esperadas confirmadas tras el fix. Detalle
  completo en `docs/WORK_QUEUE.md` ("Hecho — sesión 27").
- 734 tests unitarios pasando (api 617, api-client 15, erp-web 36) + 27 en
  `@erp/events` + 33 en `@erp/notifications` + 6 en `@erp/worker` + 31
  tests de integración con Postgres real + **11 tests E2E de Playwright
  pasando contra infraestructura real completa** (Chromium real,
  Postgres+Redis+MinIO efímeros vía Testcontainers, API y worker
  compilados reales, Vite real), incluyendo pruebas de wiring real de
  NestJS (`auth.module.spec.ts`, `app.module.spec.ts`,
  `tenants.module.spec.ts`, `access-control.module.spec.ts`,
  `configuration.module.spec.ts`, `audit.module.spec.ts`,
  `files.module.spec.ts`, `platform-admin.module.spec.ts`,
  `app-registry.module.spec.ts`, `catalog.module.spec.ts`,
  `customers.module.spec.ts`, `suppliers.module.spec.ts`,
  `taxes.module.spec.ts`, `warehouses.module.spec.ts`,
  `pricing.module.spec.ts`, `inventory.module.spec.ts`,
  `sales.module.spec.ts`, `payments.module.spec.ts` en `apps/api`;
  `outbox-dispatcher.module.spec.ts`/`notifications.module.spec.ts` en
  `@erp/events`/`@erp/notifications`; `worker.module.spec.ts` (ahora
  también verifica `TenantProvisionedNotificationHandler`) en
  `@erp/worker`) y pruebas negativas de aislamiento cross-tenant.
- **Descubrimiento de empresas de un tenant + corrección del panel de
  avance** (Claude, sesión 28, 2026-08-31): reportado por el usuario contra
  la infraestructura Docker real — un tenant real ("Web Space") con una
  empresa real ya provisionada mostraba "Selecciona una empresa..." en
  Ventas/Inventario/Comercial, y "Contexto activo" mostraba "Empresa: Sin
  selección específica" pese a existir la empresa. **Causa raíz real
  encontrada**: `ResolveTenantContextUseCase`/`GET /api/v1/tenants/current`
  nunca inventan un `companyId` — solo lo devuelven de vuelta si el llamador
  ya lo envió — y **no existía ningún endpoint en toda la plataforma para
  listar las empresas de un tenant**; el único lugar donde `companyId` se
  resolvía alguna vez era la respuesta directa de provisioning en
  `OnboardingPage`, así que reabrir un tenant existente desde "Tus
  espacios" (`TenantListPage.openTenant()`) descartaba la empresa por
  completo, sin ninguna forma de recuperarla. `apps/api/src/core/companies/`:
  `CompanyRepository.listByTenant(tenantId)` nuevo (Prisma + fake in-memory),
  `ListCompaniesUseCase` nuevo (filtra solo `ACTIVE`). `apps/api/src/core/
  tenants/presentation/tenants.controller.ts`: `GET /api/v1/tenants/companies`
  nuevo (mismo `TenantContextGuard` que `current()`, que solo exige
  `X-Tenant-Slug` — `X-Company-Id` es opcional en ese guard, así que el
  endpoint puede llamarse antes de conocer ningún `companyId`, resolviendo
  exactamente el problema del huevo y la gallina). `CompanyResponseDto`
  nuevo (`id`, `code`, `name` — nada más de lo que un picker necesita). Sin
  migración nueva — es una consulta nueva sobre `companies`, ya existente.
  `@erp/api-client`: `CompanyResponse` + método `listCompanies` nuevos,
  regenerados desde el spec OpenAPI real (mismo flujo de la sesión 21).
  `TenantListPage.openTenant()` reescrito: llama `listCompanies` primero —
  cero o una empresa resuelve de inmediato sin paso extra (el caso común,
  mismo único clic de siempre); dos o más abren un modal picker nuevo para
  que el usuario elija explícitamente, en vez de que el frontend adivine o
  el backend invente una "primera empresa" implícita que silenciosamente
  apuntara al usuario a datos de la empresa equivocada. De paso, corregido
  el panel "Avance del desarrollo" del workspace
  (`development-progress-panel.tsx`), que seguía mostrando datos estáticos
  de cuando Foundation cerró (sesión 22) — Master Data/Inventario/Ventas y
  Pagos seguían en 0% pese a estar formalmente cerradas (sesiones 25, 26,
  27); corregido a 100% cada una, "Próxima fase" actualizado a Fase 5 —
  Compras, y el promedio total recalculado automáticamente de 14% a 37%
  (el cálculo del propio componente, no un valor hardcodeado aparte).
  **Verificado con un E2E de Playwright real nuevo**
  (`apps/e2e/tests/onboarding.spec.ts`, segundo test del archivo): registro
  → onboarding con empresa real → sale del workspace vía "Cambiar espacio"
  → reabre el mismo tenant desde "Tus espacios" → confirma que el workspace
  ya no muestra "Sin selección específica" → navega a "Ventas" → confirma
  que NO aparece el error "Selecciona una empresa..." y que sí aparece
  contenido real ("Todavía no hay clientes en esta empresa") — la
  verificación directa, en navegador real contra infraestructura real, de
  que el bug reportado por el usuario está resuelto. Detalle completo en
  `docs/WORK_QUEUE.md` ("Hecho — sesión 28").
- **Sincronización del rol Owner con el catálogo de permisos** (Claude,
  sesión 28, segundo bug, 2026-08-31): reportado por el usuario contra el
  tenant real "Web Space" — todos los módulos mostraban "No tienes permiso
  para realizar esta acción.", incluyendo el modal "Asignar Owner" que
  degradaba a pedir un ID de membresía manual porque `GET /api/v1/tenants/
  memberships` también fallaba con `403`. **Causa raíz confirmada contra
  Postgres real antes de escribir código**: `SeedOwnerRoleUseCase` otorga
  al rol Owner "todos los permisos que existan al momento del
  provisioning" — un hueco ya documentado en `docs/SECURITY.md`
  ("No retroactive permission backfill") desde que RBAC se construyó
  (sesión 5), nunca antes manifestado porque ningún tenant real se había
  usado de forma continua a través de tantas fases hasta ahora. Consulta
  directa confirmó el rol Owner de "Web Space" (aprovisionado 2026-08-27,
  cuando el catálogo tenía 3 permisos) con exactamente 3 de 46 otorgados.
  `apps/api/src/core/access-control/`: `RoleRepository.findSystemRolesByName`
  nuevo (única query cross-tenant deliberada de este módulo, mismo criterio
  que `UserRepository.findAll` de ADR-007, filtrada a `isSystem: true` para
  nunca tocar un rol propio de un tenant que coincida de nombre),
  `SyncOwnerRolePermissionsUseCase` nuevo (compara el rol Owner de cada
  tenant contra el catálogo vigente, solo reescribe los que están
  desactualizados — un rol ya sincronizado nunca dispara un `save()`
  innecesario, verificado con un test dedicado), `OwnerRolePermissionSyncSeeder`
  nuevo (corre en cada arranque de `apps/api`, junto a
  `PermissionCatalogSeeder` — espera explícitamente su `seed()` en vez de
  confiar en el orden de `onModuleInit` entre providers del mismo módulo,
  la misma lección del ciclo de módulos de RolesController de la sesión 5
  aplicada proactivamente). Sin migración — es lógica de aplicación sobre
  `roles`/`role_permissions`/`permissions`, tablas ya existentes.
  **Verificado contra Postgres real en el reinicio real de `apps/api` que
  llevó el fix a producción**: el log confirmó "Owner role permission
  sync: 14 of 17 tenant Owner role(s) updated" — no era solo "Web Space",
  la gran mayoría de tenants reales aprovisionados a lo largo de todas las
  sesiones de este proyecto estaban desactualizados. Una consulta directa
  inmediatamente después confirmó el rol Owner de "Web Space" en 46/46.
  Tests: 5 nuevos unitarios (`sync-owner-role-permissions.use-case.spec.ts`:
  sincroniza permisos faltantes, no reescribe un rol ya al día, nunca toca
  un rol no-system que comparta el nombre "Owner", sincroniza tenants
  independientemente entre sí; `owner-role-permission-sync-seeder.spec.ts`:
  confirma el orden explícito catálogo→sync) — 624 tests unitarios totales
  en `apps/api` (antes 619). 1 test de integración nuevo contra Postgres
  real reproduciendo el escenario exacto del bug (rol sembrado con 2
  permisos, catálogo crece a 4, sync los otorga preservando el grant
  original, rol custom no-system con el mismo nombre nunca se toca) —
  32/32 en total (antes 31). Validación completa (`lint`/`typecheck`/
  `test`/`build`/`test:integration`/`test:e2e`, 12/12 Playwright) —
  todo verde. Sin cambios de frontend ni de SDK — el fix es enteramente de
  backend/bootstrap.
- **Purchasing — Fase 5, completa** (Claude, sesión 29, 2026-09-01, en un
  solo bloque de trabajo): PurchaseOrder/PurchaseOrderLine (`DRAFT →
  CONFIRMED → CLOSED`, `CANCELLED` solo desde `DRAFT`/`CONFIRMED` y nunca
  con un `PurchaseReceipt` real ya existente), PurchaseReceipt/
  PurchaseReceiptLine (registro propio append-only, recepción genuinamente
  parcial — varias recepciones reales contra el mismo pedido, validadas
  como suma corriente sobre el ledger real, nunca un contador guardado),
  PurchaseReturn/PurchaseReturnLine (registro propio, nunca una mutación
  de `PurchaseOrder`, valida contra recibido-menos-ya-devuelto también
  como suma corriente), y SupplierInvoice (documento independiente,
  `RECORDED → CANCELLED`, deliberadamente sin conexión a ningún flujo de
  pago real — mismo principio "no simular" de ADR-009 aplicado aquí) —
  `apps/api/src/modules/purchasing`. Cuarto módulo de negocio del código
  base, con 4 dependencias directas y sin ciclos (Catalog, Warehouses,
  Suppliers, Inventory). **Segunda dependencia real de Inventory como
  "port transaccional"** (tras Sales, sesión 27): `RecordReceiptUseCase`
  ganó su primer caller real y un parámetro `referenceType`/`referenceId`
  opcional (antes fijo a `"MANUAL"`), cumpliendo lo que su propio
  docstring ya anticipaba desde la sesión 26; `CreatePurchaseReturnUseCase`
  reutiliza `RecordIssueUseCase` (no `RecordReturnUseCase`, que es la
  dirección opuesta — stock entrando por devolución de cliente, no
  saliendo hacia el proveedor). `InventoryMovementReferenceType` ganó
  `PURCHASE_ORDER`/`PURCHASE_RETURN`.
  **El exit criteria de segregación de funciones se implementó con un
  permiso genuinamente distinto** (`purchasing.orders.approve`, separado
  de `purchasing.orders.manage`) y se verificó con dos memberships reales
  y dos `RoleAssignment` reales contra Postgres real — no solo diseñado:
  `apps/api/test/integration/purchasing.integration-spec.ts` confirma que
  un rol "Buyer" con solo `.manage` no puede aprobar y un rol "Approver"
  con solo `.approve` no puede administrar. El exit criteria de
  trazabilidad se verificó con dos recepciones parciales reales que agotan
  exactamente lo pedido, un intento de exceder por `0.0001` rechazado, y
  un intento real de cancelar un pedido con una recepción ya existente
  rechazado — todo contra Postgres real, mismo nivel de rigor que Sales
  (sesión 27) e Inventory (sesión 26). Suplemento: `GetSupplierUseCase`
  nuevo en el contrato público de Suppliers (mismo patrón que
  `GetCustomerUseCase` de Customers), y `suppliers` ganó
  `@@unique([tenantId, id])` (primer consumidor de FK, igual que
  `customers`/`taxes` antes de Sales). 9 permisos nuevos
  (`purchasing.orders.read`/`.manage`/`.approve`,
  `purchasing.receipts.read`/`.manage`, `purchasing.returns.read`/`.manage`,
  `purchasing.invoices.read`/`.manage`), auditoría real en las 9 acciones
  de escritura. Tabla nueva (migración `20260901182240_purchasing`,
  **generada y aplicada directamente contra Postgres real** vía el mismo
  workaround no-interactivo de `prisma migrate diff` ya establecido,
  combinando 7 tablas nuevas y una extensión de enum en una sola
  migración, aplicada limpiamente al primer intento). Contrato HTTP nuevo
  (`/api/v1/purchasing/orders`, `.../receipts`, `.../returns`,
  `.../supplier-invoices`). **`@erp/api-client`**: ~20 tipos y ~16 métodos
  nuevos generados desde el spec OpenAPI real, sin bugs de fidelidad de
  decoradores (todos los campos nullable llevaron `type:`/`nullable:`
  explícitos desde el inicio, la lección de la sesión 21 aplicada
  proactivamente). **UI** (`apps/erp-web/src/features/purchasing/`, ruta
  nueva `/purchasing`, botón "Compras" en el workspace): pestañas Órdenes
  de compra/Devoluciones/Facturas de proveedor; el detalle de una orden
  confirmada incluye una sección "Recepciones" que registra recepciones
  parciales reales, reutilizando el patrón ya establecido de "línea +
  cantidad → agregar a la lista → enviar" de las devoluciones de Sales.
  **Dos bugs reales de substring matching de Playwright encontrados
  durante la propia escritura del E2E, no simulados** (misma familia del
  bug real "Ver"/"Volver al workspace" ya documentado en sesiones
  anteriores): `getByText("Todavía no hay órdenes de compra")` coincidía
  también con el texto oculto "...en esta empresa." del formulario de
  Facturas de proveedor (`Tabs` mantiene todos los paneles montados);
  `getByLabel("Proveedor")` coincidía también con "Número de factura del
  proveedor" en el mismo formulario — ambos corregidos con `{ exact: true
  }` en las aserciones del test, sin tocar el código de producción.
  Tests: 93 tests unitarios nuevos en `apps/api` (39 de dominio, 54 de
  aplicación, incluyendo la prueba de segregación de funciones a nivel de
  fixture y la validación de suma corriente de recepciones/devoluciones)
  — 718 tests unitarios totales en `apps/api` (antes 624, sumando también
  las 5 de la sesión 28). 1 escenario de integración nuevo con dos tests
  contra Postgres real (`purchasing.integration-spec.ts`): ciclo de vida
  completo Order→Confirm→2 recepciones parciales→rechazo por exceso→Close→
  Return con llamadas cross-module reales, y el escenario de segregación
  de funciones con memberships/roles reales — 34/34 en total (antes 32).
  1 test nuevo en `@erp/api-client` — 17/17 en total (antes 16). 3 tests
  nuevos en `apps/erp-web` (`purchasing-page.spec.tsx`) — 42/42 en total
  (antes 39). **E2E real nuevo** (`apps/e2e/tests/purchasing.spec.ts`,
  Chromium vía Testcontainers): ciclo de vida completo por navegador
  real — proveedor y producto reales, orden de compra → línea con costo
  unitario real → confirmación → recepción parcial real (60 de 100) →
  saldo de inventario real verificado → devolución real (5 unidades) →
  saldo restaurado verificado → factura de proveedor real creada y
  cancelada — 13/13 Playwright en total (antes 12).
- **POS — Fase 6, completa** (`apps/api/src/modules/pos`, Claude, sesión
  30, en un solo bloque de trabajo): PosRegister/PosShift (`OPEN → CLOSED`,
  a lo sumo un turno `OPEN` por caja a la vez — invariante de aplicación
  verificada con `PosShiftRepository.findOpenByRegister`, no un índice
  parcial), PosCashMovement (ledger append-only de ingresos/egresos),
  PosSale/PosReturn (registros propios creados únicamente después de que
  el flujo real de Sales/Payments termina con éxito). Tercera dependencia
  transversal de negocio del código base tras Sales/Purchasing, y la
  primera cuyo caso de uso principal (`RingUpSaleUseCase`) no posee su
  propio dominio transaccional: orquesta `CreateSalesOrderUseCase`/
  `AddSalesOrderLineUseCase`/`ConfirmSalesOrderUseCase`/
  `CapturePaymentUseCase`/`FulfillSalesOrderUseCase` enteramente a través
  de los contratos públicos de Sales y Payments (ambos módulos ganaron
  export nuevos en esta sesión: `CreateSalesOrderUseCase`,
  `AddSalesOrderLineUseCase`, `CancelSalesOrderUseCase`,
  `FulfillSalesOrderUseCase`, `CreateSalesReturnUseCase` en Sales;
  `CapturePaymentUseCase`, `RefundPaymentUseCase` en Payments — este
  último ya estaba exportado desde `index.ts` pero nunca había sido
  agregado al arreglo `exports` del propio `PaymentsModule` de Nest, el
  mismo hueco real que Sales tenía con `ConfirmSalesOrderUseCase` antes de
  esta sesión). Cualquier falla después de crear la orden dispara la misma
  compensación que `ConfirmSalesOrderUseCase` ya estableció: cancela la
  orden (mejor esfuerzo, nunca oculta el error real), cubriendo tanto una
  orden aún `DRAFT` (falla al agregar línea o confirmar) como una
  `CONFIRMED` (pago rechazado, `amountTendered` insuficiente) sin lógica
  duplicada. **Límite de concurrencia documentado explícitamente, no
  oculto**: el pre-chequeo de idempotencia de `RingUpSaleUseCase` corre
  una sola vez, al inicio, así que una reintentona *secuencial* tras
  perder la respuesta (el caso real que un terminal produce en la
  práctica) queda completamente cubierta, pero una carrera genuinamente
  *simultánea* puede dejar más de una `SalesOrder`/`Payment` real creada
  antes de que cualquiera confirme el `PosSale` final — la garantía real
  verificada es que exactamente una fila `PosSale` sobrevive y todos los
  llamadores convergen en ella (no que solo se creó un `SalesOrder`), un
  límite razonado explícitamente en el propio docstring de
  `RingUpSaleUseCase` y en `docs/SECURITY.md` "POS" en vez de resolverse
  con un mecanismo de claim-antes-del-efecto (que habría espejado el
  patrón del inbox, ADR-008, fuera de alcance de esta fase). 10 permisos
  nuevos (`pos.registers.read/.manage`, `pos.shifts.read/.manage`,
  `pos.cash-movements.read/.manage`, `pos.sales.read/.manage`,
  `pos.returns.read/.manage`), auditoría real en las 6 acciones de
  escritura (`pos.register.created/.status_changed`,
  `pos.shift.opened/.closed`, `pos.cash_movement.recorded`,
  `pos.sale.rung_up`, `pos.return.created`). Tablas nuevas (migración
  `20260901194057_pos`, **generada y aplicada directamente contra
  Postgres real** vía el mismo workaround no-interactivo ya establecido,
  combinando cinco tablas nuevas, dos enums nuevos, y
  `@@unique([tenantId, id])` nuevo en `payments` —su primer consumidor de
  FK— aplicada limpiamente al primer intento). Contrato HTTP nuevo
  (`/api/v1/pos/registers`, `.../shifts`, `.../shifts/:id/cash-movements`,
  `.../sales`, `.../returns`). **`@erp/api-client`**: ~16 tipos y 14
  métodos nuevos generados desde el spec OpenAPI real, sin bugs de
  fidelidad de decoradores. **UI** (`apps/erp-web/src/features/pos/`, ruta
  nueva `/pos`, botón "Punto de venta" en el workspace): pestañas
  Vender/Cajas/Ventas. A diferencia de Purchasing/Sales, la lista de cajas
  se carga una sola vez a nivel de página (no por pestaña activa) porque
  la pestaña "Vender" —activa por defecto al entrar— la necesita antes de
  que el usuario visite jamás la pestaña "Cajas"; un intento inicial de
  cargarla de forma perezosa por pestaña (el mismo patrón ya usado en el
  resto de esta UI) habría dejado el selector de caja vacío en el primer
  render, un bug real encontrado y corregido durante el propio diseño,
  antes de escribir ningún test. El carrito de venta reutiliza el mismo
  componente `ProductLineFields` (producto + variante + impuesto
  opcional) sin selector de bodega, ya que `RingUpSaleUseCase` resuelve la
  bodega del lado del servidor a partir de la caja del turno, nunca desde
  la entrada del usuario. El ticket se imprime con `window.print()` del
  navegador — soporte real, no una simulación de una impresora térmica
  específica, consistente con la decisión de no fabricar adapters de
  hardware sin hardware real que validar (ver "Known limitations" en
  `docs/SECURITY.md` "POS"). Tests: 72 tests unitarios nuevos en
  `apps/api` (29 de dominio incluyendo la aritmética decimal propia del
  módulo, 40 de aplicación incluyendo el escenario de compensación por
  pago rechazado y la reacción real a un conflicto de idempotencia
  simulado, 3 de wiring del módulo) — 790 tests unitarios totales en
  `apps/api` (antes 718). Suite de integración con 2 escenarios reales
  nuevos contra Postgres (`pos.integration-spec.ts`): ciclo de vida
  completo Register→Shift→RingUpSale→CashMovement→Return→Close con
  llamadas cross-module reales a Sales/Payments/Inventory, y 5 solicitudes
  de `ringUpSale` genuinamente concurrentes con la misma `idempotencyKey`
  confirmando exactamente una fila `PosSale` final — 36/36 en total (antes
  34). 1 test nuevo en `@erp/api-client` — 18/18 en total (antes 17). 3
  tests nuevos en `apps/erp-web` (`pos-page.spec.tsx`) — 45/45 en total
  (antes 42). **E2E real nuevo** (`apps/e2e/tests/pos.spec.ts`, Chromium
  vía Testcontainers, pasó a la primera sin colisiones de
  `getByText`/`getByLabel`): ciclo de vida completo por navegador real —
  cliente y producto reales, recepción de stock real, caja real creada,
  turno abierto con fondo inicial real, venta real en efectivo con vuelto
  calculado, saldo de inventario real verificado, devolución real con
  reembolso completo, saldo restaurado verificado, y cierre de turno real
  con efectivo esperado/diferencia calculados y verificados contra
  Postgres real — 14/14 Playwright en total (antes 13).
- **Commerce — Fase 7A, motor completo** (`apps/api/src/modules/commerce`,
  Claude, sesión 31, en un solo bloque de trabajo): `Storefront`
  (multi-tienda, `code` público globalmente único — mismo precedente ya
  sentado por `Tenant.slug`, `defaultWarehouseId` opcional),
  `StorefrontProduct` (join de publicación de catálogo, idempotente),
  `Cart`/`CartLine` (anónimos, sin sesión — `Cart.id` es el propio token
  público de carrito), y `CommerceOrder` (creado únicamente después de un
  `SalesOrder` real, canal `ECOMMERCE`, confirmado vía el contrato público
  de Sales — `CheckoutUseCase` orquesta resolución/creación de cliente
  invitado, orden, líneas, confirmación y captura opcional de pago
  enteramente a través de los contratos públicos de Catalog/Customers/
  Sales/Payments). **Primera API pública y sin autenticación de todo el
  código base** (`/api/v1/storefront/:storefrontCode/*`,
  `PublicStorefrontContextGuard` resuelve tenant/company/storefront solo
  desde el handle público, con `ThrottlerGuard` propio y ventana de rate
  limit separada de la de login). Sexto módulo de negocio del código
  base, con seis dependencias directas y sin ciclos (Catalog, Warehouses,
  Customers, Sales, Payments, Users — esta última para
  `StorefrontSystemUserSeeder`, un `User` no interactivo, nunca con
  credencial, que satisface la columna `NOT NULL`
  `InventoryMovement.createdByUserId` en un checkout anónimo) — la mayor
  superficie de cualquier módulo hasta ahora, y el segundo (tras POS)
  cuyo flujo de escritura principal orquesta otros módulos de negocio en
  vez de poseer su propio dominio transaccional.
  **Idempotencia del checkout basada en el propio `Cart.id`, no en una
  clave generada por el llamador** (a diferencia de POS) — un carrito
  solo se convierte una vez, así que ya es la clave de deduplicación
  natural; constraint real `@@unique([tenantId, cartId])` en
  `commerce_orders`, verificado con 5 solicitudes de checkout
  genuinamente concurrentes contra Postgres real compartiendo el mismo
  `cartId`: las 5 resuelven con éxito, las 5 convergen en el mismo
  `CommerceOrder.id`, y existe exactamente una fila al final
  (`apps/api/test/integration/commerce.integration-spec.ts`) — mismo
  límite bajo carrera genuinamente simultánea ya documentado y aceptado
  para POS (ADR-010), heredado sin volver a discutirlo (**ADR-011**
  nuevo, que también fija el modelo de pago/cumplimiento: sin gateway
  credenciado —heredado de ADR-009—, un checkout sin `paymentReference`
  deja el pedido `CONFIRMED` y sin pagar, `paymentId: null`, un estado
  normal y esperado, capturable después desde la propia pantalla de Pagos
  ya existente; nunca se despacha automáticamente). De paso, `Customers`
  ganó `FindCustomerByEmailUseCase` (con `email` ahora normalizado a
  minúsculas en escritura — un bug real de datos corregido en esta
  sesión: antes se guardaba tal cual lo tipeara el llamador, rompiendo
  silenciosamente el emparejamiento case-insensitive de un cliente
  invitado repetido) y `buildSalesTestContext()` ganó `getProduct`/
  `getProductVariant`/`listProductVariants`/`customers`/`createCustomer`
  en su objeto devuelto (mismo patrón aditivo ya usado para POS).
  **Dos bugs reales encontrados y corregidos durante la propia
  verificación E2E, no simulados**: (1) los DTOs `CreateCartDto`/
  `CheckoutRequestDto` del controlador público se declararon sin ningún
  decorador de `class-validator` — bajo el `ValidationPipe` global
  (`forbidNonWhitelisted: true`) esto los hacía rechazar con "property ...
  should not exist" incluso para un cuerpo realmente válido, ya que
  `class-validator` solo reconoce como "whitelisted" una propiedad con al
  menos un decorador — corregido agregando
  `@IsOptional()`/`@IsString()`/`@IsNotEmpty()` explícitos; (2)
  `StorefrontsController.publish()`/`.unpublish()` devolvían
  `productCode`/`productName` como cadenas vacías (`"()"` visible en la
  UI de administración) en vez de resolver el producto real — corregido
  inyectando `GetProductUseCase` en el controlador. Migración
  `20260902095223_commerce` (5 tablas nuevas, 3 enums nuevos,
  `@@unique([tenantId, paymentId])` agregado a `commerce_orders`),
  **generada y aplicada directamente contra Postgres real** vía el mismo
  workaround no-interactivo ya establecido, limpiamente al primer
  intento. 10 permisos nuevos (`commerce.storefronts.read`/`.manage`,
  `commerce.orders.read`), auditoría real en las 4 acciones de escritura
  admin (`commerce.storefront.created`/`.status_changed`,
  `commerce.storefront_product.published`/`.unpublished`). Contrato HTTP
  nuevo: `/api/v1/commerce/storefronts` (+ `/status`, `/products`,
  `/products/:productId`), `/api/v1/commerce/orders` (admin,
  autenticado); `/api/v1/storefront/:storefrontCode/products`
  (+`/:productId`), `.../carts` (+`/:cartId`, `/:cartId/lines`,
  `/:cartId/lines/:lineId`), `.../checkout`, `.../orders/:orderId`
  (público). **`@erp/api-client`**: ~20 tipos y 16 métodos nuevos
  (7 admin, 9 públicos — estos últimos sin `accessToken`/`tenantSlug`/
  `companyId` en absoluto), regenerados desde el spec OpenAPI real, con
  dos campos (`defaultWarehouseId`, `productVariantId`) corregidos
  proactivamente con `type: String` explícito antes de la primera
  generación (lección de la sesión 21 aplicada desde el inicio). **UI**
  (`apps/erp-web/src/features/commerce/`, ruta nueva `/commerce`, botón
  "Comercio" en el workspace): pestañas Tiendas/Pedidos; el detalle de
  una tienda incluye un modal "Catálogo publicado" con publicar/
  despublicar. Tests: 839 tests unitarios totales en `apps/api` (antes
  790 — Commerce + los 3 nuevos de `FindCustomerByEmailUseCase`). 2
  escenarios de integración nuevos contra Postgres
  (`commerce.integration-spec.ts`): ciclo de vida completo Storefront→
  publish→Cart→Checkout con llamadas cross-module reales, y el escenario
  de concurrencia genuina de 5 checkouts simultáneos — 38/38 en total
  (antes 36). 20/20 tests en `@erp/api-client` (antes 18, incluyendo un
  bloque nuevo que confirma que las 9 llamadas públicas nunca llevan
  `Authorization`/`X-Tenant-Slug`/`X-Company-Id`). 48/48 tests en
  `apps/erp-web` (antes 45). **E2E real nuevo**
  (`apps/e2e/tests/commerce.spec.ts`, Chromium vía Testcontainers): un
  producto y una bodega reales, una tienda real creada desde el admin con
  esa bodega como predeterminada, el producto publicado, y luego —vía el
  fixture `request` de Playwright, sin ningún header de sesión/tenant en
  absoluto— un comprador anónimo real que lista el catálogo público,
  crea un carrito real, agrega una línea real (precio resuelto
  server-side, verificado byte a byte contra Postgres), hace checkout sin
  referencia de pago (pedido `CONFIRMED` y sin pagar), reintenta el mismo
  checkout confirmando la misma orden (idempotencia real), y confirma en
  el admin que el pedido aparece como "Pendiente" y que el inventario
  quedó reservado (no emitido) — 15/15 Playwright en total (antes 14). La
  construcción del storefront Next.js (Fase 7B) se delegó a un subagente
  en background con este mismo contrato público, ya estable y verificado,
  como especificación completa; su resultado se revisa e integra por
  separado, sin bloquear el cierre de Fase 7A.
- **Accounting — Fase 8, motor completo** (`apps/api/src/modules/
  accounting`, Claude, sesión 32, en un solo bloque de trabajo, ADR-012):
  Account (Chart of Accounts, `type` derivando `normalBalance` en el
  dominio — nunca una columna almacenada, mismo self-relation que
  `Category.parentId`), FiscalPeriod (`OPEN → CLOSED` terminal,
  `CreateFiscalPeriodUseCase` rechaza cualquier rango que solape un
  período existente), JournalEntry/JournalEntryLine (append-only —
  `JournalEntryLine.create()` exige exactamente un lado positivo por
  línea en el dominio, `CreateJournalEntryUseCase` exige
  `sum(debit) === sum(credit)` de todo el asiento en la aplicación, la
  misma división "regla de línea en la entidad, regla multi-línea en el
  caso de uso" ya usada por `SalesOrder`/`ConfirmSalesOrderUseCase`),
  `ReverseJournalEntryUseCase` (asiento nuevo balanceado con cada línea
  invertida, nunca edita el original — `reversalOfEntryId`/
  `reversedByEntryId` como los dos punteros de la reversión, el segundo
  añadido una sola vez después del hecho, mismo patrón `Payment.refundedAt`/
  `FileObject.markDeleted` ya establecido), y `GetTrialBalanceUseCase`/
  `GetAccountLedgerUseCase` (recalculados en cada llamada directamente del
  ledger real, nunca un saldo almacenado, mismo criterio que
  `InventoryBalance`). **El único módulo de negocio de este código base
  sin ninguna dependencia cruzada**: `AccountingModule` no importa
  ningún otro módulo de negocio, y ninguno lo importa a él — decisión
  explícita de ADR-012, no un descuido. Copia propia y acotada de
  aritmética decimal BigInt sin dependencias
  (`apps/api/src/modules/accounting/domain/decimal.ts`), con
  `isEqualDecimal` como su única operación nueva frente a las copias ya
  usadas por Sales/Inventory/POS/Commerce — la comprobación central de la
  partida doble. **Bug real de diseño encontrado y corregido antes del
  primer commit**: `reversalOfEntryId` existía en la entidad/schema desde
  el diseño inicial específicamente para que una reversión apunte hacia
  atrás a lo que revierte, pero ningún caso de uso lo llenaba jamás —
  corregido agregando el campo a `CreateJournalEntryInput` y pasándolo
  desde `ReverseJournalEntryUseCase`, cerrando el hueco antes de que
  quedara como código muerto permanente. 7 permisos nuevos
  (`accounting.accounts.read/.manage`, `accounting.periods.read/.manage`,
  `accounting.entries.read/.manage`, `accounting.reports.read`).
  Tablas nuevas (migración `20260902142615_accounting`, **generada y
  aplicada directamente contra Postgres real** vía el mismo workaround
  no-interactivo de `prisma migrate diff --script` ya establecido,
  aplicada limpiamente al primer intento, la primera migración de un
  módulo de negocio en no tocar ninguna tabla de otro módulo). Contrato
  HTTP nuevo, cuatro controladores
  (`/api/v1/accounting/accounts`, `.../fiscal-periods`,
  `.../journal-entries`, `.../reports/trial-balance`|`/account-ledger`).
  **`@erp/api-client`**: ~20 tipos y 14 métodos nuevos generados desde el
  spec OpenAPI real. **Segundo bug real encontrado durante la propia
  regeneración**, no de Accounting sino descubierto por el mismo proceso:
  `CheckoutInput` (Commerce, Fase 7) incluía `cartId` como campo propio
  del tipo generado pese a que el SDK ya lo recibe como parámetro
  posicional explícito — un `TS2783` real ("specified more than once")
  que solo se manifestó al regenerar tipos por primera vez desde que ese
  campo se agregó al DTO real del controlador — corregido con
  `Omit<CheckoutRequestDto, "cartId">`, mismo patrón de excepción ya
  documentado para `CreateProductInput`. **UI**
  (`apps/erp-web/src/features/accounting/`, ruta nueva `/accounting`,
  botón "Contabilidad" en el workspace): pestañas Cuentas/Períodos/
  Asientos/Balance de comprobación. A diferencia de Purchasing/Sales, el
  catálogo de cuentas y los períodos fiscales se cargan una sola vez a
  nivel de página (no por pestaña activa), porque la pestaña Asientos
  necesita el mismo catálogo de cuentas para sus selectores de línea
  independientemente de cuál pestaña esté activa por defecto — el mismo
  patrón, aplicado proactivamente esta vez, que la propia UI de POS tuvo
  que corregir reactivamente en la sesión 30. **Bug real de locator
  encontrado y corregido durante la propia escritura del E2E**: un
  `getByRole("row", { name: /Venta en efectivo E2E/ })` capturado antes de
  la reversión volvía a resolverse de forma ambigua después, porque la
  fila de la reversión ("Reversal of: Venta en efectivo E2E") también
  contiene la descripción original como substring — corregido con
  `.filter({ hasText }).filter({ hasNotText: "Reversal of:" })` en vez de
  una sola expresión regular, sin tocar ningún componente de producción.
  Tests: 65 tests unitarios nuevos en `apps/api` (28 de dominio incluyendo
  la aritmética decimal propia del módulo, 36 de aplicación incluyendo el
  escenario de idempotencia por `(sourceType, sourceId)` y el de rechazo
  por período cerrado, 1 de wiring del módulo) — 904 tests unitarios
  totales en `apps/api` (antes 839). Suite de integración con 3 escenarios
  reales nuevos contra Postgres (`accounting.integration-spec.ts`): ciclo
  de vida completo Account→FiscalPeriod→Post→TrialBalance→Close→
  reject→Reverse con verificación de precisión decimal real, rechazo real
  de una cuenta de otra compañía, y 5 solicitudes de `createJournalEntry`
  genuinamente concurrentes compartiendo la misma clave de origen
  simulada, confirmando exactamente un asiento final — 41/41 en total
  (antes 38). 21/21 tests en `@erp/api-client` (antes 20). 51/51 tests en
  `apps/erp-web` (antes 48, verificado limpio con una corrida serial
  `--no-file-parallelism` tras que la corrida concurrente completa
  mostrara un fallo aislado por timeout en `pos-page.spec.tsx` —
  contención de recursos de esta sesión larga, mismo patrón ya
  documentado en sesiones anteriores, descartado con la corrida aislada
  limpia). **E2E real nuevo** (`apps/e2e/tests/accounting.spec.ts`,
  Chromium vía Testcontainers): ciclo de vida completo por navegador
  real — dos cuentas reales, un período fiscal real cubriendo la fecha
  real de ejecución, un asiento balanceado real contabilizado, el Balance
  de Comprobación real confirmando la suma exacta y "Balanceado", una
  reversión real confirmada tanto en la lista de asientos como en el
  Balance de Comprobación recalculado (neto exactamente `0.0000`) — 16/16
  Playwright en total (antes 15).
- **CRM — Fase 9, motor completo** (`apps/api/src/modules/crm`, Claude,
  sesión 33, en un solo bloque de trabajo, ADR-013): Lead (`NEW →
  CONTACTED → QUALIFIED` libremente revisitable, `CONVERTED`/`LOST`
  terminales — `Lead.isTerminal`), Pipeline/PipelineStage (pipelines
  configurables por compañía, `isWon`/`isLost` nunca ambos a la vez,
  validado en el dominio, siempre agregadas al final por
  `AddPipelineStageUseCase`), Opportunity (`OPEN → WON | LOST` terminal,
  vinculada a `Customer`/`Lead` sin duplicar ninguno de los dos), y
  Activity (exactamente una relación entre prospecto/oportunidad/cliente
  real, validada primero en la aplicación con un error tipado y mapeable
  a HTTP, y como respaldo en el dominio). **Segundo módulo de negocio del
  código base (tras Sales) con una dependencia real y directa hacia
  Customers**: `ConvertLeadUseCase` resuelve un cliente ya existente por
  correo vía `FindCustomerByEmailUseCase` (mismo patrón de resolución de
  invitado ya usado por el checkout de Commerce) o crea uno nuevo vía
  `CreateCustomerUseCase`, ambos del contrato público real de Customers
  — nunca una copia paralela de sus datos. `CrmModule` importa
  `CustomersModule` directamente, una dependencia dirigida y libre de
  ciclos. Copia propia y acotada de aritmética decimal BigInt sin
  dependencias (`apps/api/src/modules/crm/domain/decimal.ts`), usada por
  `Opportunity.amount` y por `GetPipelineSummaryUseCase` para sumar los
  montos abiertos por etapa. **Bug real de dominio encontrado y corregido
  antes del primer commit, durante la propia escritura de tests**:
  `Opportunity.update()` mutaba `this.props.name` antes de validar
  `amount` vía `assertValidNonNegativeDecimal`, así que una validación de
  monto fallida dejaba un cambio de nombre parcialmente aplicado —
  corregido validando ambos campos antes de mutar cualquiera. El exit
  criteria de `docs/ROADMAP.md` §13 ("pipeline configurable, permisos de
  equipo y privacidad verificados") se satisface con RBAC estándar por
  compañía (8 permisos nuevos: `crm.leads.read/.manage`,
  `crm.pipelines.read/.manage`, `crm.opportunities.read/.manage`,
  `crm.activities.read/.manage`) más un campo `ownerId` en
  Lead/Opportunity/Activity (por defecto el usuario que crea, reasignable
  vía actualización) — decisión deliberada de no inventar una entidad
  "Team" nueva que no existe en ningún otro módulo de Foundation — y
  `Lead.consentMarketing`/`consentedAt` reales para el consentimiento.
  **Ningún handler consume eventos de Sales** — la decisión central de la
  fase (ADR-013 nuevo): ningún módulo de este código base, salvo Tenants,
  ha publicado jamás un evento real de dominio por el outbox, así que
  construir un consumidor especulativo contra un schema de evento
  inventado (sin productor real que lo valide) habría sido exactamente la
  maquinaria prematura que MASTER_SPEC §59/§93 advierte evitar; wiring un
  productor real de Sales exigiría además extender la interfaz de
  `SalesOrderRepository.save()` para aceptar una transacción compartida,
  un cambio real y separado a un módulo ya construido y probado (Fase 4),
  desproporcionado para esta fase. `CreateActivityUseCase` queda
  exportado desde `CrmModule` por adelantado, el mismo precedente ya
  usado por `RecordReceiptUseCase`/`ConfirmSalesOrderUseCase` antes de
  tener su primer caller real. Tabla nueva (migración
  `20260902195127_crm`, **generada y aplicada directamente contra
  Postgres real** vía el mismo workaround no-interactivo ya establecido,
  combinando cinco tablas nuevas, tres enums nuevos, y
  `@@unique([tenantId, id])` nuevo en `leads`/`pipelines`/
  `pipeline_stages`/`opportunities` — cada una consumida por FK dentro de
  esta misma migración —, aplicada limpiamente al primer intento).
  Contrato HTTP nuevo, cuatro controladores (`/api/v1/crm/leads`,
  `.../pipelines`, `.../opportunities`, `.../activities`).
  **`@erp/api-client`**: ~20 tipos y 21 métodos nuevos generados desde el
  spec OpenAPI real, sin bugs de fidelidad de decoradores — todos los
  DTOs llevaron `type:`/`nullable:` explícitos desde el inicio. **UI**
  (`apps/erp-web/src/features/crm/`, ruta nueva `/crm`, botón "CRM" en el
  workspace): pestañas Prospectos/Pipelines/Oportunidades/Actividades.
  Prospectos, Pipelines y Oportunidades se cargan una sola vez a nivel de
  página, no por pestaña activa — la pestaña Actividades necesita las
  mismas listas de Prospectos y Oportunidades para sus selectores de
  relación independientemente de cuál pestaña esté activa por defecto,
  aplicando proactivamente la misma lección que la propia UI de POS tuvo
  que corregir reactivamente en la sesión 30. El ID de cliente en los
  formularios de Oportunidad/Actividad se acepta como texto libre (con un
  hint explícito hacia la pantalla de Contactos) — el backend valida ese
  id contra el contrato real de Customers sin importar cómo la UI lo
  recolectó, la misma decisión de alcance proporcional ya documentada en
  `docs/SECURITY.md` "CRM". Tests: 64 tests unitarios nuevos en `apps/api`
  (30 de dominio, 33 de aplicación incluyendo el escenario de "exactamente
  una relación" y el bug de `Opportunity.update()`, 1 de wiring del
  módulo) — 968 tests unitarios totales en `apps/api` (antes 904). 3
  escenarios de integración nuevos contra Postgres reales
  (`crm.integration-spec.ts`): ciclo de vida completo Pipeline→Stages→
  Lead→Convert→Opportunity→WON→Activity→Summary con precisión decimal
  real verificada, reutilización real de un `Customer` ya existente por
  email en una segunda conversión, y rechazo real de un cliente de otra
  compañía — 44/44 en total (antes 41). 22/22 tests en `@erp/api-client`
  (antes 21). 53/53 tests en `apps/erp-web` (antes 51). **E2E real nuevo**
  (`apps/e2e/tests/crm.spec.ts`, Chromium vía Testcontainers): ciclo de
  vida completo por navegador real — un prospecto real creado y
  convertido a cliente real, un pipeline real con dos etapas reales
  (una de ellas ganadora), una oportunidad real vinculada al prospecto
  convertido movida hasta la etapa ganadora, y una actividad real
  relacionada con el prospecto, completada — 17/17 Playwright en total
  (antes 16).
- **Manufacturing — Fase 10, motor completo** (`apps/api/src/modules/
  manufacturing`, Claude, sesión 34, en un solo bloque de trabajo, ADR-014):
  `BillOfMaterial`/`BillOfMaterialComponent` (receta versionada e inmutable
  — `version` auto-asignado como `existingCount(product) + 1`, nunca
  provisto por el llamador; revisar una receta crea una fila nueva, nunca
  edita componentes existentes), `ProductionOrder` (`DRAFT → CONFIRMED →
  CLOSED`, `CANCELLED` solo desde `DRAFT`/`CONFIRMED` y nunca con
  actividad real ya existente — `ProductionOrderHasActivityError`, mismo
  patrón que `PurchaseOrderHasReceiptsError`), `ProductionOrderMaterial`
  (requerimiento snapshoteado una sola vez desde la BOM, escalado por
  `quantityPlanned`), `ProductionOrderMaterialMovement` (ledger tipado
  `ISSUE`/`RETURN`, siempre positivo — la dirección la lleva `type`, no el
  signo), `ProductionOrderOperation` (pasos simples del proceso, siempre
  agregados al final), y `ProductionOrderFinishedGoodsReceipt` (recepción
  genuinamente parcial de producto terminado). Ver el detalle completo de
  cada entidad, invariante y caso de uso en la entrada "PHASE 10 —
  Manufacturing" de `## Current Phase` arriba — no se repite aquí para no
  duplicar.
  - **Emisión/devolución/recepción genuinamente parciales a través de
    múltiples llamadas**, validadas contra una suma corriente sobre el
    propio ledger de este módulo — mismo patrón ya establecido por
    `CreatePurchaseReceiptUseCase`/`CreatePurchaseReturnUseCase` de
    Purchasing, necesario porque `ReleaseReservationUseCase` de Inventory
    solo soporta liberar la cantidad completa de una reserva. Cada
    movimiento real postea de inmediato el movimiento correspondiente en
    el ledger real de Inventory (`RecordIssueUseCase`/`RecordReturnUseCase`/
    `RecordReceiptUseCase`, `referenceType: "PRODUCTION_ORDER"`, valor
    nuevo agregado a `InventoryMovementReferenceType`).
  - **Bug real de UI encontrado y corregido durante la propia escritura
    del test de `apps/erp-web`, antes de cualquier commit**:
    `ProductSelectFields` (compartido entre el selector del producto
    terminado y el mini-formulario de "agregar componente") marcaba su
    `<select>` como `required` de forma incondicional; el mini-formulario
    limpia sus propios campos a `""` tras cada clic en "Agregar
    componente" para permitir agregar el siguiente, dejando un campo
    `required` vacío en el DOM que el navegador (y jsdom, fielmente)
    bloquea en silencio al enviar el formulario externo — sin lanzar
    ninguna excepción ni disparar jamás `onSubmit`, síntoma que costó una
    ronda de depuración dirigida (confirmar con `screen.debug()` que el
    estado del componente de borrador sí se agregaba correctamente, y con
    un `console.log` temporal en el propio `onSubmit` que nunca se
    imprimía) antes de aislar la causa raíz real: HTML5 constraint
    validation nativa, no un bug de React. Corregido con un prop
    `required` opcional (`true` por defecto, `false` para el
    mini-formulario de agregar componente) — el mismo patrón que
    Purchasing/CRM ya usaban correctamente para sus propios campos de
    "agregar línea"/"agregar etapa" sin `required`.
  - 4 permisos nuevos (`manufacturing.boms.read`/`.manage`,
    `manufacturing.orders.read`/`.manage`), auditoría real en las 8
    acciones de escritura. Tabla nueva (migración
    `20260903032203_manufacturing`, **generada y aplicada directamente
    contra Postgres real** vía el mismo workaround no-interactivo ya
    establecido, combinando siete tablas nuevas, dos enums nuevos, y la
    extensión de `InventoryMovementReferenceType` con `PRODUCTION_ORDER`,
    aplicada limpiamente al primer intento). Contrato HTTP nuevo, dos
    controladores (`/api/v1/manufacturing/bills-of-material`, `.../orders`,
    20 rutas en total).
  - **`@erp/api-client`**: ~18 tipos y 19 métodos nuevos generados desde
    el spec OpenAPI real, sin bugs de fidelidad de decoradores. **UI**
    (`apps/erp-web/src/features/manufacturing/`, ruta nueva
    `/manufacturing`, botón "Manufactura" en el workspace): pestañas
    Listas de materiales/Órdenes de producción, ambas cargadas una sola
    vez a nivel de página junto con productos/bodegas, aplicando
    proactivamente la lección que la propia UI de POS tuvo que corregir
    reactivamente en la sesión 30.
  - **Dos bugs reales de colisión de selector encontrados y corregidos
    durante la propia escritura del E2E**, mismo patrón ya documentado en
    sesiones anteriores (`Tabs` nunca desmonta paneles inactivos, y
    `page.getByText()`, a diferencia de `page.getByRole()`, no respeta el
    atributo `hidden` al resolver coincidencias): el estado vacío "Todavía
    no hay listas de materiales" coincidía como substring con el aviso de
    la pestaña de Órdenes montada en paralelo — corregido con
    `{ exact: true }`; y una búsqueda de texto por el nombre del
    componente dentro del modal de creación de BOM coincidía con las tres
    apariciones de ese texto (las dos `<option>` de los selectores de
    producto terminado/componente, más el ítem de la lista de borrador) —
    corregido escopando la aserción a
    `getByRole("listitem").filter({ hasText })`.
  - Tests: 64 tests unitarios nuevos en `apps/api` (33 de dominio, 30 de
    aplicación, 1 de wiring del módulo) — 1036 tests unitarios totales en
    `apps/api` (antes 968). 3 escenarios de integración nuevos contra
    Postgres reales (`manufacturing.integration-spec.ts`): ciclo de vida
    completo BOM→ProductionOrder→Confirm→emisión/devolución parciales→
    recepción de producto terminado parcial→Close con precisión decimal
    real verificada (`2.5 × 4 = 10.0000`), rechazo real de un componente
    de otra compañía, y el escenario de concurrencia genuina de 7
    emisiones simultáneas contra 10 unidades reales de existencia
    (exactamente 5 éxitos, 2 rechazos con `InsufficientInventoryError`
    real de Inventory, saldo final nunca negativo) — 47/47 en total (antes
    44). 23/23 tests en `@erp/api-client` (antes 22). 55/55 tests en
    `apps/erp-web` (antes 53). **E2E real nuevo**
    (`apps/e2e/tests/manufacturing.spec.ts`, Chromium vía Testcontainers):
    ciclo de vida completo por navegador real — dos productos reales
    (terminado y componente) y una bodega reales, recepción real de stock
    del componente, una BOM real con un componente real, una orden de
    producción real → confirmación real → emisión parcial real (8 de 20
    requeridos) → devolución parcial real (2 de vuelta) → saldo del
    componente real verificado (44.0000 = 50 recibidas − 8 emitidas + 2
    devueltas) → recepción parcial real de producto terminado (3 de 10
    planificadas) → cierre real de la orden con completitud parcial
    (comportamiento intencional, no bloqueado) → saldo del producto
    terminado real verificado (3.0000) — 18/18 Playwright en total (antes
    17).
- **Plugin Platform — Fase 11, alcance proporcional** (`apps/api/src/core/
  app-registry`, `apps/api/src/core/tenants`, Claude, sesión 35, en un
  solo bloque de trabajo, ADR-015): el catálogo (`FOUNDATION_APPS`) pasó
  de vacío a los 15 módulos de negocio reales, con `AppEnablementGuard`
  aplicando ese estado sobre los 32 controladores reales — deshabilitar
  una app tiene por primera vez un efecto real, no solo cosmético. Ver el
  detalle completo de cada pieza, invariante y bug real encontrado en la
  entrada "PHASE 11 — Plugin Platform" de `## Current Phase` arriba — no
  se repite aquí para no duplicar.
  - `EnableAllCatalogAppsUseCase` (nuevo, auto-habilita el catálogo
    completo de un tenant en orden de dependencias) y
    `IsAppEnabledForTenantUseCase` (nuevo, la consulta real que el guard
    usa) — ambos con su propio bug real de diseño encontrado y corregido
    antes del primer commit (ver arriba).
  - `TenantAppEnablementSyncSeeder` (nuevo, backfill en cada arranque del
    API, mismo patrón que `OwnerRolePermissionSyncSeeder`).
  - `AppRegistryModule` refactorizado a módulo hoja; `AppsController`
    movido a `tenants/presentation/apps.controller.ts` para evitar un
    ciclo real de módulos — mismo patrón ya usado por
    `RolesController`/`AuditEntriesController`/`NotificationsController`/
    `MembershipsController`.
  - Sin migración de base de datos — reutiliza `app_definitions`/
    `tenant_apps`/`app_configurations` ya existentes desde ADR-005.
  - Tests: 19 tests unitarios nuevos en `apps/api` — 1055 tests unitarios
    totales (antes 1036). 1 escenario de integración nuevo contra Postgres
    real con el catálogo real completo — 48/48 en total (antes 47). **E2E
    real reescrito por completo** (`apps/e2e/tests/app-registry.spec.ts`,
    reemplazando la versión de sesión 22 basada en fixtures SQL, ya no
    aplicable): ciclo de vida completo por navegador real confirmando el
    `403` real de `AppEnablementGuard` sobre la propia pantalla de
    Ventas — 18/18 Playwright en total (mismo conteo de archivos, uno
    reescrito).
  - Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 9
    paquetes/apps, `pnpm --filter @erp/api test` (1055/1055), `pnpm
    --filter @erp/api test:integration` (48/48 contra Postgres real),
    `pnpm --filter @erp/e2e run test:e2e` (18/18 Playwright) — todo verde.

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

Ninguno activo — **Fase 10 (Manufactura) quedó formalmente cerrada en la
sesión 34** y **Fase 11 (Plugin Platform) quedó formalmente cerrada en la
sesión 35**, ambas en un solo bloque de trabajo cada una (ver Completed
arriba y "Hecho — sesión 34"/"Hecho — sesión 35" en `docs/WORK_QUEUE.md`).
**Fase 12 (Scale) fue evaluada explícitamente en la sesión 36, a pedido
directo del usuario ("continua con la fase 12"), y formalmente cerrada sin
implementar ninguna iniciativa** — ver "Revisión de Fase 12 (Scale) — sin
evidencia" más abajo para el detalle completo y las señales concretas que
activarían cada iniciativa. El siguiente trabajo no bloqueado es
mantenimiento de rutina (ratificar ADR-001/002/003 formalmente), salvo que
el usuario aporte evidencia real de necesidad de escalar algo específico o
indique otra prioridad.

## Revisión de Fase 12 (Scale) — sin evidencia, sesión 36 (2026-09-03)

`docs/ROADMAP.md` §16 titula la fase explícitamente "Scale, solo por
evidencia" y exige que cada iniciativa listada (read replicas,
partitioning, OpenSearch, CDN/image pipeline avanzado, servicios dedicados
para Notifications/Search/Files/Payments/Commerce/Inventory, RabbitMQ/
Kafka, Kubernetes, multi-region/residency o database-per-tenant) tenga
"métricas y ADR independientes" antes de empezar — no es una migración
única a microservicios, y MASTER_SPEC §52/§53 ya rechaza explícitamente
adoptar Kafka/Kubernetes "inicialmente". `docs/PROJECT_STATE.md` registra
en su propia sección "Production Status" (ver más abajo): **Not deployed**
— no existe tráfico real, no existe un solo SLO medido contra producción,
y no existe ninguna métrica real de ningún componente bajo carga real. Sin
ese despliegue no hay, por definición, evidencia que satisfaga el propio
gate que el roadmap se impone a sí mismo para esta fase.

Construir cualquiera de las ocho iniciativas listadas hoy —sin esa
evidencia— sería exactamente el tipo de sobrearquitectura que MASTER_SPEC
§59/§93 advierte evitar y que cada ADR de esta sesión (009 a 015) evitó
consistentemente en su propio dominio: introducir Kafka sin un volumen de
eventos real que lo justifique, o Kubernetes sin múltiples servicios
desplegados de forma independiente que lo requieran, sería fabricar
infraestructura para una necesidad hipotética, no resolver una real. Por
eso esta fase se cierra formalmente **sin ningún cambio de código**: el
trabajo real y honesto de esta sesión es dejar registrada la señal
concreta y medible que activaría cada iniciativa, para que una futura
sesión con evidencia real no tenga que re-derivar el criterio desde cero.

Señales que activarían cada iniciativa (ninguna presente hoy):

- **Read replicas**: lecturas pesadas (reportes, dashboards, listados
  grandes) compitiendo de forma medible con escrituras críticas
  (inventario, pagos, contabilidad) por conexiones o CPU del primary bajo
  carga real — no un umbral arbitrario, sino contención observada.
- **Table partitioning**: una tabla append-only de alto volumen de este
  schema (`inventory_movements`, `audit_entries`, `outbox_messages`/
  `inbox_messages` son las candidatas reales, todas ya diseñadas
  append-only desde su fase de origen) creciendo hasta que sus índices
  dejen de caber en memoria o sus queries por rango de fecha se degraden
  de forma medible.
- **OpenSearch**: el volumen o la latencia de búsqueda de catálogo/
  clientes/pedidos superando lo que los índices de PostgreSQL pueden
  sostener bajo carga real, o una necesidad real de faceting/relevancia
  que PostgreSQL no ofrece razonablemente — MASTER_SPEC §85 ya condiciona
  esto a "cuando se necesite".
- **CDN/image pipeline avanzado**: el storefront público de Commerce
  (Fase 7B, `apps/storefront`) sirviendo imágenes de producto a tráfico
  público real y medible, no bajo desarrollo.
- **Servicios dedicados** (Notifications/Search/Files/Payments/Commerce/
  Inventory): cuando el perfil de escalado, disponibilidad u ownership de
  uno de esos módulos diverja materialmente del resto del monolito — los
  criterios exactos ya están en `docs/ARCHITECTURE.md` §15 ("Criterios
  para extraer un microservicio"), sin que ninguno se cumpla hoy.
- **RabbitMQ/Kafka**: el volumen o fan-out de eventos reales superando lo
  que el outbox transaccional + bus in-process (ADR-004) puede sostener —
  hoy solo existe un productor real (`tenancy.tenant.provisioned.v1`), sin
  ninguna señal de saturación posible todavía.
- **Kubernetes**: múltiples servicios reales desplegados de forma
  independiente, necesidad de autoscaling demostrada bajo tráfico real, y
  un equipo cuya operación lo justifique — MASTER_SPEC §53 exactamente.
- **Multi-region/residency o database-per-tenant**: un requisito real y
  concreto de residencia de datos por jurisdicción de un cliente real, o
  un SLA de disponibilidad multi-región contratado — no una precaución
  especulativa.

**Conclusión.** Fase 12 queda formalmente cerrada como "evaluada, sin
evidencia" — no como "pendiente" ni como "bloqueada". Cualquier sesión
futura con una señal real de las listadas arriba puede reabrir la
iniciativa correspondiente directamente, con su propio ADR independiente,
sin necesidad de re-evaluar las demás.

## Pending

Ningún ítem de la cola original de Foundation queda pendiente
(`docs/WORK_QUEUE.md`), ningún ítem del alcance de Fase 2 descrito en
`docs/ARCHITECTURE.md` §5.2 queda pendiente, y ningún ítem del alcance de
Fase 3 (`docs/ROADMAP.md` §7), Fase 4 (`docs/ROADMAP.md` §8), Fase 5
(`docs/ROADMAP.md` §9), Fase 6 (`docs/ROADMAP.md` §10), Fase 7
(`docs/ROADMAP.md` §11, 7A y 7B completos), Fase 8 (`docs/ROADMAP.md`
§12), Fase 9 (`docs/ROADMAP.md` §13), Fase 10 (`docs/ROADMAP.md` §14) ni
Fase 11 (`docs/ROADMAP.md` §15, a alcance proporcional según ADR-015)
queda pendiente. También pendiente, sin bloquear ningún trabajo futuro:
ratificar ADR-001, ADR-002 y ADR-003 formalmente (ADR-004 a ADR-015 ya
están ratificados) — sus decisiones ya están implementadas y verificadas,
solo falta el documento formal. La UI de RBAC (incluida la invitación de
miembros), el E2E de sesión, la UI de Configuración, la UI de Platform
Administration (sesión 18), la UI de Apps (sesión 22, ahora con las 15
apps reales desde la sesión 35), la UI de Catálogo (sesión 23), la UI de
Contactos/Customers/Suppliers (sesión 24), la UI de
Comercial/Taxes/Warehouses/Pricing (sesión 25), la UI de Inventario
(sesión 26), la UI de Ventas/Pagos (sesión 27), la UI de Compras (sesión
29), la UI de POS (sesión 30), la UI de Comercio (sesión 31), la UI de
Contabilidad (sesión 32), la UI de CRM (sesión 33) y la UI de Manufactura
(sesión 34) ya están hechas e integradas (ver Completed); la UI de Files
(subida/listado/descarga) y de Notifications (bandeja/badge de no leídas)
todavía no se han construido — quedan como mejoras de UX sin dependencia
de arquitectura, a retomar si el usuario las pide o cuando un módulo de
negocio las necesite. Alcance deliberadamente diferido a fases futuras
dentro de Master Data (no bloquea el cierre de Fase 2, ver "Known
limitations" en `docs/SECURITY.md`): motor de reglas fiscales real,
resolución de lista de precios aplicable a una venta, precios de lista por
variante, asociación Warehouse↔Branch/Location, import/export masivo.
Alcance deliberadamente diferido dentro de Inventory (no bloquea el cierre
de Fase 3, ver "Known limitations" en `docs/SECURITY.md` "Inventory"):
ubicaciones/bins de bodega, lote/serie/vencimiento — su hueco de conexión
con Sales/Purchasing/POS ya cerró por completo: los tres son ahora
llamadores reales desde las sesiones 27, 29 y 30. Alcance deliberadamente
diferido dentro de Sales/Payments (no bloquea el cierre de Fase 4, ver
ADR-009 y "Known limitations" en `docs/SECURITY.md` "Sales"/"Payments"):
motor de reglas fiscales real, resolución automática de lista de precios,
número de orden/cotización legible, confirm/fulfill parcial por línea,
Invoice/Shipment, adapters de pago con credenciales reales
(Stripe/PayPal/BAC/Tilopay), verificación de webhooks, reconciliación por
timeout del proveedor, reembolso parcial. Alcance deliberadamente diferido
dentro de Purchasing (no bloquea el cierre de Fase 5, ver "Known
limitations" en `docs/SECURITY.md` "Purchasing"): Purchase Requests
(condicionado por el propio `docs/ROADMAP.md` §9 a "cuando el workflow lo
justifique", nunca cumplido), número de orden legible, impuestos en
líneas de orden, validación cruzada entre el monto de una factura de
proveedor y las líneas/recepciones de su orden, y cualquier conexión real
con Payments (accounts payable / egresos reales). Alcance deliberadamente
diferido dentro de POS (no bloquea el cierre de Fase 6, ver "Known
limitations" en `docs/SECURITY.md` "POS"): adapters de hardware real
(lector de código de barras, impresora térmica, gaveta, pantalla de
cliente — diferidos hasta que exista hardware real que validar, misma
razón ya aplicada a los payment gateways credenciados en ADR-009),
operación offline (excluida explícitamente por la "Restricción" del
propio `docs/ROADMAP.md` §10 hasta que exista un ADR sobre device
identity/ledger local/reconciliación), el límite de concurrencia
documentado sobre `RingUpSaleUseCase` bajo una carrera genuinamente
simultánea (no una reintentona secuencial, que sí está cubierta), y
número de venta/ticket legible. Alcance deliberadamente diferido dentro
de Commerce (no bloquea el cierre de 7A, ver "Known limitations" en
`docs/SECURITY.md` "Commerce"): gateway de pago credenciado (heredado de
ADR-009), cumplimiento/despacho automático, motor de promociones/
descuentos/cupones, motor de impuestos real en el lado público, ruteo
real por dominio/hostname (`Storefront.domain` es metadata puramente
informativa), autenticación/cuenta de cliente con historial de pedidos,
búsqueda más allá del listado plano de productos publicados, job de
abandono de carrito, y el mismo límite de concurrencia genuinamente
simultánea ya aceptado para POS (ADR-010), heredado por ADR-011. Alcance
deliberadamente diferido dentro de Accounting (no bloquea el cierre de
Fase 8, ver `docs/DECISIONS.md` ADR-012 y "Known limitations" en
`docs/SECURITY.md` "Accounting"): contabilización automática desde
Sales/Payments/Purchasing/Inventory — la decisión central de esta fase,
no un descuido —, Balance General/Estado de Resultados formales,
reapertura de un período fiscal cerrado, workflow de aprobación tipo
maker-checker para asientos manuales, contabilidad multi-moneda, y
funcionalidad dedicada de reconciliación bancaria. Alcance deliberadamente
diferido dentro de CRM (no bloquea el cierre de Fase 9, ver
`docs/DECISIONS.md` ADR-013 y "Known limitations" en `docs/SECURITY.md`
"CRM"): un consumidor real de eventos de Sales — la decisión central de
esta fase, no un descuido, ya que ningún módulo de este código base salvo
Tenants ha publicado jamás un evento real de dominio —, una entidad
"Team" dedicada más allá de RBAC por compañía + `ownerId`, forecasting/
pipeline ponderado por probabilidad, scoring/deduplicación de leads, e
importación masiva. Alcance deliberadamente diferido dentro de
Manufacturing (no bloquea el cierre de Fase 10, ver `docs/DECISIONS.md`
ADR-014 y "Known limitations" en `docs/SECURITY.md` "Manufacturing"):
cálculo de costos en cualquier forma — la decisión central de esta fase,
condicionada explícitamente por `docs/ROADMAP.md` §14 a "un modelo de
costeo aprobado antes de calcular costos", que nunca se ha aprobado en
este código base —, trazabilidad de lote/serie/vencimiento (heredando el
mismo hueco ya documentado de Inventory, Fase 3, en vez de construir una
versión parcial e inconsistente solo para Manufacturing), integración
contable automática (consistente con ADR-012 de Accounting), workflow de
aprobación tipo maker-checker para crear una BOM, reapertura de una orden
de producción cerrada, y un modelo de work centers/ruteo más allá de una
lista simple de pasos nombrados. Alcance deliberadamente diferido dentro
de Plugin Platform (no bloquea el cierre de Fase 11, ver
`docs/DECISIONS.md` ADR-015 y "Known limitations" en `docs/SECURITY.md`
"App Registry"): un "Plugin SDK" separado de `@erp/api-client`, rangos
SemVer/certificación de compatibilidad (cada app tiene una sola versión
todavía), un "marketplace interno" visualmente distinto de la pantalla
"Apps" ya existente, registries de contribución de frontend/backend
declarativos (el workspace sigue usando botones estáticos — ocultar UI
nunca sustituye la autorización real, ya implementada, del backend),
gatear el storefront público de Commerce sobre la habilitación de
"commerce", entitlement/facturación SaaS conectado al enablement, y
cualquier modelo de confianza real para plugins de terceros más allá del
spike ya documentado en `docs/PLUGINS.md` §16.

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

**Sesión 23 (2026-08-31, Catálogo — Fase 2)**: migración
`20260831040628_catalog_master_data` (`units_of_measure`, `categories`,
`brands`, `products`, `product_variants`) generada y **aplicada
directamente contra Postgres real** vía `prisma migrate dev` —
`prisma migrate status` confirma las 13 migraciones aplicadas sin drift.
Verificado con el servidor real reconstruido y un smoke test manual vía
HTTP: registro y provisioning con compañía real → creación real de una
unidad de medida, una categoría, una marca → creación de un producto
sellable sin variantes con `basePrice` → `GET` confirma el valor exacto
persistido → **confirmado el bug real de formato decimal** comparando la
respuesta HTTP (`"24.99"`) contra una consulta `psql` directa a la columna
`numeric(14,4)` (`24.9900`) — corregido a `.toFixed(4)` y re-verificado
(`"24.9900"` en ambos lados tras el fix y el reinicio del servidor) →
creación de un producto `hasVariants` con una variante real (`price`,
`cost`, `attributes` JSON) → **confirmado el bug real de pérdida de datos
en actualización parcial**: `PUT` de la variante enviando solo `price`
borraba `cost` a `null` — corregido con el contrato de tres estados
(omitir/`""`/valor) y re-verificado con un `PUT` que preserva `cost` al
omitirlo y otro que lo limpia enviando `""`. Aislamiento cross-company
confirmado (una categoría de otra compañía del mismo tenant rechazada) y
cross-tenant confirmado (un segundo tenant real no ve ningún registro del
primero). Toda la data de prueba fue limpiada al terminar.

**Sesión 24 (2026-08-31, Customers/Suppliers — Fase 2)**: migración
`20260831054432_customers_suppliers_master_data` (`customers`,
`suppliers`) generada y **aplicada directamente contra Postgres real** vía
`prisma migrate dev`, limpiamente al primer intento — `prisma migrate
status` confirma las 14 migraciones aplicadas sin drift. Verificado con el
servidor real reconstruido y un smoke test manual vía HTTP: registro y
provisioning con compañía real → creación real de un cliente con `taxId`/
`email` → un segundo cliente con el mismo `taxId` en la misma compañía
rechazado con `409 CUSTOMER_TAX_ID_IN_USE` real (constraint de DB, no solo
filtro de aplicación) → `PUT` real que omite `taxId` (se preserva
`"TAX-100"`) y limpia `email` vía `""` (queda `null`) → alternar estado a
`INACTIVE` real → un proveedor real creado con el **mismo** `taxId` que el
cliente, aceptado sin conflicto (tablas genuinamente separadas) →
`GET /api/v1/audit-entries` confirma las 4 entradas reales esperadas
(`customers.customer.created`/`.updated`/`.status_changed`,
`suppliers.supplier.created`) con el actor y los valores correctos. Los
datos de prueba de esta sesión permanecen en la base, por el mismo motivo
`onDelete: Restrict` de `audit_entries.user_id` ya documentado en sesiones
anteriores.

**Sesión 25 (2026-08-31, Taxes/Warehouses/Pricing — Fase 2, cierre)**:
migración `20260831170111_pricing_taxes_warehouses_master_data` (`taxes`,
`warehouses`, `price_lists`, `price_list_items`) generada y **aplicada
directamente contra Postgres real** vía `prisma migrate dev`, combinando
tres módulos en una sola migración limpiamente al primer intento —
`prisma migrate status` confirma las 15 migraciones aplicadas sin drift.
Nota operativa real durante esta sesión: Docker Desktop se detuvo antes de
poder generar esta migración (mismo patrón ya documentado en sesiones
anteriores) — reiniciado exitosamente vía
`Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"`,
los contenedores `restart: unless-stopped` se recuperaron solos una vez el
daemon volvió a estar arriba; los procesos persistentes `apps/api` y
`apps/erp-web` (pero no `apps/worker`, que sobrevivió) se cayeron
silenciosamente durante ese reinicio y fueron reconstruidos/reiniciados
antes de continuar. Verificado con el servidor real reconstruido y un
smoke test manual vía HTTP + `psql` directo: registro y provisioning con
compañía real → impuesto real creado (`IVA`, `12.0000`) → código
duplicado rechazado con `409 TAX_CODE_IN_USE` real → bodega real creada →
unidad de medida y dos productos reales creados vía Catálogo real (uno
sin variantes, uno `hasVariants`) → lista de precios real con vigencia
(`validFrom`/`validUntil`) → intento de agregar el producto `hasVariants`
real a la lista rechazado con `409
PRICE_LIST_ITEM_PRODUCT_HAS_VARIANTS` real (la primera verificación en
runtime de la dependencia cruzada real Pricing→Catalog, no un mock) →
producto inexistente rechazado con `400
PRICE_LIST_ITEM_PRODUCT_NOT_FOUND` → ítem real agregado
(`"7.9900"`) → **precisión decimal confirmada directamente contra
Postgres vía `psql`** para ambas tablas nuevas con campos monetarios
(`price_list_items.price` → `"24.5000"`, `taxes.rate` → `"12.0000"`,
ninguno recortado) → ítem actualizado (`"6.5000"`) → ítem duplicado
rechazado con `409 PRICE_LIST_ITEM_ALREADY_EXISTS` real → ítem eliminado
→ **`DELETE` real confirmado directamente contra Postgres** (`SELECT
count(*)` en 0, no solo excluido de un listado) → `GET
/api/v1/audit-entries` confirma las 12 entradas reales esperadas de la
sesión completa, en el orden cronológico inverso correcto. Los datos de
prueba de esta sesión permanecen en la base, por el mismo motivo
`onDelete: Restrict` de `audit_entries.user_id` ya documentado en sesiones
anteriores.

**Sesión 26 (2026-08-31, Inventory — Fase 3, completa)**: migración
`20260831175237_inventory_ledger` (`inventory_movements`,
`inventory_balances` con dos índices únicos parciales escritos a mano,
`inventory_transfers`, `inventory_reservations`) generada vía `prisma
migrate diff --from-config-datasource --to-schema prisma/schema.prisma
--script` (no `prisma migrate dev --create-only`, que falla en este
entorno no interactivo cuando necesita mostrar un prompt de advertencia
sobre un posible conflicto de valores duplicados en `product_variants`/
`warehouses` — ambos triviales de descartar ya que `id` ya es único
globalmente) y aplicada vía `prisma migrate deploy` — `prisma migrate
status` confirma las 16 migraciones aplicadas sin drift. **Bug real de
schema encontrado por el propio test de integración de este módulo, antes
del primer commit**: `correlation_id` se había declarado `@db.Uuid`, mismo
tipo que `tenant_id`/`warehouse_id`, pero a diferencia de esos campos
puede llegar como cualquier string arbitrario desde el header
`X-Correlation-Id` del cliente — corregido a `varchar(100)` (mismo tipo ya
usado por `audit_entries.correlation_id`/`outbox_messages.correlation_id`)
tanto en el schema como en la migración antes de compartirla, columna
alterada también en la base de desarrollo persistente vía `ALTER TABLE
... ALTER COLUMN correlation_id TYPE VARCHAR(100)`, cliente Prisma
regenerado. Verificado con el servidor real reconstruido y un smoke test
manual vía HTTP + `psql` directo: registro y provisioning con compañía
real → unidad de medida, producto y bodega reales vía Catálogo/Warehouses
reales → recepción real con decimales de 4 dígitos
(`quantity: "33.3300"`) → salida real (`"-3.3300"`) → **intento de
oversell real rechazado con `409` real** (`quantity: "999.0000"` contra
solo 30 unidades disponibles) → balance real confirma
`onHandQuantity: "30.0000"` → **precisión decimal y tipo de
`correlation_id` confirmados directamente contra Postgres vía `psql`**:
`SELECT type, quantity, correlation_id FROM inventory_movements` muestra
`"33.3300"`/`"-3.3300"` sin recorte de ceros y un `correlation_id` real
(UUID generado por el middleware en este caso, pero la columna ya acepta
cualquier string de hasta 100 caracteres) → `GET /api/v1/audit-entries`
confirma las 2 entradas reales esperadas
(`inventory.movement.receipt`/`.issue`). Además, verificado con
escritores **genuinamente concurrentes** contra el Postgres efímero de
Testcontainers (no el Docker manual, mismo nivel de realismo que el resto
de la suite de integración de este proyecto): 7 llamadas concurrentes
reales a `RecordIssueUseCase` vía `Promise.allSettled` contra 10 unidades
reales de existencia, confirmando exactamente 5 éxitos y 2 rechazos con
`InsufficientInventoryError`, saldo final `"0.0000"` — nunca negativo — y
exactamente 5 filas `ISSUE` reales en el ledger (los 2 intentos
rechazados nunca tocaron la tabla), repetido para reservas concurrentes
con el mismo resultado (`reservedQuantity: "10.0000"`, nunca negativo, sin
sobre-reservar más allá de las 10 unidades reales de existencia). Los
datos de prueba de esta sesión permanecen en la base, por el mismo motivo
`onDelete: Restrict` de `audit_entries.user_id` ya documentado en sesiones
anteriores.

**Sesión 27 (2026-08-31, Sales y Payments — Fase 4)**: migración
`20260831224651_sales_and_payments` (`quotes`, `quote_lines`,
`sales_orders`, `sales_order_lines`, `sales_returns`, `sales_return_lines`,
`payments`, más `@@unique([tenantId, id])` nuevo en `customers` y `taxes`)
generada y **aplicada directamente contra Postgres real** vía el mismo
workaround no-interactivo de `prisma migrate diff --script` ya
establecido, aplicada limpiamente al primer intento pese a combinar dos
módulos en una sola migración — `prisma migrate status` confirma las 18
migraciones aplicadas sin drift. Verificado con el servidor real
reconstruido y un smoke test manual completo vía HTTP: registro y
provisioning con compañía real → cliente, unidad de medida, producto y
bodega reales vía Customers/Catalog/Warehouses reales → recepción real de
50 unidades → orden de venta real con una línea real
(`lineTotal: "75.0000"`, 3 × 25.00, precisión decimal real confirmada) →
confirmación real (reserva real vía Inventory) → captura de pago CASH
real (`status: "CAPTURED"`) → **reintento con la misma `idempotencyKey`
confirmado devolviendo el mismo `Payment.id`** (`sameAsFirst: true`,
verificado antes y después del fix de auditoría descrito en Completed) →
despacho real (`status: "FULFILLED"`) → reembolso real
(`status: "REFUNDED"`) → `GET /api/v1/audit-entries` confirma primero 14
entradas (con el bug de auditoría duplicada todavía presente) y, tras el
fix y reinicio del servidor real, exactamente 13 entradas con una sola
`payments.payment.captured` — el bug real encontrado por este mismo smoke
test, documentado en Completed y docs/DATABASE.md "Payments table".
Adicionalmente, verificado con capturas **genuinamente concurrentes**
contra el Postgres efímero de Testcontainers (mismo nivel de realismo que
el resto de la suite de integración): 5 llamadas concurrentes reales a
`CapturePaymentUseCase.execute()` vía `Promise.allSettled` con la misma
`idempotencyKey`, confirmando las 5 resueltas con éxito, las 5 coincidiendo
en el mismo `Payment.id`, exactamente una con `wasReplayed: false` y
cuatro con `wasReplayed: true`, y exactamente una fila real en la tabla
`payments` al final. El escenario de compensación multi-línea de
`ConfirmSalesOrderUseCase` (una línea de 3 unidades reservada con éxito,
una segunda de 5 unidades fallando contra solo 4 unidades restantes) se
verificó igualmente contra el Postgres efímero de Testcontainers,
confirmando que la primera reserva quedó liberada, el saldo volvió a
estar completamente disponible, y la orden permaneció `DRAFT`. Los datos
de prueba de esta sesión permanecen en la base, por el mismo motivo
`onDelete: Restrict` de `audit_entries.user_id` ya documentado en sesiones
anteriores.

**Sesión 28 (2026-08-31, sincronización del rol Owner — segundo bug real)**:
sin migración nueva — lógica de aplicación sobre `roles`/`role_permissions`/
`permissions`, ya existentes desde la sesión 5. Verificado contra la base de
desarrollo persistente real (no solo Testcontainers) reconstruyendo y
reiniciando `apps/api` con el fix: el log real del arranque confirmó
`Owner role permission sync: 14 of 17 tenant Owner role(s) updated`,
seguido de una consulta directa (`SELECT ... role_permissions ... WHERE
tenant_id = ...`) confirmando el rol Owner del tenant real "Web Space" en
exactamente 46 de 46 permisos del catálogo, frente a los 3 de 46 medidos
antes del fix con la misma consulta. Suite de integración ampliada con un
escenario real contra Postgres efímero de Testcontainers reproduciendo el
bug exacto (rol Owner sembrado con 2 permisos reales, catálogo crecido a 4,
sync ejecutado, los 2 nuevos otorgados y el grant original preservado, un
rol no-system con el mismo nombre "Owner" nunca tocado) — 32/32 en total
(antes 31).

**Sesión 29 (2026-09-01, Purchasing — Fase 5, completa de una vez)**:
migración `20260901182240_purchasing` (`purchase_orders`,
`purchase_order_lines`, `purchase_receipts`, `purchase_receipt_lines`,
`purchase_returns`, `purchase_return_lines`, `supplier_invoices`, más la
extensión del enum `InventoryMovementReferenceType` con
`PURCHASE_ORDER`/`PURCHASE_RETURN` y `@@unique([tenantId, id])` nuevo en
`suppliers`) generada vía `prisma migrate diff --from-config-datasource
--to-schema prisma/schema.prisma --script` (mismo workaround
no-interactivo ya establecido; flag confirmado como `--to-schema`, no
`--to-schema-datamodel` como documentaban notas de sesiones anteriores —
diferencia real de la versión de Prisma de este proyecto, 7.10.0) y
aplicada vía `prisma migrate deploy` — `prisma migrate status` confirma
las 19 migraciones aplicadas sin drift. Nota operativa real durante esta
sesión: Docker Desktop se detuvo antes de poder generar esta migración
(`prisma migrate diff` falló con `P1001 Can't reach database server at
localhost:5432`, mismo patrón ya documentado en sesiones anteriores) —
reiniciado exitosamente vía la herramienta de PowerShell directamente
(no un `Bash` envolviendo `powershell.exe`, que corrompe la expansión de
`$env:LOCALAPPDATA`), los contenedores `restart: unless-stopped` se
recuperaron solos. Verificado con el servidor real reconstruido y la
suite de integración real
(`apps/api/test/integration/purchasing.integration-spec.ts`, 2 escenarios
contra Postgres real vía Testcontainers): ciclo de vida completo real
(proveedor, producto, bodega reales vía Suppliers/Catalog/Warehouses
reales → orden de compra real con línea real → confirmación real →
recepción parcial real vía `RecordReceiptUseCase` real de Inventory,
`referenceType: "PURCHASE_ORDER"` confirmado en el ledger real → intentar
cancelar una orden con recepciones reales rechazado con `409` real
(`PurchaseOrderHasReceiptsError`) → cierre real → devolución real vía
`RecordIssueUseCase` real de Inventory, `referenceType: "PURCHASE_RETURN"`
confirmado en el ledger real → factura de proveedor real → cancelación
real de la factura) y el escenario de segregación de funciones (dos
membresías reales con `RoleAssignment`/`Permission` reales distintos —
una solo con `purchasing.orders.manage`, otra solo con
`purchasing.orders.approve` — confirmando contra Postgres real que crear/
agregar líneas y confirmar/aprobar son operaciones genuinamente
independientes a nivel de permiso, el exit criteria de
`docs/ROADMAP.md` §9 verificado directamente, no solo razonado) — 34/34
en total (antes 32). Los datos de prueba de esta sesión permanecen en la
base, por el mismo motivo `onDelete: Restrict` de `audit_entries.user_id`
ya documentado en sesiones anteriores.

**Sesión 30 (2026-09-01, POS — Fase 6, completa de una vez)**: migración
`20260901194057_pos` (`pos_registers`, `pos_shifts`, `pos_cash_movements`,
`pos_sales`, `pos_returns`, más los enums nuevos `PosShiftStatus`/
`PosCashMovementType` y `@@unique([tenantId, id])` nuevo en `payments`)
generada vía el mismo workaround no-interactivo `prisma migrate diff
--from-config-datasource --to-schema prisma/schema.prisma --script` ya
establecido, aplicada vía `prisma migrate deploy` — `prisma migrate
status` confirma las 20 migraciones aplicadas sin drift. Verificado con el
servidor real reconstruido y la suite de integración real
(`apps/api/test/integration/pos.integration-spec.ts`, 2 escenarios contra
Postgres real vía Testcontainers): ciclo de vida completo real (producto y
bodega reales → turno real abierto con fondo inicial real → movimiento de
caja real → venta real en efectivo con vuelto real (`3 × 10.0000 =
30.0000`, redondeo de Postgres real sin recorte de ceros) → saldo de
inventario real verificado (`17.0000`) → devolución real sin reembolso
(goods-only) → saldo restaurado real verificado (`18.0000`) → cierre de
turno real con efectivo esperado calculado (`50 + 20 (cash-in) + 30
(venta) = 100.0000`) y coincidiendo exactamente con lo contado, varianza
`0.0000`) y el escenario de concurrencia genuina (5 llamadas reales
concurrentes a `ringUpSale` compartiendo la misma `idempotencyKey` contra
Postgres real, confirmando que las 5 resuelven con éxito, las 5 convergen
en el mismo `PosSale.id`, y existe exactamente una fila `pos_sales` al
final — el exit criteria de `docs/ROADMAP.md` §10 ("Reintentos de
terminal no duplican ventas/pagos") verificado directamente para el caso
que un terminal real produce en la práctica, con el límite de una carrera
genuinamente simultánea documentado explícitamente en vez de ocultado, ver
"Known limitations" en `docs/SECURITY.md` "POS"). Los datos de prueba de
esta sesión permanecen en la base, por el mismo motivo `onDelete:
Restrict` de `audit_entries.user_id` ya documentado en sesiones
anteriores.

**Sesión 31 (2026-09-02, Commerce — Fase 7A, motor completo)**: migración
`20260902095223_commerce` (`storefronts`, `storefront_products`, `carts`,
`cart_lines`, `commerce_orders`, más los enums nuevos `StorefrontStatus`/
`StorefrontProductStatus`/`CartStatus` y `@@unique([tenantId, paymentId])`
nuevo en `commerce_orders`, requerido por Prisma para la relación
uno-a-uno opcional desde `payments`) generada vía el mismo workaround
no-interactivo `prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --script` ya establecido, aplicada vía `prisma
migrate deploy` — `prisma migrate status` confirma las 21 migraciones
aplicadas sin drift. Verificado con el servidor real reconstruido y la
suite de integración real (`apps/api/test/integration/
commerce.integration-spec.ts`, 2 escenarios contra Postgres real vía
Testcontainers): ciclo de vida completo real (producto y bodega reales →
tienda real creada con esa bodega como predeterminada → producto
publicado real → listado público real confirmando el precio exacto →
carrito real creado → línea real agregada, precio resuelto server-side →
checkout real con referencia de transferencia, capturando un pago real
(`total: "75.0000"`, 3 × 25.0000, redondeo de Postgres real sin recorte
de ceros) → saldo de inventario real verificado — reservado, no emitido
(`onHandQuantity: "20.0000"`, `reservedQuantity: "3.0000"`) → usuario
"Storefront System" real confirmado sembrado → carrito real confirmado
`CONVERTED`) y el escenario de concurrencia genuina (5 llamadas reales
concurrentes a `checkout` compartiendo el mismo `cartId` contra Postgres
real, confirmando que las 5 resuelven con éxito, las 5 convergen en el
mismo `CommerceOrder.id`, y existe exactamente una fila `commerce_orders`
al final — el exit criteria de `docs/ROADMAP.md` §11 ("Checkout
repetido/webhook duplicado conserva exactamente un efecto") verificado
directamente, con el límite de una carrera genuinamente simultánea
heredado y documentado explícitamente vía ADR-011, no ocultado, ver
"Known limitations" en `docs/SECURITY.md` "Commerce"). Dos bugs reales
encontrados y corregidos durante la propia verificación E2E contra esta
misma infraestructura real (detallados en "Completed" arriba): DTOs
públicos sin decoradores de `class-validator` rechazados por el
`ValidationPipe` global pese a un cuerpo válido, y el controlador admin
devolviendo `productCode`/`productName` vacíos tras publicar/despublicar.
Los datos de prueba de esta sesión permanecen en la base, por el mismo
motivo `onDelete: Restrict` de `audit_entries.user_id` ya documentado en
sesiones anteriores.

**Sesión 32 (2026-09-02, Accounting — Fase 8, motor completo)**: migración
`20260902142615_accounting` (`accounts`, `fiscal_periods`,
`journal_entries`, `journal_entry_lines`, más los enums nuevos
`AccountType`/`FiscalPeriodStatus`) generada vía el mismo workaround
no-interactivo `prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --script` ya establecido, aplicada vía `prisma
migrate deploy` — `prisma migrate status` confirma las 22 migraciones
aplicadas sin drift, la primera migración de un módulo de negocio en no
tocar ninguna tabla de otro módulo (consecuencia directa de que
Accounting no tenga ninguna FK cruzada, ADR-012). Verificado con el
servidor real reconstruido y la suite de integración real
(`apps/api/test/integration/accounting.integration-spec.ts`, 3 escenarios
contra Postgres real): ciclo de vida completo real (dos cuentas y un
período fiscal reales → asiento real balanceado con precisión decimal
real confirmada, `"150.5000"` sin recorte de ceros → Balance de
Comprobación real confirmando `isBalanced: true` → cierre real del
período → intento real de contabilizar contra el período ya cerrado
rechazado con `NoOpenFiscalPeriodForDateError` real → reversión real
posteada en un período nuevo distinto, independiente del período —ya
cerrado— del original → Balance de Comprobación recalculado confirmando
el neto exacto `"0.0000"` para la cuenta de Caja) → el escenario de
rechazo real de una cuenta de otra compañía (FK-scoped, no solo un filtro
de aplicación) → y el escenario de concurrencia genuina (5 llamadas
reales concurrentes a `createJournalEntry` compartiendo la misma clave de
origen simulada `(sourceType, sourceId)` contra Postgres real,
confirmando que las 5 resuelven con éxito, las 5 convergen en el mismo
`JournalEntry.id`, y existe exactamente una fila `journal_entries` al
final — el exit criteria de `docs/ROADMAP.md` §12 ("Reprocesar source
events no duplica postings") verificado directamente para el mecanismo
en sí, aunque ningún módulo real lo invoque todavía, ver
docs/DECISIONS.md ADR-012). Un bug real de diseño encontrado y corregido
antes del primer commit (detallado en "Completed" arriba):
`reversalOfEntryId` existía desde el diseño inicial pero ningún caso de
uso lo llenaba jamás, dejándolo como código muerto permanente — corregido
antes de compartir la migración. Los datos de prueba de esta sesión
permanecen en la base, por el mismo motivo `onDelete: Restrict` de
`audit_entries.user_id` ya documentado en sesiones anteriores.

**Sesión 33 (2026-09-02, CRM — Fase 9, motor completo)**: migración
`20260902195127_crm` (`leads`, `pipelines`, `pipeline_stages`,
`opportunities`, `activities`, más los enums nuevos `LeadStatus`/
`OpportunityStatus`/`ActivityType` y `@@unique([tenantId, id])` nuevo en
`leads`/`pipelines`/`pipeline_stages`/`opportunities` — cada una consumida
por FK dentro de esta misma migración) generada vía el mismo workaround
no-interactivo `prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --script` ya establecido, aplicada vía `prisma
migrate deploy` — `prisma migrate status` confirma las 23 migraciones
aplicadas sin drift. Verificado con el servidor real reconstruido y la
suite de integración real (`apps/api/test/integration/crm.integration-spec.ts`,
3 escenarios contra Postgres real): ciclo de vida completo real (pipeline
real con dos etapas reales → prospecto real → convertido a un `Customer`
real nuevo vía el contrato público real de Customers → oportunidad real
vinculada al pipeline/etapa/prospecto/cliente, con precisión decimal real
confirmada, `"12345.6789"` sin recorte de ceros → movida a la etapa
ganadora real, confirmando `status: "WON"` y `closedAt` poblado →
actividad real relacionada con el cliente real → resumen del pipeline
real confirmando que la oportunidad ya cerrada queda excluida del monto
abierto, `totalOpenAmount: "0.0000"`) → el escenario de reutilización real
de un `Customer` ya existente por email en una segunda conversión (sin
crear un duplicado) → y el escenario de rechazo real de un cliente de
otra compañía (`CustomerNotFoundError` real, FK-scoped, no solo un filtro
de aplicación). Los datos de prueba de esta sesión permanecen en la base,
por el mismo motivo `onDelete: Restrict` de `audit_entries.user_id` ya
documentado en sesiones anteriores.

**Sesión 34 (2026-09-03, Manufacturing — Fase 10, motor completo)**:
migración `20260903032203_manufacturing` (`bill_of_materials`,
`bill_of_material_components`, `production_orders`,
`production_order_materials`, `production_order_material_movements`,
`production_order_operations`, `production_order_finished_goods_receipts`,
más los enums nuevos `ProductionOrderStatus`/
`ProductionOrderMaterialMovementType`, la extensión de
`InventoryMovementReferenceType` con `PRODUCTION_ORDER`, y
`@@unique([tenantId, id])` nuevo en `bill_of_materials`/`production_orders`
— cada una consumida por FK dentro de esta misma migración) generada vía
el mismo workaround no-interactivo `prisma migrate diff
--from-config-datasource --to-schema prisma/schema.prisma --script` ya
establecido, aplicada vía `prisma migrate deploy` — `prisma migrate
status` confirma las 24 migraciones aplicadas sin drift. **Nota
operativa real durante esta sesión**: Docker Desktop se había detenido
antes de poder correr el arnés E2E (`Error: Could not find a working
container runtime strategy`, mismo patrón ya documentado en sesiones
anteriores) — reiniciado exitosamente vía la herramienta de PowerShell
directamente (`Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker
Desktop.exe"`), el daemon quedó listo en 5 segundos. Verificado con la
suite de integración real
(`apps/api/test/integration/manufacturing.integration-spec.ts`, 3
escenarios contra Postgres real): ciclo de vida completo real (BOM real
con un componente real → orden de producción real con requerimiento
snapshoteado con precisión decimal real confirmada, `"10.0000"` = `2.5 ×
4`, sin recorte de ceros → confirmación real → emisión parcial real →
devolución parcial real → recepción parcial real de producto terminado →
intento de cancelar rechazado real con actividad ya existente → cierre
real), rechazo real de un componente de otra compañía
(`ProductNotFoundError` real, FK-scoped), y el escenario de concurrencia
genuina de 7 solicitudes de emisión de material simultáneas contra 10
unidades reales de existencia, confirmando exactamente 5 éxitos y 2
rechazos con `InsufficientInventoryError` real de Inventory — la
salvaguarda real bajo concurrencia genuina, no la suma corriente propia
de este módulo. **Bug real de fixture encontrado y corregido antes del
primer commit, por el propio test de integración**: `buildFixture()`
creaba inicialmente `otherCompanyProduct` reutilizando la unidad de
medida de la compañía principal (`unit.id`) en vez de una unidad propia
de `otherCompany`, causando `ProductUnitOfMeasureNotFoundError` real en
los 3 escenarios del archivo — corregido agregando una
`otherCompanyUnit` real y separada, mismo patrón ya establecido por
Purchasing. Verificado también con el servidor real reconstruido y el
E2E real de Playwright (`apps/e2e/tests/manufacturing.spec.ts`, corrida
limpia contra infraestructura efímera): dos productos reales (terminado
y componente) y una bodega real, recepción real de 50 unidades del
componente, BOM real, orden de producción real de 10 unidades
planificadas (requiriendo 20 del componente) → confirmación real →
emisión parcial real (8 de 20) → devolución parcial real (2 de vuelta) →
saldo del componente confirmado en `44.0000` por HTTP real (50 − 8 + 2)
→ recepción parcial real de producto terminado (3 de 10) → cierre real
con completitud parcial → saldo del producto terminado confirmado en
`3.0000` por HTTP real. Los datos de prueba de esta sesión permanecen en
la base, por el mismo motivo `onDelete: Restrict` de
`audit_entries.user_id` ya documentado en sesiones anteriores.

**Sesión 35 (2026-09-03, Plugin Platform — Fase 11, alcance
proporcional)**: sin migración nueva — reutiliza `app_definitions`/
`tenant_apps`/`app_configurations`, las tres tablas ya existentes desde
ADR-005 (sesión 22). Verificado con la suite de integración real
(`apps/api/test/integration/prisma-repositories.integration-spec.ts`, un
escenario nuevo contra Postgres real): el catálogo real completo de 15
apps (`FOUNDATION_APPS`) validado y sembrado directamente contra la base
efímera de Testcontainers, un tenant nuevo habilitando las 15 en una sola
pasada real (`EnableAllCatalogAppsUseCase`, orden de dependencias
confirmado), un segundo tenant parcialmente habilitado a mano (`catalog`/
`warehouses`) recibiendo el backfill real de exactamente lo que le
faltaba (confirmando que `catalog`/`warehouses` nunca se reportan como
"recién habilitadas" en la segunda pasada — el bug real corregido antes
del primer commit), y aislamiento cross-tenant real al deshabilitar una
app para un tenant sin afectar al otro. Verificado también con el
servidor real reconstruido y el E2E real de Playwright
(`apps/e2e/tests/app-registry.spec.ts`, reescrito por completo): las 15
apps reales confirmadas habilitadas tras un aprovisionamiento real,
rechazo real de deshabilitar "sales" con dependents reales activos
(`payments`/`pos`/`commerce`), deshabilitación real en cascada de los
tres dependents y luego de "sales" misma, y — la verificación central de
esta fase — la propia pantalla de Ventas fallando con un `403
APP_NOT_ENABLED_FOR_TENANT` real al navegar a ella con "sales"
deshabilitada, confirmado con un cliente real ya creado de antemano
(bug real de la propia escritura del E2E: sin un cliente real, la
pantalla de Ventas nunca monta la pestaña de Cotizaciones en absoluto,
así que la petición real que el test necesitaba observar nunca se
disparaba), y la pantalla restaurada tras re-habilitar "sales". Los
datos de prueba de esta sesión permanecen en la base, por el mismo
motivo `onDelete: Restrict` de `audit_entries.user_id` ya documentado en
sesiones anteriores. **Verificación adicional, la más contundente de
esta fase**: al reiniciar `apps/api` real con el build final contra la
base de desarrollo persistente (acumulada desde la sesión 1), el log
real confirmó `App catalog seeded (15 definitions)` seguido de
`Tenant app enablement sync: 31 of 31 active tenant(s) had new apps
enabled` — los 31 tenants reales acumulados a lo largo de toda esta
sesión de desarrollo recibieron el backfill real sin que ninguno
perdiera acceso a los módulos de negocio que ya estaba usando, la prueba
definitiva de que ADR-015 preserva el comportamiento previo de la
plataforma exactamente como se diseñó, no solo en un escenario sintético
de 2 tenants de prueba.
