# Work Queue

Cola única del ERP. Reemplaza el modelo histórico
`docs/tasks/FOUNDATION-00X.md` + `docs/tasks/CURRENT.md`.

Responsable: **Claude, propietario único del desarrollo del ERP**. La cola
abarca arquitectura, backend, frontend, datos, seguridad, pruebas,
infraestructura, documentación e integración; no existe una división
permanente por agente. Última actualización técnica: 2026-09-02 (sesión 31,
Fase 7A — Commerce Engine completo en un solo bloque de trabajo, a pedido
explícito del usuario; Fase 7B — Storefront Next.js delegada a un
subagente en background con el contrato público ya cerrado como
especificación). Modelo operativo actualizado: 2026-08-27.

Rama de trabajo de Claude: `ai/claude`. Fuente integrada: `develop`.
Estable/releases: `main`. La rama `ai/codex` se conserva únicamente como
historial y no tiene cola propia. Codex solo puede intervenir en una tarea
aislada y explícitamente asignada; al terminar no selecciona trabajo adicional.

---

## Backlog activo — Claude (ownership end-to-end)

### Próximo

**Fase 7A (Commerce Engine) está completa** — ver "Hecho — sesión 31"
abajo, en un solo bloque de trabajo a pedido explícito del usuario. La
Fase 7B (Storefront Next.js, `apps/storefront`) fue delegada a un
subagente en background con el contrato público de 7A —ya cerrado,
probado (unit/integración/E2E) y estable— como especificación completa;
su resultado se revisa e integra en una sesión de seguimiento inmediata.
El siguiente trabajo de backend no bloqueado es Fase 8 (Accounting) según
`docs/ROADMAP.md` §12, salvo que el usuario indique otra prioridad.
Alcance deliberadamente fuera de Fase 7A y diferido (no simulado, ver
"Known limitations" en "Commerce" de `docs/SECURITY.md`): gateway de pago
credenciado (heredado de ADR-009), cumplimiento/despacho automático
(siempre una acción posterior manual vía Sales), motor de promociones/
descuentos/cupones (no existe en ningún módulo todavía), motor de
impuestos real en el lado público, ruteo real por dominio/hostname
(`Storefront.domain` es metadata puramente informativa), autenticación/
cuenta de cliente con historial de pedidos, búsqueda más allá del listado
plano de productos publicados, job de abandono de carrito, y el límite de
concurrencia genuinamente simultánea ya aceptado para POS (ADR-010),
heredado explícitamente por ADR-011. Alcance deliberadamente fuera de
Fase 6 y diferido (no simulado, ver "Known limitations" en "POS" de
`docs/SECURITY.md`): adapters de hardware real (lector de código de
barras, impresora térmica, gaveta, pantalla de cliente — diferidos hasta
que exista hardware real que validar, misma razón ya aplicada a los
payment gateways credenciados en ADR-009), operación offline (excluida
explícitamente por la "Restricción" del propio `docs/ROADMAP.md` §10
hasta que exista un ADR sobre device identity/ledger local/
reconciliación), el límite de concurrencia documentado sobre
`RingUpSaleUseCase` bajo una carrera genuinamente simultánea (no una
reintentona secuencial, que sí está cubierta y verificada), reembolso
parcial (heredado de ADR-009), y número de venta/ticket legible. Alcance
fuera de Fase 5 y diferido, sin cambios (no simulado, ver "Known
limitations" en "Purchasing" de `docs/SECURITY.md`): Purchase Requests (el
propio `docs/ROADMAP.md` §9 las condiciona a "cuando el workflow lo
justifique", nunca cumplido), número de orden de compra legible,
impuestos en líneas de orden, validación cruzada entre el monto de una
`SupplierInvoice` y las líneas/recepciones reales de su orden, y
cualquier conexión real con Payments (cuentas por pagar / egresos reales).
Alcance fuera de Fase 4 y diferido, sin cambios (ver ADR-009 y "Known
limitations" en "Sales"/"Payments" de `docs/SECURITY.md`): un motor de
reglas fiscales real, resolución automática de lista de precios, número
de orden/cotización legible, confirm/fulfill parcial por línea, Invoice/
Shipment, adapters de pago con credenciales reales
(Stripe/PayPal/BAC/Tilopay), verificación de webhooks, reconciliación por
timeout del proveedor. Alcance fuera de Fase 3 y aún diferido, sin
cambios: ubicaciones/bins de bodega, lote/serie/vencimiento — ver "Known
limitations" en "Inventory" de `docs/SECURITY.md` (su hueco de conexión
con Sales/Purchasing/POS ya cerró por completo: los tres son ahora
llamadores reales desde las sesiones 27, 29 y 30). Alcance fuera de Fase 2
y aún diferido de sesiones previas, sin cambios: precios de lista por
variante, asociación Warehouse↔Branch/Location, e import/export masivo —
ver "Known limitations" en "Catalog", "Customers / Suppliers" y
"Taxes / Warehouses / Pricing" de `docs/SECURITY.md`.

### Hecho — sesión 30 (POS — Fase 6, completa de una vez)

Fase 6 completa en un solo bloque de trabajo, a pedido explícito del
usuario ("Continua con la fase 6 y dejala terminada de una vez"),
inmediatamente después de cerrar la Fase 5 (ver "Hecho — sesión 29"
abajo): Registers, Shifts, Cash Movements, Sales (ring-up de una venta
real vía el contrato público de Sales/Payments, idempotente por
`idempotencyKey`) y Returns (con reembolso opcional del pago original) —
los cuatro entregables de `docs/ROADMAP.md` §10, con la garantía de sus
exit criteria ("Cierres y cash movements son auditables y Decimal-safe",
"Reintentos de terminal no duplican ventas/pagos") verificada contra
Postgres real, incluyendo un límite de esa segunda garantía documentado
explícitamente en vez de ocultado.

- **`apps/api/src/modules/pos/`** (módulo nuevo, quinto bloque de negocio
  del código base, mismo layout domain/application/infrastructure/
  presentation/test-support que Sales/Purchasing): `PosRegister` (una
  caja/terminal atada a una `Warehouse`, sin la cual `RingUpSaleUseCase`
  no sabría de qué bodega descontar), `PosShift` (`OPEN → CLOSED`, a lo
  sumo un turno `OPEN` por caja a la vez — invariante de aplicación
  verificada con `PosShiftRepository.findOpenByRegister`, no un índice
  parcial), `PosCashMovement` (ledger append-only de ingresos/egresos de
  efectivo, con `reason` obligatorio), `PosSale`/`PosReturn` (registros
  propios, creados únicamente después de que el flujo real de Sales/
  Payments termina con éxito — nada se persiste para un intento que falla
  a medio camino). Tres dependencias directas y sin ciclos: Warehouses,
  Sales, Payments.
- **El primer módulo de negocio cuyo flujo de escritura principal no
  posee su propio dominio transaccional, sino que orquesta otros dos
  módulos de negocio enteramente a través de sus contratos públicos**:
  `RingUpSaleUseCase` llama a `CreateSalesOrderUseCase`/
  `AddSalesOrderLineUseCase`/`ConfirmSalesOrderUseCase`/
  `CapturePaymentUseCase`/`FulfillSalesOrderUseCase` — un `PosSale` es,
  desde el punto de vista de Sales/Payments, indistinguible de cualquier
  otro pedido `channel: "POS"` creado a través de sus propios
  controladores. Ambos módulos ganaron exports nuevos en esta sesión:
  Sales exportó `CreateSalesOrderUseCase`, `AddSalesOrderLineUseCase`,
  `CancelSalesOrderUseCase`, `FulfillSalesOrderUseCase`,
  `CreateSalesReturnUseCase` (además, `ConfirmSalesOrderUseCase` —
  exportado desde `index.ts` desde la sesión 27 pero nunca agregado al
  arreglo `exports` del propio `SalesModule` de Nest, el mismo hueco real
  que Payments tenía). Payments exportó `CapturePaymentUseCase`/
  `RefundPaymentUseCase` en su arreglo `exports` (idéntico hueco real:
  ambos ya vivían en `payments/index.ts` desde la sesión 27, pero
  `PaymentsModule` nunca los había agregado a su propio `exports`, así que
  ningún módulo externo podía inyectarlos hasta ahora).
- **Compensación real ante cualquier falla después de crear la orden**:
  `RingUpSaleUseCase` reutiliza `CancelSalesOrderUseCase` (que ya maneja
  tanto una orden `DRAFT` como una `CONFIRMED`) para deshacer inventario
  reservado ante inventario insuficiente, un `BANK_TRANSFER` rechazado por
  falta de referencia, o un `amountTendered` insuficiente — verificado con
  fixtures reales confirmando que la orden termina `CANCELLED` y ningún
  stock queda reservado en cada uno de los tres casos.
- **Límite de concurrencia documentado explícitamente, no oculto**: el
  pre-chequeo de idempotencia de `RingUpSaleUseCase` corre una sola vez,
  al inicio — cubre completamente el caso real que un terminal produce en
  la práctica (una reintentona *secuencial* tras perder la respuesta por
  timeout), pero bajo una carrera genuinamente *simultánea* cada llamador
  puede pasar el pre-chequeo antes de que cualquiera confirme, creando su
  propia `SalesOrder`/`Payment` real de forma independiente. La garantía
  que sí se sostiene y se verificó contra Postgres real con 5 llamadas
  concurrentes reales es que exactamente una fila `PosSale` sobrevive y
  todos los llamadores convergen en ella — no que solo se creó un
  `SalesOrder`. Resolverlo con un mecanismo de claim-antes-del-efecto
  (espejando el patrón del inbox, ADR-008) se dejó deliberadamente fuera
  de alcance de esta fase; ver el docstring completo de
  `RingUpSaleUseCase` y "Known limitations" en `docs/SECURITY.md` "POS".
- 10 permisos nuevos: `pos.registers.read/.manage`,
  `pos.shifts.read/.manage`, `pos.cash-movements.read/.manage`,
  `pos.sales.read/.manage`, `pos.returns.read/.manage`. Auditoría real en
  las 6 acciones de escritura (`pos.register.created/.status_changed`,
  `pos.shift.opened/.closed`, `pos.cash_movement.recorded`,
  `pos.sale.rung_up`, `pos.return.created`).
- Tablas nuevas (migración `20260901194057_pos`, **generada y aplicada
  directamente contra Postgres real** vía el mismo workaround
  no-interactivo ya establecido de `prisma migrate diff --script`,
  combinando cinco tablas nuevas, dos enums nuevos, y
  `@@unique([tenantId, id])` nuevo en `payments` —su primer consumidor de
  FK, mismo patrón ya usado por `customers`/`taxes`/`suppliers`— aplicada
  limpiamente al primer intento). Detalle completo en `docs/DATABASE.md`
  "POS tables".
- Contrato HTTP nuevo: `GET/POST /api/v1/pos/registers`,
  `PUT .../:id/status`; `GET/POST /api/v1/pos/shifts`, `GET .../:id`,
  `POST .../:id/close`, `GET/POST .../:id/cash-movements`;
  `GET/POST /api/v1/pos/sales`, `GET .../:id`;
  `GET/POST /api/v1/pos/returns`.
- **`@erp/api-client`**: ~16 tipos y 14 métodos nuevos generados desde el
  spec OpenAPI real (mismo flujo de la sesión 21), sin bugs de fidelidad
  de decoradores — todos los DTOs llevaron `type:`/`nullable:` explícitos
  desde el inicio.
- **UI** (`apps/erp-web/src/features/pos/`, ruta nueva `/pos`, botón
  "Punto de venta" en el workspace): pestañas Vender/Cajas/Ventas. **Bug
  real de diseño encontrado y corregido antes de escribir ningún test**:
  a diferencia de Purchasing/Sales, donde cada panel carga sus propios
  datos solo cuando su pestaña está activa, las cajas (`PosRegister[]`)
  se cargan una sola vez a nivel de página — la pestaña "Vender", activa
  por defecto al entrar, necesita la lista de cajas antes de que el
  usuario visite jamás la pestaña "Cajas"; el patrón perezoso-por-pestaña
  ya establecido en el resto de esta UI habría dejado el selector de caja
  vacío en el primer render. El carrito de venta reutiliza el mismo
  componente de selección de producto+variante+impuesto que Sales/
  Purchasing, sin selector de bodega — `RingUpSaleUseCase` la resuelve del
  lado del servidor a partir de la caja del turno, nunca desde la entrada
  del usuario. El ticket se imprime con `window.print()` del navegador —
  soporte real, no una simulación de una impresora térmica específica.
- **Tres colisiones potenciales de `getByText`/`getByLabel` anticipadas
  durante el propio diseño del E2E** (mismo patrón ya documentado en
  sesiones anteriores de este proyecto): se usó `{ exact: true }` de forma
  proactiva en los selectores de "Producto"/"Cantidad" del carrito desde
  el primer borrador, evitando el ciclo de prueba-y-error que otras
  sesiones necesitaron — el E2E pasó a la primera sin ninguna corrección
  posterior.
- Tests: 72 tests unitarios nuevos en `apps/api` (29 de dominio incluyendo
  la aritmética decimal propia del módulo, 40 de aplicación incluyendo el
  escenario de compensación por pago rechazado y la reacción real a un
  conflicto de idempotencia simulado, 3 de wiring del módulo) — 790 tests
  unitarios totales en `apps/api` (antes 718). Suite de integración con 2
  escenarios reales nuevos contra Postgres (`pos.integration-spec.ts`):
  ciclo de vida completo Register→Shift→RingUpSale→CashMovement→Return→
  Close con llamadas cross-module reales, y 5 solicitudes de `ringUpSale`
  genuinamente concurrentes con la misma `idempotencyKey` — 36/36 en total
  (antes 34). 1 test nuevo en `@erp/api-client` — 18/18 en total (antes
  17). 3 tests nuevos en `apps/erp-web` (`pos-page.spec.tsx`) — 45/45 en
  total (antes 42). **E2E real nuevo** (`apps/e2e/tests/pos.spec.ts`,
  Chromium vía Testcontainers): ciclo de vida completo por navegador
  real — cliente y producto reales, recepción de stock real, caja real,
  turno abierto con fondo real, venta real en efectivo con vuelto
  calculado, saldo de inventario real verificado, devolución real con
  reembolso completo, saldo restaurado verificado, cierre de turno real
  con efectivo esperado/diferencia calculados — 14/14 Playwright en total
  (antes 13).
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (790 api + 27 events + 33 notifications + 6
  worker + 18 api-client + 45 erp-web, verificado limpio en corridas
  aisladas por paquete — la corrida concurrente completa mostró fallos
  aislados por timeout bajo contención de recursos de esta sesión larga,
  mismo patrón ya documentado en sesiones anteriores, descartado con
  corridas aisladas limpias y una corrida con `--no-file-parallelism` en
  `apps/erp-web` confirmando 45/45), `pnpm --filter @erp/api
  test:integration` (36/36 contra Postgres real), `pnpm --filter @erp/e2e
  run test:e2e` (14/14 Playwright) — todo verde.

### Hecho — sesión 29 (Purchasing — Fase 5, completa de una vez)

Fase 5 completa en un solo bloque de trabajo, a pedido explícito del
usuario ("Ok, entonces continua con la fase 5 y terminala de una vez"),
inmediatamente después de resolver y verificar dos bugs reales reportados
por el usuario contra su tenant real "Web Space" (ver "Hecho — sesión 28"
y "Hecho — sesión 28 (segundo bug)" abajo): Purchase Orders con líneas,
Purchase Receipts (recepción parcial real contra una orden, conectada de
verdad a Inventory), Purchase Returns (devolución real, también conectada
a Inventory) y Supplier Invoices (registro simple, sin conciliación
automática) — los cuatro entregables de `docs/ROADMAP.md` §9, con la
garantía de sus exit criteria ("Segregación de funciones: quien crea
orden no necesariamente aprueba", "Recepciones parciales, cancelaciones y
devoluciones son trazables") verificada contra Postgres real, no solo
razonada.

- **`apps/api/src/modules/purchasing/`** (módulo nuevo, quinto bloque de
  negocio del código base, mismo layout domain/application/infrastructure/
  presentation/test-support que Sales): `PurchaseOrder`/`PurchaseOrderLine`
  (`DRAFT → CONFIRMED → CLOSED`, `CANCELLED` alcanzable solo desde
  `DRAFT`/`CONFIRMED` — nunca si ya tiene recepciones reales, ver bug real
  descrito abajo), `PurchaseReceipt`/`PurchaseReceiptLine` (registro
  append-only, sin columna de estado — una recepción es un hecho, no un
  ciclo de vida), `PurchaseReturn`/`PurchaseReturnLine` (mismo patrón
  append-only), `SupplierInvoice` (`RECORDED → CANCELLED`, valida
  `issueDate <= dueDate`, sin ninguna validación cruzada contra el monto
  real de las líneas/recepciones de su orden — ver "Known limitations").
  Cinco dependencias directas y sin ciclos: Catalog, Warehouses, Suppliers,
  Inventory (a diferencia de Sales, sin Taxes ni Pricing — una orden de
  compra en este alcance no calcula impuestos ni aplica listas de precio,
  ver "Known limitations").
- **Segregación de funciones real, no solo diseñada**: `PurchaseOrdersController`
  gatea `POST .../confirm` con el permiso `purchasing.orders.approve`,
  distinto de `purchasing.orders.manage` que gatea crear la orden y
  agregar líneas — dos permisos reales, no una sola acción "administrar"
  genérica. **Verificado contra Postgres real con dos membresías reales
  con `RoleAssignment`/`Permission` genuinamente distintos**: una
  membership con solo `purchasing.orders.manage` puede crear la orden y
  agregar la línea pero recibe `403 PERMISSION_DENIED` real al intentar
  confirmarla; una segunda membership con solo `purchasing.orders.approve`
  puede confirmar esa misma orden sin haber podido crearla — el exit
  criteria de `docs/ROADMAP.md` §9 verificado directamente contra el motor
  de permisos real, no solo razonado sobre el código.
- **`CreatePurchaseReceiptUseCase`**: valida cada línea contra la suma
  corriente de todas las `PurchaseReceiptLine` previas de esa
  `PurchaseOrderLine` (lectura de ledger, nunca un contador guardado que
  pudiera desincronizarse — mismo patrón ya usado por
  `CreateSalesReturnUseCase` en la sesión 27), y llama al
  `RecordReceiptUseCase` real de Inventory con
  `referenceType: "PURCHASE_ORDER"` — primer caller real del parámetro
  `referenceType`/`referenceId` de `RecordReceiptUseCase`, que hasta esta
  sesión siempre recibía `"MANUAL"`/`null` hardcodeado.
  `CreatePurchaseReturnUseCase` implementa la validación simétrica
  (recibido menos ya devuelto) y llama a `RecordIssueUseCase` real de
  Inventory con `referenceType: "PURCHASE_RETURN"` — ambos nuevos valores
  de `InventoryMovementReferenceType`, extendidos en esta sesión.
- **Bug real de invariante encontrado y corregido antes del primer commit
  de este módulo**: la primera versión de `CancelPurchaseOrderUseCase`
  solo verificaba el propio `status` de la orden (`DRAFT`/`CONFIRMED`)
  antes de permitir cancelar, sin comprobar si ya existían recepciones
  reales contra ella — cancelar una orden parcialmente recibida habría
  dejado inventario real ya ingresado sin ninguna orden que lo explicara.
  Corregido agregando un chequeo real contra
  `PurchaseReceiptRepository.listByPurchaseOrder` (método nuevo en el
  puerto) antes de permitir la transición, con un error nuevo
  (`PurchaseOrderHasReceiptsError`, `409`). **Verificado contra Postgres
  real** en la suite de integración: una orden con al menos una recepción
  real rechaza el intento de cancelación.
- 9 permisos nuevos: `purchasing.orders.read`, `purchasing.orders.manage`,
  `purchasing.orders.approve`, `purchasing.receipts.read/.manage`,
  `purchasing.returns.read/.manage`, `purchasing.supplier-invoices.read/
  .manage`. Auditoría real en las 9 acciones de escritura
  (`purchasing.order.created/_line.added/.confirmed/.closed/.cancelled`,
  `purchasing.receipt.created`, `purchasing.return.created`,
  `purchasing.supplier_invoice.created/.cancelled`).
- Tablas nuevas (migración `20260901182240_purchasing`, **generada y
  aplicada directamente contra Postgres real** vía el mismo workaround
  no-interactivo ya establecido de `prisma migrate diff --script`, con el
  flag confirmado como `--to-schema` en la versión actual de Prisma de
  este proyecto —no `--to-schema-datamodel`, como documentaban notas de
  sesiones anteriores—, aplicada limpiamente al primer intento):
  `purchase_orders`, `purchase_order_lines`, `purchase_receipts`,
  `purchase_receipt_lines`, `purchase_returns`, `purchase_return_lines`,
  `supplier_invoices`, más la extensión del enum
  `InventoryMovementReferenceType` y `@@unique([tenantId, id])` nuevo en
  `suppliers` (Purchasing es su primer consumidor por FK, mismo patrón ya
  usado por `customers`/`taxes` en la sesión 27). Detalle completo en
  `docs/DATABASE.md` "Purchasing tables".
- Contrato HTTP nuevo: `GET/POST /api/v1/purchasing/orders`,
  `GET/POST .../:id/lines`, `POST .../:id/confirm` (permiso `.approve`),
  `POST .../:id/close`, `POST .../:id/cancel`;
  `GET/POST /api/v1/purchasing/receipts`;
  `GET/POST /api/v1/purchasing/returns`;
  `GET/POST /api/v1/purchasing/supplier-invoices`,
  `POST .../:id/cancel`.
- **`@erp/api-client`**: ~20 tipos y ~16 métodos nuevos generados desde el
  spec OpenAPI real (mismo flujo de la sesión 21), sin bugs de fidelidad
  de decoradores — todos los DTOs llevaron `type:`/`nullable:` explícitos
  desde el inicio, la lección de la sesión 21 aplicada proactivamente.
- **UI** (`apps/erp-web/src/features/purchasing/`, ruta nueva
  `/purchasing`, botón "Compras" en el workspace): pestañas Órdenes/
  Devoluciones/Facturas de proveedor. El panel de Órdenes incluye una
  sección de recepción (`ReceivingSection`) embebida en el detalle de una
  orden confirmada, para registrar recepciones parciales línea por línea
  sin salir del detalle.
- **Tres colisiones reales de `getByText`/`getByLabel` encontradas y
  corregidas durante la propia escritura del E2E, mismo patrón ya
  documentado en sesiones anteriores de este proyecto** (`Tabs` nunca
  desmonta paneles inactivos, y ambos queries de Playwright hacen
  coincidencia de substring por defecto, no exacta): (1) el texto vacío de
  `TableEmpty` para Órdenes coincidía con un span oculto dentro del modal
  de Facturas de otro panel montado en segundo plano; (2) `getByLabel("Proveedor")`
  coincidía también con el campo "Número de factura del proveedor"; (3)
  `getByText("Registrada")` coincidía con los subtítulos de los paneles de
  Devoluciones/Facturas. Las tres corregidas con `{ exact: true }`, sin
  tocar ningún componente de producción.
- Tests: 93 tests unitarios nuevos en `apps/api` (39 de dominio, 54 de
  aplicación, incluyendo el chequeo de segregación de funciones y la
  validación de suma corriente de recepciones/devoluciones) — 717 tests
  unitarios totales en `apps/api` (antes 624). Suite de integración con 2
  escenarios reales nuevos contra Postgres
  (`purchasing.integration-spec.ts`): ciclo de vida completo Order→Confirm→
  Receipt parcial→intento de cancelar rechazado→Close→Return→
  SupplierInvoice→Cancel, y el escenario de segregación de funciones con
  `RoleAssignment`/`Permission` reales — 34/34 en total (antes 32). 3 tests
  nuevos en `apps/erp-web` (`purchasing-page.spec.tsx`). **E2E real nuevo**
  (`apps/e2e/tests/purchasing.spec.ts`, Chromium vía Testcontainers): ciclo
  de vida completo por navegador real — proveedor y producto reales,
  orden real con línea real, confirmación real, recepción parcial real,
  intento de cancelación rechazado real, cierre real, devolución real,
  factura de proveedor real y su cancelación — 13/13 Playwright en total
  (antes 12).
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps (2 errores reales de typecheck encontrados y corregidos:
  `@erp/database` sin los 7 modelos/2 enums nuevos en su lista explícita
  de re-exports, y 2 imports no usados en `@erp/api-client`), `pnpm test`
  (717 api + 27 events + 33 notifications + 6 worker + api-client + erp-web,
  verificado limpio en corridas aisladas por paquete — la corrida
  concurrente de todo el monorepo mostró fallos aislados por timeout bajo
  contención de recursos de esta sesión larga, mismo patrón ya documentado
  en sesiones anteriores, descartado con corridas aisladas limpias),
  `pnpm --filter @erp/api test:integration` (34/34 contra Postgres real),
  `pnpm --filter @erp/e2e run test:e2e` (13/13 Playwright) — todo verde.

### Hecho — sesión 28 (segundo bug real: sincronización del rol Owner)

Reportado por el usuario, con capturas de pantalla, inmediatamente después
de que el primer bug de esta sesión quedara resuelto y verificado: al
volver a intentar usar la plataforma con su tenant real "Web Space", todos
los módulos (Apps, Catálogo → Productos, y el modal "Asignar Owner" de
Roles y permisos) mostraban "No tienes permiso para realizar esta acción."

- **Causa raíz confirmada contra Postgres real antes de escribir código,
  no supuesta**: `SeedOwnerRoleUseCase` (`apps/api/src/core/access-control/
  application/use-cases/seed-owner-role.use-case.ts`) otorga al rol Owner
  de un tenant "todos los permisos que existan al momento del
  provisioning" — su propio docstring ya lo documentaba explícitamente
  como una foto fija, no una sincronización continua. `docs/SECURITY.md`
  ya tenía este hueco documentado ("No retroactive permission backfill")
  desde que RBAC se construyó (sesión 5), aceptado en su momento porque
  "sin impacto real hoy: no hay tenants de producción" — una premisa que
  dejó de sostenerse en cuanto el usuario empezó a usar un tenant real de
  forma continua a través de 23 sesiones de desarrollo de módulos nuevos.
  Una consulta directa (`SELECT count(*) FROM role_permissions WHERE
  role_id = ...`) confirmó el rol Owner de "Web Space" (aprovisionado
  2026-08-27, sesión 5, cuando el catálogo tenía 3 permisos) con
  exactamente 3 permisos otorgados, de 46 que existen hoy en el catálogo.
  El modal "Asignar Owner" degradaba a su fallback de "ingresa el ID de
  membresía manualmente" por la misma causa: `GET /api/v1/tenants/
  memberships` (permiso `tenants.memberships.read`, agregado en la sesión
  15) también fallaba con `403` para este mismo rol desactualizado —
  confirmado que es un degradado de UI intencional y correcto, no un
  segundo bug de frontend independiente.
- **`apps/api/src/core/access-control/`**: `RoleRepository.findSystemRolesByName(name)`
  nuevo — la única query genuinamente cross-tenant de este módulo,
  documentada como excepción deliberada con el mismo criterio que
  `UserRepository.findAll` (ADR-007), filtrada a `isSystem: true` para que
  un rol propio de un tenant que coincida de nombre con "Owner" nunca sea
  tocado (verificado con un test dedicado). `SyncOwnerRolePermissionsUseCase`
  nuevo: para cada rol Owner de cada tenant, calcula los permisos que le
  faltan frente al catálogo vigente y solo reescribe (`roles.save`) los
  roles genuinamente desactualizados — un rol ya sincronizado nunca
  dispara una escritura innecesaria, verificado con un test que espía
  `save()` y confirma que no se llama. `OwnerRolePermissionSyncSeeder`
  nuevo: corre en cada arranque de `apps/api`, junto a
  `PermissionCatalogSeeder` — espera explícitamente `await
  this.catalogSeeder.seed()` antes de sincronizar, en vez de confiar en el
  orden de `onModuleInit` entre dos providers del mismo módulo (la misma
  lección real del ciclo de módulos de `RolesController` encontrada en la
  sesión 5, aplicada proactivamente esta vez en vez de descubierta de
  nuevo por otro bug). `PermissionCatalogSeeder.seed()` se extrajo como
  método público invocable explícitamente (antes vivía solo dentro de
  `onModuleInit`); llamarlo dos veces en el mismo arranque es inofensivo,
  ya que el upsert del catálogo nunca borra claves existentes. Sin
  migración nueva — es lógica de aplicación sobre `roles`/
  `role_permissions`/`permissions`, tablas ya existentes desde la sesión 5.
- **Verificado contra Postgres real en el reinicio real de `apps/api` que
  llevó el fix a producción, no solo en tests**: el log del arranque real
  confirmó `Owner role permission sync: 14 of 17 tenant Owner role(s)
  updated` — evidencia directa de que esto no era un problema aislado de
  "Web Space", sino que afectaba a la gran mayoría de los tenants reales
  aprovisionados a lo largo de las 28 sesiones de este proyecto. Una
  consulta directa inmediatamente después confirmó el rol Owner de "Web
  Space" en exactamente 46 de 46 permisos del catálogo.
- Tests: 4 nuevos en `SyncOwnerRolePermissionsUseCase` (otorga los
  permisos faltantes a un rol desactualizado preservando los ya
  existentes; no reescribe un rol ya sincronizado; nunca toca un rol
  no-system que comparta el nombre "Owner"; sincroniza los roles Owner de
  varios tenants de forma independiente) + 1 en
  `OwnerRolePermissionSyncSeeder` (confirma el orden explícito
  catálogo→sincronización) — 624 tests unitarios totales en `apps/api`
  (antes 619). 1 test de integración nuevo contra Postgres real
  (`apps/api/test/integration/prisma-repositories.integration-spec.ts`,
  "syncs a real, already-provisioned tenant's stale Owner role against a
  grown permission catalog"): reproduce el escenario exacto del bug —
  rol Owner sembrado cuando el catálogo tiene 2 permisos, el catálogo
  crece a 4, se confirma que el rol todavía carece de los 2 nuevos, se
  ejecuta la sincronización, se confirma que ahora los tiene todos
  mientras conserva el grant original, y se confirma que un rol propio no
  ya-sistema con el mismo nombre "Owner" nunca se toca — 32/32 en total
  (antes 31).
- Sin cambios de frontend ni de `@erp/api-client` — el fix es enteramente
  de backend/bootstrap; la UI ya degradaba correctamente (fallback de ID
  manual) mientras el rol estuvo desactualizado, y ahora simplemente deja
  de necesitar ese fallback una vez el rol real del usuario está
  sincronizado.
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm --filter @erp/api test` (624/624), `pnpm --filter
  @erp/api test:integration` (32/32 contra Postgres real), `pnpm --filter
  @erp/e2e run test:e2e` (12/12 Playwright, corrida contra infraestructura
  efímera tras detener los servidores persistentes) — todo verde.

### Hecho — sesión 28 (bug real: descubrimiento de empresas de un tenant)

Reportado por el usuario, con capturas de pantalla, contra la
infraestructura Docker real: un tenant real ("Web Space") con una empresa
real ya provisionada mostraba "Selecciona una empresa..." en Ventas,
Inventario y Comercial, y el workspace mostraba "Empresa: Sin selección
específica" en su "Contexto activo" — pese a existir la empresa. El
usuario pidió explícitamente investigar esto **antes** de avanzar a Fase 5.

- **Causa raíz real, encontrada por lectura directa de código, no
  supuesta**: `ResolveTenantContextUseCase` (`GET /api/v1/tenants/current`)
  nunca inventa un `companyId` propio — por diseño, solo lo devuelve de
  vuelta si el llamador ya lo envió vía `X-Company-Id` (correcto para
  aislamiento cross-tenant, ver `docs/SECURITY.md` "Tenant Context HTTP
  integration"). El problema real: **no existía ningún endpoint en toda la
  plataforma para listar las empresas de un tenant**. El único lugar donde
  `companyId` se resolvía alguna vez era la respuesta directa de
  provisioning dentro de `OnboardingPage` — no había forma de recuperarlo
  después de abandonar ese flujo. `TenantListPage.openTenant()` (el otro
  punto de entrada real, "Tus espacios") llamaba `getTenantContext` sin
  ningún `companyId` y descartaba la empresa del tenant por completo.
- **`apps/api/src/core/companies/`**: `CompanyRepository.listByTenant(tenantId)`
  nuevo (Prisma + fake in-memory), `ListCompaniesUseCase` nuevo (filtra
  solo empresas `ACTIVE`, mismo criterio ya usado en el resto del código
  base). Sin migración — consulta nueva sobre `companies`, tabla ya
  existente desde Foundation.
- **`apps/api/src/core/tenants/presentation/tenants.controller.ts`**:
  `GET /api/v1/tenants/companies` nuevo, mismo `TenantContextGuard` que
  `current()` — ese guard solo exige `X-Tenant-Slug` (`X-Company-Id` es
  opcional), así que el endpoint puede llamarse antes de conocer ningún
  `companyId`, resolviendo exactamente el problema del huevo y la gallina.
  `CompanyResponseDto` nuevo (`id`, `code`, `name` — nada más de lo que un
  picker necesita).
- **`@erp/api-client`**: `CompanyResponse` + método `listCompanies` nuevos,
  regenerados desde el spec OpenAPI real del servidor reconstruido (mismo
  flujo `openapi-typescript` de la sesión 21).
- **`TenantListPage.openTenant()` reescrito**: llama `listCompanies`
  primero. Cero o una empresa resuelve de inmediato sin paso extra — el
  caso común, mismo único clic de siempre. Dos o más empresas abren un
  modal picker nuevo (reutiliza `Modal`) para que el usuario elija
  explícitamente, en vez de que el frontend adivine o el backend invente
  una "primera empresa" implícita que silenciosamente apuntara al usuario
  a datos de la empresa equivocada.
- **De paso, corregido el panel "Avance del desarrollo"** del workspace
  (`development-progress-panel.tsx`), reportado en el mismo mensaje del
  usuario: seguía mostrando datos estáticos de cuando Foundation cerró
  (sesión 22) — Master Data/Inventario/Ventas y Pagos seguían en 0% pese a
  estar formalmente cerradas (sesiones 25, 26, 27). Corregido a 100% cada
  una, "Próxima fase" actualizado a Fase 5 — Compras, y el promedio total
  recalculado automáticamente por el propio componente de 14% a 37% (no un
  valor hardcodeado aparte — cambiar los porcentajes de fase basta).
- 4 permisos/tests/DTOs nuevos, sin cambio de alcance de permisos RBAC —
  el endpoint nuevo reutiliza el mismo guard que `current()`, sin
  `PermissionGuard` adicional (mismo criterio ya usado ahí: resolver
  contexto de tenant es una operación de sesión, no una acción
  administrativa con permiso propio).
- Tests: 2 nuevos en `ListCompaniesUseCase` (filtra solo activas, lista
  vacía si el tenant no tiene empresas) — 619 tests unitarios totales en
  `apps/api` (antes 617). 1 test nuevo en `@erp/api-client`
  (`listCompanies`, confirma que no se envía `X-Company-Id`) — 16/16 en
  total (antes 15). 3 tests nuevos en `apps/erp-web`
  (`tenant-list-page.spec.tsx`, nuevo archivo): auto-selección con una sola
  empresa, continúa sin empresa si el tenant no tiene ninguna, y picker
  real con selección cuando hay varias — 39/39 en total (antes 36).
  **E2E real nuevo** (`apps/e2e/tests/onboarding.spec.ts`, segundo test del
  archivo): registro → onboarding con empresa real → sale del workspace vía
  "Cambiar espacio" → reabre el mismo tenant desde "Tus espacios" →
  confirma que el workspace ya no muestra "Sin selección específica" →
  navega a "Ventas" → confirma que NO aparece "Selecciona una empresa..."
  y que sí aparece contenido real ("Todavía no hay clientes en esta
  empresa") — la verificación directa, en navegador real contra
  infraestructura real, de que el bug reportado por el usuario está
  resuelto — 12/12 Playwright en total (antes 11). También se ajustó la
  aserción existente `aria-valuenow` del progreso total (14→37) para
  reflejar el fix del panel de avance, sin que fuera una regresión —
  cambio esperado del propio cálculo.
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps (un error real de lint encontrado y corregido: una
  variable `tenantSlug` sin usar en el nuevo test E2E), `pnpm test` (619
  api + 27 events + 33 notifications + 6 worker + 16 api-client + 39
  erp-web = 740, verificado limpio en corridas aisladas por paquete — la
  corrida concurrente de todo el monorepo mostró fallos aislados por
  timeout en `apps/erp-web` bajo contención de recursos de esta sesión
  larga, mismo patrón ya documentado en sesiones 25 y 27, descartado con
  una corrida aislada limpia de `apps/erp-web` sola: 39/39), `pnpm --filter
  @erp/api test:integration` (31/31 contra Postgres real), `pnpm --filter
  @erp/e2e run test:e2e` (12/12 Playwright) — todo verde.

### Hecho — sesión 27 (Sales y Payments — Fase 4, completa de una vez)

Fase 4 completa en un solo bloque de trabajo, a pedido explícito del
usuario ("continua con la fase 4 y terminalo todo en una sola sesión"):
Quotes/Sales Orders/lines con estados explícitos, pricing snapshot con
descuentos/impuestos/canal, reserva de inventario vía un port
transaccional real hacia Inventory, Returns como registro propio (nunca
una mutación de estado de la orden), y un módulo de Payments independiente
con captura/reembolso idempotentes — los entregables de `docs/ROADMAP.md`
§8 (4A y 4B), con las garantías de sus exit criteria ("Confirm/cancel/
return tienen invariantes y compensaciones probadas", "Duplicar request
no duplica orden, cargo ni refund") verificadas contra Postgres real, no
solo razonadas.

- **`apps/api/src/modules/sales/`** (módulo nuevo, el más transversal del
  código base hasta ahora): 6 dependencias directas y sin ciclos —
  Catalog, Warehouses, Taxes, Pricing, Customers, Inventory
  (docs/ARCHITECTURE.md §6). `Quote`/`QuoteLine` (`DRAFT` →
  `CONVERTED`/`CANCELLED`, nunca reserva inventario), `SalesOrder`/
  `SalesOrderLine` (`DRAFT` → `CONFIRMED` → `FULFILLED`, `CANCELLED`
  alcanzable solo desde `DRAFT`/`CONFIRMED` — nunca después de
  `FULFILLED`, una orden despachada se corrige con una devolución, no una
  cancelación), `SalesReturn`/`SalesReturnLine` (registro propio
  append-only, sin columna de estado). Deliberadamente **sin**
  `PENDING`/`PROCESSING`/`PARTIALLY_FULFILLED`/`REFUNDED` en
  `SalesOrderStatus` ni número de orden/cotización legible — ver ADR-009
  y docs/DATABASE.md "Sales tables" para el razonamiento completo de cada
  decisión de alcance.
- **Patrón nuevo: entidades de doble factory.** `QuoteLine`/
  `SalesOrderLine` tienen `.create()` (calcula `lineTotal` a partir de
  cantidad/precio/descuento/impuesto vía `domain/decimal.ts`, aritmética
  BigInt sin dependencias) y `.fromProps()` (confía en el valor
  persistido tal cual) — necesario porque `lineTotal` es un hecho
  histórico de lo que se cotizó/vendió, no un valor que deba
  recalcularse silenciosamente al leer si una futura regla de redondeo
  cambiara el resultado.
- **`ConfirmSalesOrderUseCase`**: implementa el patrón de transacción
  compensatoria que el exit criteria de `docs/ROADMAP.md` §8 pide
  explícitamente — reserva inventario línea por línea vía el
  `CreateReservationUseCase` real de Inventory; si una línea falla por
  stock insuficiente, libera cada reserva ya hecha en el intento actual
  antes de relanzar el error, y la orden nunca queda marcada
  `CONFIRMED`. **Verificado contra Postgres real con un escenario
  multi-línea genuino** donde la segunda línea falla de verdad: todas las
  reservas previas quedan liberadas, el saldo vuelve a estar
  completamente disponible, y la orden permanece `DRAFT`.
- **`FulfillSalesOrderUseCase`**: reutiliza los use cases ya existentes de
  Inventory (`ReleaseReservationUseCase` + `RecordIssueUseCase`, dos filas
  de ledger) en vez de inventar un tipo de movimiento combinado nuevo —
  efecto neto verificado: on-hand disminuye, reservado disminuye por la
  misma cantidad, disponible no cambia.
- **`CreateSalesReturnUseCase`**: valida cada línea contra la suma
  corriente de todas las `SalesReturnLine` previas para esa
  `SalesOrderLine` (lectura de ledger vía `listBySalesOrderLine`, nunca un
  contador guardado que pudiera desincronizarse), y postea un movimiento
  `RETURN` real por línea con `warehouseId` vía el `RecordReturnUseCase`
  real de Inventory.
- **Bug real encontrado y corregido antes del primer commit de este
  módulo**: `ConvertQuoteToSalesOrderUseCase` asignaba el `warehouseId`
  recibido a **todas** las líneas convertidas sin verificar
  `product.trackInventory`, violando la invariante que
  `ConfirmSalesOrderUseCase` asume (solo reserva cuando
  `line.warehouseId !== null`). Para un producto sin rastreo de
  inventario esto habría disparado un intento de reserva real que
  Inventory rechaza con `ProductInventoryNotTrackedError` — un error que
  el catch de compensación de `ConfirmSalesOrderUseCase` no captura (solo
  compensa `InsufficientInventoryError`), propagándose como un `500` sin
  mapear. Corregido resolviendo cada línea vía el `GetProductUseCase`
  público de Catalog y solo propagando la bodega cuando
  `product.trackInventory` es verdadero — ver docs/DATABASE.md "Sales
  tables" para el detalle completo.
- **`apps/api/src/modules/payments/`** (módulo nuevo, Fase 4B): `Payment`
  (agregado independiente de `SalesOrder`), `PaymentGateway` (puerto con
  `capture()`/`refund()` síncronos y siempre terminales — ni `CASH` ni
  `BANK_TRANSFER` tienen un paso de confirmación asíncrono que
  reconciliar), `CashPaymentGatewayAdapter` (siempre exitoso, sin
  referencia externa), `BankTransferPaymentGatewayAdapter` (exige una
  referencia de transferencia real, o falla con una razón explícita — una
  validación real, no simulada). **Deliberadamente sin ningún adapter que
  requiera credenciales** (Stripe/PayPal/etc.) — ver ADR-009 nuevo para
  el razonamiento completo: fabricar un adapter así habría violado
  MASTER_SPEC §90 más gravemente que cualquier otra simulación ya
  evitada en este código base, precisamente porque involucra dinero real.
- **Idempotencia real de `CapturePaymentUseCase`**: pre-chequeo por
  `idempotencyKey` para el caso común de reintento secuencial, y reacción
  real a `PaymentIdempotencyConflictError` (traducido desde una violación
  real de `@@unique([tenantId, companyId, idempotencyKey])` por
  `PrismaPaymentRepository`, nunca una excepción cruda de Prisma filtrada
  a través del límite de módulo) para la carrera concurrente genuina.
  **Verificado contra Postgres real con 5 capturas genuinamente
  concurrentes** con la misma `idempotencyKey`: las 5 resuelven con
  éxito, las 5 coinciden en el mismo `Payment.id`, exactamente un intento
  creó la fila (`wasReplayed: false`) y los otros 4 fueron réplicas reales
  (`wasReplayed: true`), y exactamente una fila existe en la tabla al
  final — el exit criteria de `docs/ROADMAP.md` §8 ("duplicar request no
  duplica... cargo") verificado directamente, no solo razonado.
- **Segundo bug real encontrado y corregido, esta vez por el propio smoke
  test manual contra Postgres real**: `CapturePaymentUseCase.execute()`
  devolvía el `Payment` desnudo, y `PaymentsController.capture()`
  auditaba (`payments.payment.captured`) cada llamada sin condición —
  incluyendo una que solo repetía un pago ya capturado vía el
  pre-chequeo de idempotencia. Un reintento idempotente (exactamente el
  escenario que la idempotencia existe para volver seguro) escribía una
  **segunda** entrada de auditoría para un único cargo real, sugiriendo
  falsamente en el rastro de auditoría que el pago se había capturado dos
  veces. Corregido haciendo que `execute()` devuelva
  `{ payment, wasReplayed }` y que el controller solo audite cuando
  `!wasReplayed` — re-verificado contra Postgres real: el mismo escenario
  de smoke test que antes producía 14 entradas de auditoría ahora produce
  exactamente 13, con una sola `payments.payment.captured`.
- 8 permisos nuevos: `sales.quotes.read/.manage`, `sales.orders.read/
  .manage`, `sales.returns.read/.manage`, `payments.read/.manage`.
  Auditoría real en las 9 acciones nuevas de Sales
  (`sales.quote.created/_line.added/.converted/.cancelled`,
  `sales.order.created/_line.added/.confirmed/.cancelled/.fulfilled`,
  `sales.return.created`) y 2 de Payments
  (`payments.payment.captured/.refunded`).
- Tablas nuevas (migración `20260831224651_sales_and_payments`,
  **generada y aplicada directamente contra Postgres real** vía el
  workaround no-interactivo ya establecido de `prisma migrate diff`,
  combinando ambos módulos en una sola migración, aplicada limpiamente al
  primer intento pese a agregar `@@unique([tenantId, id])` a `customers`
  y `taxes` — ninguna lo tenía antes, ya que Sales es su primer
  consumidor por FK). Detalle completo en `docs/DATABASE.md` "Sales
  tables"/"Payments table".
- Contrato HTTP nuevo: `GET/POST /api/v1/sales/quotes`,
  `GET/POST .../:id/lines`, `POST .../:id/convert`, `POST .../:id/cancel`;
  `GET/POST /api/v1/sales/orders`, `GET/POST .../:id/lines`,
  `POST .../:id/confirm`, `POST .../:id/cancel`, `POST .../:id/fulfill`;
  `GET/POST /api/v1/sales/returns`, `GET .../:id/lines`;
  `GET /api/v1/payments`, `POST /api/v1/payments/capture`,
  `POST /api/v1/payments/:id/refund`.
- **`@erp/api-client`**: ~18 tipos y ~19 métodos nuevos generados desde el
  spec OpenAPI real (mismo flujo de la sesión 21), sin bugs de fidelidad
  de decoradores esta vez — todos los DTOs de Sales/Payments llevaron
  `type:`/`nullable:` explícitos desde el inicio, la lección de la sesión
  21 aplicada proactivamente.
- **UI** (`apps/erp-web/src/features/sales/`, ruta nueva `/sales`, botón
  "Ventas" en el workspace): pestañas Cotizaciones/Pedidos/Devoluciones.
  Convertir una cotización cambia automáticamente a la pestaña Pedidos y
  abre el detalle de la orden recién creada. Los Pagos viven dentro del
  detalle de un pedido (captura + reembolso), no como su propia página de
  nivel superior, ya que un pago siempre pertenece a una orden. Reutiliza
  el componente compartido `LineTargetFields` (producto + variante +
  bodega condicional + impuesto) entre los formularios de línea de
  cotización y de pedido, replicando la misma regla de negocio de
  `ResolveSalesLineTargetUseCase` en el cliente para que la UI nunca
  ofrezca una combinación que el backend rechazaría.
- Tests: 113 tests unitarios nuevos en `apps/api` (57 de dominio, 56 de
  aplicación, incluyendo la prueba de compensación multi-línea y la
  validación de suma corriente de devoluciones) — 617 tests unitarios
  totales en `apps/api` (antes 504, sumando también los de Payments).
  Suite de integración con 2 escenarios reales nuevos contra Postgres
  (`sales.integration-spec.ts`, `payments.integration-spec.ts`): ciclo de
  vida completo Quote→SalesOrder→Confirm→Fulfill→Return con llamadas
  cross-module reales, el escenario de compensación multi-línea, captura
  BANK_TRANSFER sin referencia como fila `FAILED` real, y la carrera de
  idempotencia con 5 capturas genuinamente concurrentes — 31/31 en total
  (antes 28). 4 tests nuevos en `apps/erp-web`
  (`sales-page.spec.tsx`) — 36/36 en total (antes 32). **E2E real nuevo**
  (`apps/e2e/tests/sales.spec.ts`, Chromium vía Testcontainers): ciclo de
  vida completo por navegador real — cliente y producto reales, cotización
  → línea → conversión a pedido → confirmación (reserva real) → captura de
  pago CASH real → despacho real → saldo de inventario real verificado →
  devolución real → saldo restaurado verificado — 11/11 Playwright en
  total (antes 9).
- **Smoke test manual verificado contra Docker/Postgres real** (además de
  la suite automatizada): registro y provisioning reales → cliente,
  producto, bodega y recepción de stock reales → orden real con línea real
  (`lineTotal` con precisión decimal real confirmada) → confirmación real
  → captura de pago real con reintento idempotente confirmado
  (`sameAsFirst: true`) → despacho real → reembolso real →
  `GET /audit-entries` confirma las 13 entradas reales esperadas de la
  sesión completa (encontrando y permitiendo corregir el bug de
  duplicación de auditoría descrito arriba, antes de darlo por cerrado).
- **ADR-009** nuevo (Payment Gateway Adapters V1) ratificando el alcance
  de solo `CASH`/`BANK_TRANSFER`, sin ningún adapter con credenciales.
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (617 api + 27 events + 33 notifications + 6
  worker + 15 api-client + 36 erp-web = 734, verificado limpio en
  corridas aisladas por paquete — la corrida concurrente de todo el
  monorepo mostró fallos aislados por timeout bajo contención de recursos
  de esta sesión larga, mismo patrón ya documentado en la sesión 25,
  descartado con corridas aisladas limpias repetidas), `pnpm --filter
  @erp/api test:integration` (31/31 contra Postgres real), `pnpm --filter
  @erp/e2e test:e2e` (11/11 Playwright) — todo verde.

### Hecho — sesión 26 (Inventory — Fase 3, completa de una vez)

Fase 3 completa en un solo bloque de trabajo, a pedido explícito del
usuario ("avanza y termina toda la fase 3 de una vez"): Movement Ledger,
balances on-hand/reservado/disponible, reservas/liberaciones, ajustes y
transferencias con estado explícito — los cuatro entregables de
`docs/ROADMAP.md` §7 — con la garantía de concurrencia de sus exit
criteria ("Pruebas concurrentes no permiten oversell/reservas negativas")
verificada contra Postgres real, no solo razonada.

- **`apps/api/src/modules/inventory/`** (módulo nuevo, cuarto bloque de
  negocio del código base): `InventoryMovement` (fila de ledger
  append-only, `quantity` decimal **con signo** — el delta de saldo de
  cualquier fila es siempre exactamente su propio valor, sin columna de
  dirección separada que pudiera desincronizarse; `RECEIPT`/
  `TRANSFER_IN`/`TRANSFER_CANCELLED`/`RESERVATION` siempre positivos,
  `ISSUE`/`TRANSFER_OUT`/`RELEASE` siempre negativos, `ADJUSTMENT`
  cualquier signo pero exige `reason`), `InventoryBalance` (proyección
  reconciliable, nunca la fuente de verdad por sí misma —
  `availableQuantity = onHandQuantity - reservedQuantity` siempre
  calculado, jamás persistido; tampoco existe columna `inTransit`, es una
  consulta sobre `InventoryTransfer` con `status = IN_TRANSIT`),
  `InventoryTransfer` (`IN_TRANSIT → COMPLETED | CANCELLED`, ambos
  terminales; crear una transferencia descuenta el origen de inmediato vía
  `TRANSFER_OUT`, no es solo una "intención"), `InventoryReservation`
  (aparta existencias sin moverlas físicamente, solo libera la cantidad
  completa — sin liberación parcial en este slice).
- **El dominio nunca importa `Prisma.Decimal`** (`docs/ARCHITECTURE.md`
  §6): `domain/decimal.ts` implementa aritmética decimal exacta con
  `BigInt` escalado (4 dígitos de fracción) — primera vez que un módulo de
  este código base necesita *calcular* con decimales dentro del dominio
  (no solo validarlos/pasarlos), sin acoplarse a Prisma para lograrlo.
- **La invariante única que hace todo el módulo concurrency-safe**,
  aplicada bajo `SELECT ... FOR UPDATE` en `PrismaInventoryBalanceRepository.applyMovement`:
  `nextOnHand >= 0 AND nextReserved >= 0 AND nextOnHand >= nextReserved`.
  Un solo chequeo — no una rama por tipo de movimiento — es lo que
  previene de forma uniforme el oversell (`ISSUE`/`TRANSFER_OUT` más allá
  de lo disponible), reservas negativas, y reservar más allá de lo
  existente. **Verificado con escritores concurrentes reales contra
  Postgres real**, no solo razonado: `apps/api/test/integration/
  inventory.integration-spec.ts` dispara 7 `RecordIssueUseCase`
  concurrentes de 2 unidades cada uno contra 10 unidades reales de
  existencia, confirma exactamente 5 éxitos y 2 rechazos con
  `InsufficientInventoryError`, y el saldo final exactamente `0.0000` —
  nunca negativo —, repetido para `CreateReservationUseCase` concurrentes.
  Esta es la prueba directa del exit criteria de `docs/ROADMAP.md` §7.
- **Tracking a nivel de variante, a diferencia de Pricing**: Pricing
  (sesión 25) deliberadamente no soportó precios por variante por
  la complejidad de un índice único parcial sin caso de uso validado que
  la justificara. Para Inventory, el seguimiento a nivel de variante SÍ es
  central al valor real del módulo, así que esta vez se resolvió el
  problema correctamente: dos índices únicos parciales escritos a mano en
  la migración (`inventory_balances_variant_unique`/`_product_unique`,
  ver `docs/DATABASE.md` "Inventory tables"), ya que Postgres trata cada
  `NULL` de un índice único como distinto de otro `NULL` y un `@@unique`
  plano habría permitido que un mismo producto sin variantes acumulara
  filas de balance sin límite en una bodega.
- **Segunda dependencia genuina entre módulos de negocio** (tras
  Pricing→Catalog en sesión 25): Inventory importa `CatalogModule`
  (`GetProductUseCase` + `GetProductVariantUseCase`, este último nuevo,
  agregado al contrato público de Catalog) y `WarehousesModule`
  (`GetWarehouseUseCase`, también nuevo, agregado al contrato público de
  Warehouses) — ambas dependencias dirigidas y libres de ciclos; ni
  Catalog ni Warehouses conocen Inventory.
- **Bug real de schema encontrado y corregido por el propio test de
  integración de este módulo, antes del primer commit**:
  `InventoryMovement.correlationId` se declaró inicialmente `@db.Uuid`,
  pero `CorrelationIdMiddleware` acepta el header `X-Correlation-Id` tal
  cual lo envíe el cliente cuando existe, sin garantizar formato UUID —
  las otras dos tablas con `correlationId` (`audit_entries`,
  `outbox_messages`) ya usaban `varchar(100)`. Corregido en el propio
  schema y en la migración antes de compartirla, columna alterada también
  en la base de desarrollo persistente, cliente Prisma regenerado, y
  re-verificado.
- 7 permisos nuevos: `inventory.balances.read`,
  `inventory.movements.read`/`.manage`,
  `inventory.reservations.read`/`.manage`,
  `inventory.transfers.read`/`.manage`. Auditoría real en las 7 acciones
  de escritura (`inventory.movement.receipt`/`.issue`/`.adjustment`,
  `inventory.reservation.created`/`.released`,
  `inventory.transfer.created`/`.completed`/`.cancelled`).
- Tabla nueva (migración `20260831175237_inventory_ledger` — **generada
  vía `prisma migrate diff --script` en vez de `prisma migrate dev
  --create-only`**, que falla en este entorno no interactivo cuando
  necesita mostrar un prompt de advertencia; la técnica —diff crudo +
  directorio de migración manual + `prisma migrate deploy`— queda
  documentada como reutilizable para el mismo obstáculo en el futuro).
  Aplicada limpiamente tanto contra la base de desarrollo persistente como
  contra el Postgres efímero de Testcontainers.
- Contrato HTTP nuevo, un solo controlador (`InventoryController`, 12
  rutas bajo `/api/v1/inventory`): `GET .../balances`, `GET .../movements`,
  `POST .../movements/receipt`/`/issue`/`/adjustment`,
  `GET/POST .../reservations`, `POST .../reservations/:id/release`,
  `GET/POST .../transfers`, `POST .../transfers/:id/complete`/`/cancel`.
- **`@erp/api-client`**: ~15 tipos y 12 métodos nuevos generados desde el
  spec OpenAPI real, sin bugs de fidelidad de decoradores (todos los
  campos nullable llevaban `type: String` desde el primer borrador,
  aplicando la lección de la sesión 21 proactivamente). Nuevo helper
  privado `buildQuery()` para construir query strings multi-parámetro
  (ningún método anterior del SDK necesitaba más de un filtro opcional a
  la vez).
- **UI** (`apps/erp-web/src/features/inventory/`, ruta nueva `/inventory`,
  botón "Inventario" en el workspace): 4 pestañas (Existencias/
  Movimientos/Reservas/Transferencias) sobre `warehouses`/`products`
  cargados una sola vez a nivel de página y compartidos. Componente
  reutilizable `ProductAndVariantFields` (selector de producto +, solo si
  `hasVariants`, carga perezosa de sus variantes) compartido por los 5
  formularios que necesitan apuntar a una unidad vendible (Recepción,
  Salida, Ajuste, crear Reserva, crear Transferencia) — duplicación real
  eliminada, no una abstracción especulativa. **Dos bugs reales
  encontrados y corregidos durante la propia escritura de tests, no
  simulados**: (1) dos tests que cambiaban de pestaña con
  `getByRole` síncrono antes de que el fetch async de bodegas/productos
  resolviera — corregido a `findByRole`; (2) los paneles de Reservas/
  Transferencias recargaban la lista completa tras crear en vez de anexar
  el objeto recién creado (la convención ya establecida por
  `PriceListsPanel` y el resto del código base) — con un mock de lista
  estático esto ocultaba el ítem recién creado; corregido a append
  optimista, alineando el patrón con el resto de la UI.
- Tests: 78 tests unitarios nuevos en `apps/api` (dominio: aritmética
  BigInt, validación de signo por tipo de movimiento, transiciones de
  estado de transfer/reservation; aplicación: resolvers cross-module,
  Receipt/Issue/Adjustment incluyendo rechazo de oversell, Reservation/
  Release incluyendo rechazo de sobre-reserva, Transfer create/complete/
  cancel, los 4 casos de uso de listado) — 480 tests unitarios totales en
  `apps/api`. **2 tests de integración nuevos contra Postgres real**
  (`apps/api/test/integration/inventory.integration-spec.ts`): un
  escenario comprehensivo (round-trip decimal, tracking a nivel de
  variante, ciclo de vida completo de transferencia, aislamiento
  cross-tenant) y el escenario de concurrencia real descrito arriba — 28
  tests de integración totales (antes 26). 5 tests nuevos en
  `apps/erp-web` (`inventory-page.spec.tsx`) — 32/32 en total (antes 28).
  1 test nuevo en `@erp/api-client` (`api-client.spec.ts`, cubre los 12
  métodos + construcción de query multi-parámetro) — 14/14 en total (antes
  13). **E2E real nuevo** (`apps/e2e/tests/inventory.spec.ts`, Chromium vía
  Testcontainers): crea producto real vía Catálogo, dos bodegas reales vía
  Comercial, registra una recepción real, intenta una salida que produce
  oversell real (`409`, error visible en la UI), verifica el ledger real,
  crea y libera una reserva real (confirmando el efecto en disponible),
  crea una transferencia real y la completa (confirmando la llegada a
  destino) — 10/10 Playwright en total (antes 9), **corrida limpia contra
  la infraestructura efímera real** tras detener los servidores
  persistentes (mismo protocolo ya documentado en sesión 18).
- **Smoke test manual adicional verificado contra Docker/Postgres real**
  (además de la suite automatizada): registro y provisioning reales →
  producto, bodega y recepción reales con decimales de 4 dígitos
  (`"33.3300"`) → salida real → oversell real rechazado (`409`) → saldo
  final confirmado por HTTP (`"30.0000"`) → **precisión decimal y tipo de
  `correlation_id` confirmados directamente contra Postgres vía `psql`**
  (sin recorte de ceros, columna `varchar(100)` aceptando un valor real no
  UUID) → `GET /audit-entries` confirma las 2 entradas reales esperadas
  (`inventory.movement.receipt`/`.issue`).
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (480 api + 27 events + 33 notifications + 6
  worker + 14 api-client + 32 erp-web = 592), `pnpm --filter @erp/api
  test:integration` (28/28 contra Postgres real), `pnpm --filter @erp/e2e
  test:e2e` (10/10 Playwright, corrida limpia contra infraestructura
  efímera) — todo verde.

### Hecho — sesión 25 (Taxes, Warehouses, Pricing — Fase 2, bloque de cierre)

Tercer y último bloque de Master Data, cerrando la Fase 2 por completo.
Continuación directa de la sesión 24 dentro de la misma sesión de trabajo,
a pedido explícito del usuario ("continua con tu proximo trabajo y deja
terminada de una vez la fase 2").

- **`apps/api/src/modules/taxes/`**: `Tax` (code, name, `rate` como
  porcentaje en string decimal canónico — `"12.0000"` significa 12%,
  `numeric(7,4)` en vez de reusar `numeric(14,4)` de dinero, una elección
  deliberada ya que una tasa nunca necesita el rango de una cifra
  monetaria). Deliberadamente **no** un motor de reglas fiscales — sin
  lógica de jurisdicción, sin composición de impuestos, sin asociación a
  Product/Sales todavía (MASTER_SPEC §31 sigue diferido). Mismo layout
  domain/application/infrastructure/presentation/test-support que Catalog.
- **`apps/api/src/modules/warehouses/`**: `Warehouse` (code, name,
  addressLine, city, country, status — mismo shape de dirección plana que
  Customer/Supplier). Pertenece directamente a `Company`, **sin** columna
  `branch_id`/`location_id` — ninguna de las dos entidades existe todavía
  en el schema, así que agregar FKs nullable hacia tablas inexistentes
  habría sido scaffolding especulativo puro (MASTER_SPEC §59/§93).
- **`apps/api/src/modules/pricing/`**: `PriceList` (code, name, currency
  ISO 4217 sin validar contra una lista real, `validFrom`/`validUntil`
  como `date` civil con la invariante `validFrom <= validUntil` validada
  en el dominio — "Pricing/Price Lists con Decimal y vigencia" de
  `docs/ROADMAP.md` §6 punto 4) y `PriceListItem` (referencia únicamente a
  `Product`, nunca a `ProductVariant` — soportar precios por variante
  habría exigido un índice único parcial que Prisma no puede expresar
  declarativamente, sin caso de uso validado que lo justifique todavía;
  ver el docstring de `PriceListItem` en `schema.prisma`). Sin columna de
  estado propia: quitar un ítem es un `DELETE` real
  (`RemovePriceListItemUseCase`), no una transición de ciclo de vida.
- **Primera dependencia genuina entre módulos de negocio del código base**:
  `AddPriceListItemUseCase` (Pricing) llama a `GetProductUseCase`, un caso
  de uso nuevo agregado al contrato público de Catalog
  (`apps/api/src/modules/catalog/application/use-cases/get-product.use-case.ts`,
  exportado desde `modules/catalog/index.ts`) — no la interfaz cruda del
  repositorio, para que el módulo consumidor reciba el límite de lectura
  propio de Catalog en vez de acceso ad-hoc a su persistencia
  (`docs/ARCHITECTURE.md` §6: "module A -> public contract of module B").
  `PricingModule` importa `CatalogModule` directamente — dependencia
  dirigida y libre de ciclos, Catalog no tiene conocimiento de Pricing.
- 6 permisos nuevos: `taxes.read/.manage`, `warehouses.read/.manage`,
  `pricing.price-lists.read/.manage`. Auditoría real en las 4 acciones de
  Pricing (`pricing.price_list.created/.updated/.status_changed`,
  `pricing.price_list_item.added/.updated/.removed`) más las esperadas de
  Taxes/Warehouses.
- Tabla nueva (migración
  `20260831170111_pricing_taxes_warehouses_master_data`, **generada y
  aplicada directamente contra Postgres real** vía `prisma migrate dev`,
  aplicada limpiamente al primer intento pese a combinar tres módulos en
  una sola migración). Detalle completo en `docs/DATABASE.md`
  "Taxes / Warehouses / Pricing tables".
- Contrato HTTP nuevo: `GET/POST /api/v1/taxes`, `PUT /:id`,
  `PUT /:id/status` (mismo patrón para `/api/v1/warehouses`);
  `GET/POST /api/v1/pricing/price-lists`, `PUT /:id`, `PUT /:id/status`,
  `GET/POST /api/v1/pricing/price-lists/:id/items`,
  `PUT .../:itemId`, `DELETE .../:itemId`.
- **`@erp/api-client`**: ~20 tipos y ~19 métodos nuevos generados desde el
  spec OpenAPI real, sin bugs de fidelidad de decoradores.
- **UI** (`apps/erp-web/src/features/commercial/`, ruta nueva
  `/commercial`, botón "Comercial" en el workspace): pestañas Impuestos/
  Bodegas/Precios. A diferencia de Contactos (donde Customer/Supplier sí
  comparten un componente genérico), aquí se escribieron tres paneles
  dedicados — los tres shapes de campo son lo bastante distintos
  (impuesto: tasa; bodega: dirección; lista de precios: moneda+vigencia+
  ítems anidados) que forzarlos por un solo componente genérico habría
  exigido plumbing dinámico de campos sin ahorrar duplicación real. El
  panel de Precios incluye un modal anidado de ítems (mismo patrón que el
  modal de variantes de Catálogo), con el selector de producto filtrando
  productos `hasVariants` del lado del cliente para que el usuario nunca
  intente una combinación que el backend rechazaría.
- **Dos fallos reales de test (no de producción) encontrados y corregidos
  durante la propia escritura de tests, no simulados**: (1) `FormField`
  renderiza su `hint` dentro de la misma etiqueta `<label>` que el input,
  así que el nombre accesible de "Tasa (%)" es en realidad la
  concatenación de la etiqueta y el hint — un `getByLabelText` de
  coincidencia exacta no lo encuentra; corregido con `{ exact: false }` en
  el test, sin tocar el componente (el comportamiento de UI es correcto,
  solo la aserción del test necesitaba ajustarse). (2) "Ciudad" aparecía
  en el encabezado de columna, la celda del valor real y la etiqueta del
  campo del modal de creación (montado permanentemente por `Tabs`) a la
  vez — corregido escopando la aserción a la fila específica en vez de
  una búsqueda de texto global, mismo patrón de lección ya aplicado en
  sesiones anteriores.
- Tests: 60 tests unitarios nuevos en `apps/api` (18 dominio, 33 casos de
  uso, 3 wiring de módulo, 1 caso de uso nuevo de Catalog
  `GetProductUseCase` con su propio test, repartidos entre Taxes/
  Warehouses/Pricing) — 402 tests unitarios totales en `apps/api` (antes
  336, más las 6 aserciones nuevas en `app.module.spec.ts`). Suite de
  integración con un escenario real nuevo contra Postgres
  (`apps/api/test/integration/pricing-taxes-warehouses.integration-spec.ts`):
  unicidad real de código de impuesto, contrato de tres estados verificado
  en Warehouse contra la DB real, la dependencia cruzada real
  Pricing→Catalog (rechazo real de un producto `hasVariants` real creado
  vía el `CreateProductUseCase` real, no un fixture de prueba), round-trip
  de formato decimal verificado contra la DB real, aislamiento
  cross-tenant — 24/24 en total (antes 23). 4 tests nuevos en
  `apps/erp-web` (`commercial-page.spec.tsx`) — 28/28 en total (antes 24).
  **E2E real nuevo** (`apps/e2e/tests/commercial.spec.ts`, Chromium vía
  Testcontainers): crea un impuesto real y alterna su estado, crea una
  bodega real, navega a Catálogo para crear un producto real, vuelve a
  Comercial y crea una lista de precios real con vigencia, agrega y quita
  un ítem de precio real — todo contra el backend real con las respuestas
  HTTP verificadas, incluyendo el flujo cross-page realista (Catálogo →
  Comercial) que un usuario real seguiría — 9/9 Playwright en total (antes
  8).
- **Smoke test manual verificado contra Docker/Postgres real** (además de
  la suite automatizada): registro y provisioning reales → impuesto real
  creado, código duplicado rechazado (`409 TAX_CODE_IN_USE`) → bodega real
  creada → producto real sin variantes y producto real `hasVariants`
  creados vía Catálogo real → lista de precios real con vigencia →
  producto `hasVariants` rechazado (`409
  PRICE_LIST_ITEM_PRODUCT_HAS_VARIANTS`) → producto inexistente rechazado
  (`400 PRICE_LIST_ITEM_PRODUCT_NOT_FOUND`) → ítem real agregado,
  precisión decimal confirmada vía `psql` directo contra
  `numeric(14,4)`/`numeric(7,4)` (`"24.5000"`/`"12.0000"`, sin recorte de
  ceros) → ítem actualizado → ítem duplicado rechazado (`409
  PRICE_LIST_ITEM_ALREADY_EXISTS`) → ítem eliminado, `DELETE` real
  confirmado vía `psql` (conteo de filas en 0, no solo excluido de
  listados) → `GET /audit-entries` confirma las 12 entradas reales
  esperadas de la sesión completa en orden cronológico inverso correcto.
- **Nota operativa, no un bug de código**: Docker Desktop se detuvo entre
  el bloque de Customers/Suppliers y este (mismo patrón ya documentado en
  sesiones anteriores) — reiniciado exitosamente, los contenedores
  `restart: unless-stopped` se recuperaron solos. Los procesos
  persistentes `apps/api` y `apps/erp-web` (pero no `apps/worker`) se
  cayeron silenciosamente durante ese reinicio de Docker — reconstruidos y
  reiniciados antes de continuar.
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (402 api + 27 events + 33 notifications + 6
  worker + 13 api-client + 28 erp-web = 509), `pnpm --filter @erp/api
  test:integration` (24/24 contra Postgres real), `pnpm --filter @erp/e2e
  test:e2e` (9/9 Playwright) — todo verde. Una corrida de `pnpm test` a
  nivel de monorepo mostró un fallo aislado por timeout en
  `catalog-page.spec.tsx` bajo carga concurrente completa (contención de
  recursos, no una regresión real) — confirmado descartándolo con dos
  corridas limpias adicionales, una aislada de `apps/erp-web` y otra del
  monorepo completo, ambas 100% verdes.

### Hecho — sesión 24 (Customers, Suppliers — Fase 2, segundo bloque)

Segundo bloque de Master Data, siguiendo el orden recomendado de
`docs/ROADMAP.md` §6 (Party/Customers/Suppliers después de Units of
Measure). `Customer` y `Supplier` son módulos separados y deliberados, no
una abstracción "Party" compartida — ver el docstring sobre `model
Customer` en `schema.prisma` y `docs/DATABASE.md`/`docs/SECURITY.md` para
el razonamiento completo (hoy los campos son idénticos, pero Ventas
añadirá conceptos solo-de-cliente y Compras conceptos solo-de-proveedor
que no tienen un hogar natural compartido).

- **`apps/api/src/modules/customers/`** y **`apps/api/src/modules/suppliers/`**
  (dos módulos nuevos, mismo layout domain/application/infrastructure/
  presentation/test-support que Catalog): `Customer`/`Supplier` con code,
  name, legalName, taxId, email, phone, addressLine, city, country,
  status. El contrato de tres estados (omitir/`""`/valor) para campos
  opcionales en `UpdateCustomerUseCase`/`UpdateSupplierUseCase` se aplicó
  desde el inicio — la lección del bug real de pérdida de datos
  encontrado en Catalog (sesión 23) esta vez se aplicó proactivamente, no
  como corrección posterior a un segundo incidente.
- Unicidad real de `taxId` a nivel de base de datos
  (`@@unique([tenantId, companyId, taxId])`), aprovechando que Postgres
  permite múltiples `NULL` en un índice único — cualquier cantidad de
  clientes/proveedores sin identificación fiscal registrada coexisten sin
  conflicto; solo un valor duplicado real se rechaza. Un cliente y un
  proveedor pueden compartir el mismo `taxId` sin problema (tablas
  genuinamente separadas) — verificado contra Postgres real.
- 4 permisos nuevos: `customers.read/.manage`, `suppliers.read/.manage`.
  Auditoría real (`customers.customer.created/.updated/.status_changed`,
  `suppliers.supplier.*` equivalentes).
- Tabla nueva (migración `20260831054432_customers_suppliers_master_data`,
  **generada y aplicada directamente contra Postgres real** vía
  `prisma migrate dev`, aplicada limpiamente al primer intento — sin los
  dos ajustes de schema que Catalog necesitó). Detalle completo en
  `docs/DATABASE.md` "Customers / Suppliers tables".
- Contrato HTTP nuevo: `GET/POST /api/v1/customers`, `PUT /:id`,
  `PUT /:id/status` (mismo patrón para `/api/v1/suppliers`).
- **`@erp/api-client`**: 8 tipos y 8 métodos nuevos generados desde el spec
  OpenAPI real, sin bugs de fidelidad de decoradores esta vez (todos los
  campos nullable llevaban `type: String, nullable: true` desde el
  inicio).
- **UI** (`apps/erp-web/src/features/contacts/contacts-page.tsx`, ruta
  nueva `/contacts`, botón "Contactos" en el workspace): pestañas Clientes/
  Proveedores con un componente genérico `ContactPanel<T>` compartido — a
  diferencia del backend (dos entidades deliberadamente separadas), la UI
  es solo de presentación y no carga el mismo riesgo de divergencia de
  reglas de negocio, así que un componente genérico aquí sí evita duplicar
  un formulario de 8 campos dos veces. Incluye edición completa (no solo
  crear+alternar estado, a diferencia de los paneles simples de Catálogo)
  dado que la información de contacto/dirección de un cliente o proveedor
  real necesita poder corregirse. **Bug real encontrado y corregido antes
  de llegar a producción** (durante la propia redacción del E2E, no
  después): una singularización naïve del label plural
  (`"Proveedores".toLowerCase().replace(/s$/, "")` → `"proveedore"` en vez
  de `"proveedor"`) habría roto el botón "Nuevo proveedor" y el título del
  modal — corregido pasando un prop `singularLabel` explícito en vez de
  intentar derivarlo con una regex. Las lecciones de re-render de Catálogo
  (memoizar `load`/`create`/`update`/`setStatus` con `useCallback`,
  separar cada panel en su propio componente) se aplicaron desde el
  primer borrador, así que los 24 tests de `apps/erp-web` (incluyendo los
  3 nuevos de `contacts-page.spec.tsx`) pasaron en el primer intento, sin
  necesitar una ronda de depuración de re-render como en Catálogo.
- Tests: 32 tests unitarios nuevos en `apps/api` (12 dominio, 18 casos de
  uso, 2 wiring de módulo, repartidos entre Customer y Supplier) — 336
  tests unitarios totales en `apps/api` (antes 300, más las 4 aserciones
  nuevas en `app.module.spec.ts`). Suite de integración con un escenario
  real nuevo contra Postgres
  (`apps/api/test/integration/customers-suppliers.integration-spec.ts`):
  unicidad real de `taxId` por compañía, el mismo `taxId` permitido en una
  compañía distinta del mismo tenant, contrato de tres estados verificado
  contra la DB real, aislamiento cross-tenant, y confirmación de que
  `Customer`/`Supplier` no comparten unicidad de `taxId` entre sí — 23/23
  en total (antes 22). 3 tests nuevos en `apps/erp-web`
  (`contacts-page.spec.tsx`) — 24/24 en total (antes 21). **E2E real
  nuevo** (`apps/e2e/tests/contacts.spec.ts`, Chromium vía Testcontainers):
  crea un cliente real con taxId/email, lo edita (cambia nombre, limpia el
  taxId vía `""`), alterna su estado, crea un proveedor real — todo contra
  el backend real con las respuestas HTTP verificadas — 8/8 Playwright en
  total (antes 7).
- Documentación actualizada: `docs/DATABASE.md` ("Customers / Suppliers
  tables"), `docs/SECURITY.md` ("Customers / Suppliers", modelo de
  amenazas completo + huecos conocidos: sin Party compartido, sin campos
  de Ventas/Compras, sin validación real de país, sin dirección
  estructurada/multi-dirección, sin import/export). De paso, corregido un
  bug de documentación preexistente encontrado al revisar el schema:
  `schema.prisma`'s docstring sobre `Product` referenciaba
  "docs/DECISIONS.md ADR-009", un ADR que nunca se escribió — corregido
  para apuntar a la sección real ("Known limitations" en
  `docs/SECURITY.md` "Catalog") en vez de una referencia rota.
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (336 api + 27 events + 33 notifications + 6
  worker + 12 api-client + 24 erp-web = 438), `pnpm --filter @erp/api
  test:integration` (23/23 contra Postgres real), `pnpm --filter @erp/e2e
  test:e2e` (8/8 Playwright) — todo verde.

### Hecho — sesión 23 (Catálogo — Fase 2, primer módulo de negocio)

Primer módulo de negocio real de la plataforma (`apps/api/src/modules/`,
sibling de `core/`, nunca dentro de él — `docs/ARCHITECTURE.md` §5.3-§5.4).
Cubre Units of Measure, Categories (árbol auto-referenciado), Brands,
Products y Product Variants — el resto del alcance de Master Data
(Customers, Suppliers, Pricing, Taxes, Warehousing) queda para bloques
siguientes de la misma Fase 2, documentado explícitamente como diferido en
`docs/SECURITY.md` "Catalog" en vez de omitido en silencio.

- **`apps/api/src/modules/catalog/`** (módulo nuevo, domain/application/
  infrastructure/presentation completos): `UnitOfMeasure`/`Category`
  (árbol vía `parentId` auto-referenciado, valida no-ser-su-propio-padre)/
  `Brand` (CRUD simple, código+nombre+estado), `Product` (con las
  invariantes: un producto `hasVariants` no puede tener `basePrice`/
  `baseCost` propios; un producto vendible sin variantes SÍ requiere
  `basePrice`), `ProductVariant` (SKU único a nivel tenant, `attributes`
  JSON dinámico tipo `{"color":"Azul","talla":"M"}`, precio propio
  requerido). A diferencia de Foundation, `companyId` es **obligatorio, no
  opcional** — un producto pertenece genuinamente a una empresa, no a un
  refinamiento de alcance; `requireCompanyId(ctx)` rechaza con
  `400 COMPANY_CONTEXT_REQUIRED` cualquier request sin `X-Company-Id`.
- **Primeros campos monetarios reales del código base**
  (`Product.basePrice`/`.baseCost`, `ProductVariant.price`/`.cost`):
  representados en dominio como strings decimales canónicas (nunca
  `number` de JS, MASTER_SPEC §30/§82), validadas con `assertValidDecimal`.
  **Bug real encontrado y corregido**: `PrismaProductRepository`/
  `PrismaProductVariantRepository` usaban `.toString()` de Decimal.js, que
  recorta ceros finales (`"24.9900"` volvía como `"24.99"`, confirmado
  contra `numeric(14,4)` real vía `psql` directo) — corregido a
  `.toFixed(4)`. Detalle completo en `docs/DATABASE.md` "Catalog tables".
- **Bug real de pérdida de datos encontrado y corregido** (smoke test
  manual, no detectado por tests unitarios que siempre enviaban todos los
  campos): un `PUT` parcial (omitiendo un campo opcional) borraba ese
  campo a `null` en vez de dejarlo intacto — riesgo real para `baseCost`/
  `cost`, usados en cálculo de margen. Corregido con un contrato de tres
  estados: **omitir** el campo → sin cambios; enviarlo como **`""`** →
  limpiar a `null` explícitamente; enviar un **valor real** → reemplazar.
  DTOs relajados de `@IsNumberString()` a
  `@ValidateIf((o) => o.field !== "") @IsNumberString()` para que `""`
  pase la validación en vez de rechazarse como entrada malformada. Tests
  de regresión agregados; re-verificado contra Postgres real y un nuevo
  smoke test HTTP.
- 8 permisos nuevos: `catalog.units-of-measure.read/.manage`,
  `catalog.categories.read/.manage`, `catalog.brands.read/.manage`,
  `catalog.products.read/.manage`. Auditoría real en los 5 tipos de
  entidad (`catalog.*.created/.updated/.status_changed`).
- Tablas nuevas (migración `20260831040628_catalog_master_data`,
  **generada y aplicada directamente contra Postgres real** vía
  `prisma migrate dev`): `units_of_measure`, `categories`, `brands`,
  `products`, `product_variants` — todas con FKs compuestas
  `(tenantId, ...) → (tenantId, id)` tenant-scoped (nunca una referencia
  cruzada estructuralmente posible), uniques scoped a compañía para código/
  barcode, y un índice único real sobre una columna `jsonb`
  (`ProductVariant.attributes`) confirmado funcionando. Detalle completo
  en `docs/DATABASE.md` "Catalog tables".
- Contrato HTTP nuevo: `GET/POST /api/v1/catalog/units-of-measure`,
  `PUT .../:id`, `PUT .../:id/status` (mismo patrón para `/categories` y
  `/brands`), `GET/POST /api/v1/products`, `PUT /:id`, `PUT /:id/status`,
  `GET/POST /api/v1/products/:id/variants`, `PUT .../:variantId`,
  `PUT .../:variantId/status`.
- **`@erp/api-client`**: ~20 tipos y ~21 métodos nuevos generados desde el
  spec OpenAPI real (mismo flujo `openapi-typescript` de la sesión 21).
  **Quirk real de `openapi-typescript` documentado y resuelto**: una
  propiedad boolean con `default` en JSON-Schema se genera como no-opcional
  en TS pese a ser genuinamente opcional en la API real (confirmado
  inspeccionando el `required` del spec crudo) — `CreateProductInput` en
  `contracts.ts` corrige esto explícitamente con un `Omit<...> &
  Partial<Pick<...>>` documentado.
- **UI** (`apps/erp-web/src/features/catalog/`): `catalog-page.tsx`
  (`CatalogPage`, pestañas Unidades/Categorías/Marcas/Productos; guarda
  contra falta de `companyId` con un aviso claro; `SimpleMasterDataPanel<T>`
  genérico reutilizado por Units/Categories/Brands — excepción justificada
  a la regla anti-abstracción, ya que triplicar ~150 líneas casi idénticas
  sí sería duplicación real), `products-panel.tsx` (`ProductsPanel`, crea
  productos con selects de unidad/categoría/marca, modal de variantes con
  textarea JSON para atributos). Ruta nueva `/catalog`, botón "Catálogo" en
  el workspace.
- **Dos bugs reales de re-render encontrados y corregidos durante la
  propia verificación E2E, no simulados**:
  1. Los tres paneles `SimpleMasterDataPanel` (Unidades/Categorías/Marcas)
     usaban el mismo `id`/`name` literal (`"simple-master-data-form"`,
     `"code"`, `"name"`) — inválido en HTML cuando los tres coexisten
     montados a la vez (`Tabs` mantiene todos los paneles montados,
     comportamiento ya documentado de una sesión anterior). Corregido con
     una prop `fieldPrefix` que genera ids/names únicos por instancia.
  2. Más grave: el campo "Símbolo" (extra de Unidades) vivía como estado
     en el componente padre `CatalogPage`, así que cada tecleo re-renderizaba
     el padre y recreaba las funciones `load`/`create`/`setStatus` inline
     pasadas a los TRES paneles — como `reload` de cada panel depende de
     `load` vía `useCallback`, esto disparaba un refetch en cada tecleo, y
     el `setSymbol("")` posterior a crear disparaba un refetch final que
     **borraba el elemento recién creado** con la lista stale devuelta por
     el mock/servidor. Corregido memoizando `load`/`create`/`setStatus`
     con `useCallback` (dependencias estables, sin `symbol`) y leyendo el
     símbolo más reciente vía `useRef` en vez de clausura de estado;
     requirió extraer `CatalogWorkspace` como componente interno (los
     hooks no pueden llamarse después del `return` condicional por falta
     de `companyId` en `CatalogPage`).
  3. Un tercer bug de la misma familia, encontrado por el E2E real (no por
     los tests unitarios con mocks estáticos): `ProductsPanel` cargaba
     units/categories/brands **una sola vez al montar** — pero como `Tabs`
     monta todos los paneles desde el primer render de la página, ese
     montaje ocurre antes de que el usuario cree ninguna unidad/categoría/
     marca en sus propias pestañas, dejando los selects de "Nuevo producto"
     permanentemente vacíos (botón deshabilitado) hasta recargar la página
     completa. Corregido con el mismo patrón ya usado por `AuditPanel` de
     platform-admin (sesión 18): se sube `activeTab` al padre, se pasa
     `active={activeTab === "products"}` a `ProductsPanel`, y su efecto de
     carga se re-ejecuta cada vez que la pestaña se activa, no solo al
     montar.
- Tests: 69 tests unitarios nuevos en `apps/api` (dominio, casos de uso,
  wiring de módulo — incluye 3 tests de regresión del bug de actualización
  parcial) — 300 tests unitarios totales en `apps/api` (antes 231). Suite
  de integración con un escenario real nuevo contra Postgres
  (`apps/api/test/integration/catalog.integration-spec.ts`): 2 tenants, 2
  compañías bajo el mismo tenant, rechazo de categoría cross-company,
  producto `hasVariants` con barcode duplicado rechazado (constraint real
  de DB), SKU duplicado rechazado, round-trip de formato decimal
  verificado contra la DB real (`"24.9900"`/`"12.0000"`), aislamiento
  cross-tenant confirmado — 22/22 en total (antes 21). 2 tests nuevos en
  `apps/erp-web` (`catalog-page.spec.tsx`) — 21/21 en total (antes 19).
  **E2E real nuevo** (`apps/e2e/tests/catalog.spec.ts`, Chromium vía
  Testcontainers): crea unidad/categoría/marca reales, activa/desactiva una
  unidad, crea un producto sin variantes con precio base, crea un producto
  con variantes, agrega una variante real con atributos JSON y precio, todo
  contra el backend real con las respuestas HTTP verificadas — 7/7
  Playwright en total (antes 6).
- Documentación actualizada: `docs/DATABASE.md` ("Catalog tables", incluye
  la sección del bug de formato decimal), `docs/SECURITY.md` ("Catalog",
  modelo de amenazas completo + huecos conocidos: sin Price Lists, sin
  Kit/Bundle, sin lot/serial/expiration, sin motor de impuestos, sin
  import/export masivo, sin catálogo de atributos, ciclos de reparent
  multi-nivel no bloqueados).
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (300 api + 27 events + 33 notifications + 6
  worker + 11 api-client + 21 erp-web = 398), `pnpm --filter @erp/api
  test:integration` (22/22 contra Postgres real), `pnpm --filter @erp/e2e
  test:e2e` (7/7 Playwright) — todo verde.

### Hecho — sesión 22 (App Registry mínimo — ADR-005, cierra Foundation)

Único ítem restante de la cola original. Ver ADR-005 en `docs/DECISIONS.md`
para el razonamiento completo de alcance ("mínimo" frente al diseño total
de `docs/PLUGINS.md`).

- **`apps/api/src/core/app-registry/`** (módulo nuevo): `AppDefinition`
  (catálogo global code-owned, `key` kebab-case validado en el dominio,
  `dependsOnKeys` por clave — no por UUID, ya que el catálogo se define en
  código antes de que exista ningún UUID), `TenantApp` (enablement por
  tenant, lifecycle `ENABLED`/`DISABLED` únicamente — la máquina de estados
  completa de `docs/PLUGINS.md` §7 queda deliberadamente fuera de alcance),
  `AppConfiguration` (JSON opaco por `(tenantApp, key)`, sin catálogo propio
  — mismo criterio que `UserPreference`). `validateAppCatalog` (nueva
  función pura) rechaza claves duplicadas, dependencias a claves
  inexistentes y ciclos (incluyendo ciclos indirectos) antes de que
  `AppCatalogSeeder` escriba nada — mismo patrón fail-fast que
  `docs/PLUGINS.md` §5 exige para un manifest inválido, aplicado a un
  catálogo definido en código en vez de archivos de manifest compilados.
  `EnableAppUseCase` exige que cada dependencia declarada esté `ENABLED`
  para el tenant (idempotente: re-habilitar no falla ni duplica fila);
  `DisableAppUseCase` rechaza deshabilitar una app de la que otra app
  `ENABLED` todavía depende (`docs/PLUGINS.md` §6), y trata deshabilitar una
  app nunca habilitada como un error real (`AppNotEnabledError`), no como
  no-op — solo la re-deshabilitación de una fila ya `DISABLED` es
  idempotente. `FOUNDATION_APPS` **queda vacío en producción** — no existe
  ningún módulo de negocio real más allá del Core para registrar todavía
  (MASTER_SPEC §90, "no simular operaciones exitosas" aplicado también a no
  fabricar una app de ejemplo); el mecanismo completo se verifica con
  fixtures de prueba, nunca con datos de producción.
- Tablas nuevas (migración `20260830041057_app_registry_foundation`,
  **generada y aplicada directamente contra Postgres real** vía
  `prisma migrate dev`): `app_definitions` (PK UUID + `key` único
  VARCHAR(60), mismo patrón que `permissions`), `tenant_apps`
  (`@@unique([tenantId, appDefinitionId])`, FK real a `tenants`/
  `app_definitions`), `app_configurations` (`@@unique([tenantAppId, key])`,
  `ON DELETE CASCADE` hacia `tenant_apps` — única cascada correcta de este
  módulo, mismo razonamiento que `notification_deliveries`). 2 permisos
  nuevos en `FOUNDATION_PERMISSIONS`: `apps.read`, `apps.manage` — mismo
  hueco ya documentado de "sin backfill retroactivo" para tenants
  aprovisionados antes de este cambio.
- Contrato HTTP nuevo (`AppsController`, físicamente en
  `app-registry/presentation/`, no en `tenants/presentation/`: a diferencia
  de Roles/Audit/Notifications, `TenantsModule` nunca necesita importar
  `AppRegistryModule` — provisionar un tenant no auto-habilita ninguna app
  — así que no hay ciclo de módulos que evitar, mismo caso que
  Configuration/Files): `GET /api/v1/apps/definitions` (catálogo crudo),
  `GET /api/v1/apps` (catálogo unido al estado propio del tenant),
  `POST /api/v1/apps/:key/enable`, `POST /api/v1/apps/:key/disable`,
  `GET/PUT /api/v1/apps/:key/configuration[/:configKey]`. Auditoría real:
  `app_registry.app.enabled`/`.disabled`/`.app_configuration.changed`.
- **`@erp/api-client`**: tipos y 6 métodos nuevos derivados del spec OpenAPI
  regenerado (`listAppDefinitions`, `listTenantApps`, `enableApp`,
  `disableApp`, `listAppConfiguration`, `setAppConfiguration`) — mismo flujo
  de generación de la sesión 21, sin bugs de fidelidad de decoradores esta
  vez (los campos nullable ya llevaban `type:` explícito desde el inicio).
- **UI** (`apps/erp-web/src/features/app-registry/apps-page.tsx`, ruta
  nueva `/apps`, botón "Apps" agregado al workspace): tabla del catálogo
  unido al estado del tenant con botón Habilitar/Deshabilitar por fila.
  Estado vacío honesto ("Todavía no hay apps en el catálogo") en vez de
  datos de ejemplo — refleja la realidad de que `FOUNDATION_APPS` está
  vacío. Errores del backend (dependencia faltante, dependiente activo) se
  muestran tal cual el mensaje real de la API, sin reinterpretarlos.
  Deliberadamente **no** incluye una UI de configuración por app en este
  bloque — el SDK y el backend ya la soportan completa, pero no hay ninguna
  app real todavía cuya configuración editar; se añadirá junto con el
  primer módulo de negocio que la necesite.
- Tests: 39 tests unitarios nuevos (entidades, validador de catálogo,
  6 use cases, wiring de módulo) — 237 tests unitarios totales en
  `apps/api` (antes 198). Suite de integración ampliada con un escenario
  real contra Postgres: fixtures insertadas directamente (mismo patrón
  sancionado que el resto del proyecto), dependencia rechazada entre
  tenants reales, aislamiento cross-tenant confirmado, dependents rechazado
  y luego permitido tras deshabilitar el dependiente, configuración
  aislada por tenant y rechazada si la app no está habilitada — 21/21 en
  total (antes 20). 3 tests nuevos en `apps/erp-web`
  (`apps-page.spec.tsx`) — 19/19 en total (antes 16). **E2E real nuevo**
  (`apps/e2e/tests/app-registry.spec.ts`, Chromium vía Testcontainers):
  inserta dos apps fixture reales por SQL directo, habilita/deshabilita
  desde la UI real contra el backend real, confirma el rechazo real de
  dependencia y de dependents con sus mensajes exactos visibles en la
  pantalla — 6/6 Playwright en total (antes 5).
- **Smoke test manual contra Docker/Postgres reales** (además de la
  suite automatizada): dos apps fixture insertadas por SQL directo en la
  base de desarrollo persistente, ciclo completo habilitar/configurar/
  rechazo de dependencia/rechazo de dependents/deshabilitar verificado por
  HTTP real, auditoría real confirmada, y las fixtures + filas de
  `tenant_apps`/`app_configurations` **limpiadas al terminar** (a
  diferencia de otros smoke tests de este proyecto, aquí sí fue posible:
  ninguna de esas tres tablas tiene un `onDelete: Restrict` que lo
  impidiera, a diferencia de `audit_entries.user_id`).
- Documentación actualizada: `docs/DATABASE.md` (nueva sección App
  Registry tables), `docs/SECURITY.md` (nueva sección App Registry con
  modelo de amenazas y huecos conocidos), `docs/DECISIONS.md` (ADR-005
  ratificado), `apps/erp-web/.../development-progress-panel.tsx`
  (Foundation recalculado a 8/8 pasos de `docs/ARCHITECTURE.md` §17).
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps, `pnpm test` (237 api + 27 events + 33 notifications + 6
  worker + 10 api-client + 19 erp-web = 332), `pnpm --filter @erp/api
  test:integration` (21/21 contra Postgres real), `pnpm --filter @erp/e2e
  test:e2e` (6/6 Playwright) — todo verde.

### Hecho — sesión 21 (`@erp/api-client` generado desde OpenAPI)

- **`openapi-typescript`** (`packages/api-client`, nueva devDependency,
  `^7.9.1`, resuelta `7.13.0`): `src/generated/openapi-types.ts` se genera
  contra el spec real servido por un `apps/api` corriendo en
  `http://127.0.0.1:3000/api/docs-json` (`pnpm --filter @erp/api-client run
  generate-types`), no desde un archivo de spec offline — `NestFactory.create()`
  dispara `onModuleInit()` real (conexiones a Postgres/Redis), así que un
  script de generación "sin servidor" no sería más simple que consultar el
  dev server ya corriendo. El archivo generado **se versiona en Git**
  (documentado en `packages/api-client/README.md`, sección nueva): a
  diferencia del cliente de Prisma, regenerarlo exige un servidor HTTP vivo,
  no solo un archivo de schema, así que no hay forma de producirlo en un
  `pnpm install`/CI limpio sin levantar toda la infraestructura.
- **Dos huecos reales de documentación OpenAPI encontrados y cerrados**,
  descubiertos al inspeccionar el spec generado: `TenantsController.listMine()`
  (`GET /api/v1/tenants`) devolvía `MyTenantSummary[]` sin ningún DTO
  decorado, y `TenantsController.current()` (`GET /api/v1/tenants/current`)
  devolvía un objeto plano inline (`{ tenantId, membershipId, companyId? }`)
  — ambos, formas de respuesta reales completamente ausentes de
  `components.schemas`. Corregido con `TenantSummaryResponseDto`/
  `TenantExecutionContextResponseDto` nuevos
  (`apps/api/src/core/tenants/presentation/dto/tenant-summary-response.dto.ts`,
  patrón `fromDomain` ya usado en el resto del módulo), wireados vía
  `@ApiResponse({ type: ... })` en ambos endpoints. Sin cambio de
  comportamiento HTTP — mismos campos, mismo JSON serializado.
- **Bug real de fidelidad de decoradores Swagger encontrado y corregido en
  6 archivos de DTO**: `@ApiProperty({ nullable: true })` sin `type:`
  explícito en un campo `string | null` produce un schema vacío en el spec
  generado (`design:type` de TypeScript para una unión resuelve a `Object`,
  no a un constructor concreto — Nest/Swagger no puede inferir el tipo),
  que `openapi-typescript` traduce como `Record<string, never>` en vez de
  `string`. Mismo problema para campos `format: "date-time"` sin `type:`
  explícito. Corregido agregando `type: String` a los 14 campos afectados
  en `audit-entry-response.dto.ts` (6 campos), `notification-response.dto.ts`
  (3), `membership-response.dto.ts` (1), `file-response.dto.ts` (1),
  `setting-response.dto.ts` (1) y `role-response.dto.ts` (1). De paso, un
  bug no relacionado encontrado en el mismo archivo:
  `FileObjectResponseDto.status` seguía con `enum: ["ACTIVE", "DELETED"]`,
  sin el valor `"PURGED"` agregado en la sesión 20 — corregido. Verificado
  con `grep -c "Record<string, never>"` antes/después: quedan únicamente
  las 12 ocurrencias genuinamente irreductibles (campos de valor JSON
  dinámico: `value`, `data`, `previousValues`, `newValues`, `defaultValue`
  — OpenAPI/JSON-Schema no tiene forma honesta de expresar "cualquier valor
  JSON" salvo un schema de objeto vacío) más 2 tipos boilerplate que
  `openapi-typescript` siempre emite (`webhooks`, `$defs`).
- **`packages/api-client/src/contracts.ts` reescrito por completo**: cada
  tipo exportado ahora se deriva de `components["schemas"][...]` del
  archivo generado, en vez de mantenerse duplicado a mano. Las únicas dos
  excepciones, documentadas en la cabecera del propio archivo: los campos
  de valor JSON dinámico se sobrescriben de vuelta a `unknown` (más
  correcto que el `Record<string, never>` que emite OpenAPI), y
  `ApiErrorEnvelope` describe el filtro de excepciones HTTP global, no un
  DTO de Nest/Swagger, así que no tiene schema del que derivar. **Cero
  cambios de nombre exportado** — cada interfaz/tipo (`AuthenticatedUser`,
  `SessionResponse`, `TenantSummary`, `RoleResponse`,
  `SettingDefinitionResponse`, `MembershipResponse`, `AuditEntryResponse`,
  etc., 35 identificadores en total) se preservó exactamente, verificado
  contra un grep de todos los imports de `@erp/api-client` en
  `apps/erp-web` antes del refactor.
- Tests: sin tests nuevos — este bloque es generación de tipos y un
  refactor de `contracts.ts` que preserva la forma pública exacta, no
  lógica nueva que probar; los 9 tests existentes de `@erp/api-client` y
  los 16 de `apps/erp-web` (que consume estos tipos directamente en 4
  features) siguen pasando sin ninguna modificación de aserción.
- Validación completa: `pnpm lint`/`typecheck`/`build` limpios en los 8
  paquetes/apps del monorepo, `pnpm test` (198 api + 27 events + 33
  notifications + 6 worker + 9 api-client + 16 erp-web = 289, sin cambio),
  `pnpm --filter @erp/api test:integration` (20/20 contra Postgres real vía
  Testcontainers), `pnpm --filter @erp/e2e test:e2e` (5/5 Playwright con
  Chromium real) — todo verde. Servidor real de `apps/api` reiniciado con
  el build nuevo antes de cada regeneración del spec, para confirmar que
  `/api/docs-json` refleja los DTOs corregidos, no una copia en caché.

### Hecho — sesión 20 (purga de archivos + adapter de Email + expirar/revocar invitaciones)

Tres ítems de la cola cerrados en un solo bloque, cada uno end-to-end
(backend + SDK + UI donde aplica + tests + smoke test real).

**Purga real de storage para archivos borrados (cierra el ítem 1 original)**

- `FileObjectStatus` gana un tercer valor, `PURGED` (migración
  `20260830004924_file_purge_and_membership_expiry`, generada y **aplicada
  directamente contra Postgres real**), más una columna `purged_at` y un
  índice `(status, deleted_at)`. `FileObject.markPurged(now)` exige que el
  archivo esté `DELETED` (lanza `FileNotDeletedError` si no); la fila nunca
  se borra físicamente, solo cambia de estado, para que una entrada de
  auditoría que referencia su id siga resolviendo.
- `FileObjectRepository.findDeletedBefore(cutoff, limit)` (nuevo, Prisma +
  fake in-memory) + `PurgeDeletedFilesUseCase` (nuevo): por cada candidato,
  llama al `FileStoragePort.deleteObject` real y solo entonces marca
  `PURGED`; un fallo de storage en un archivo se loguea y no aborta el
  resto del lote (la fila sigue `DELETED` y se reintenta en el siguiente
  tick).
- `FilePurgeScheduler` (nuevo, `apps/api/src/core/files/application/`):
  mismo patrón exacto que `OutboxDispatcherScheduler` (`setInterval` +
  ciclo de vida de Nest) — corre dentro de `apps/api`, no `apps/worker`,
  deliberadamente: es el mismo punto de partida evolutivo que el propio
  dispatcher del outbox tuvo antes de su extracción (ADR-004 enmendado,
  sesión 13). `FILES_PURGE_RETENTION_DAYS` (default 30),
  `FILES_PURGE_INTERVAL_MS` (default 1h) y `FILES_PURGE_BATCH_SIZE`
  (default 100) nuevos en `EnvironmentVariables`.
- **Smoke test manual contra Docker + MinIO reales**: subida real de un
  archivo → soft-delete real vía la API → `deleted_at` adelantado 2 días
  vía `UPDATE` directo en Postgres (mismo mecanismo sancionado que
  cualquier smoke test de este proyecto) → el scheduler real (arrancado
  con `FILES_PURGE_RETENTION_DAYS=1`/`FILES_PURGE_INTERVAL_MS=5000` solo
  para esta verificación) purgó el archivo en su siguiente tick
  (`File purge: purged=1 failed=0`) → confirmado en Postgres real
  `status: PURGED` con `purged_at` poblado.

**Adapter real de Email para Notifications vía SMTP (cierra el ítem 2 original)**

- Nuevo puerto `EmailDispatcherPort` + `SmtpEmailDispatcher` en
  `@erp/notifications` (usa `nodemailer`, protocolo SMTP genérico — funciona
  con cualquier proveedor compatible: Gmail, SendGrid, Mailgun, Postmark,
  la interfaz SMTP de AWS SES, o un Mailhog/Mailpit local — este paquete
  nunca elige un SDK de proveedor específico, mismo razonamiento que
  Files/S3). `RequestNotificationUseCase` ahora inyecta
  `@Optional() EMAIL_DISPATCHER` y gana un campo `recipientEmail?` en su
  input — **deliberadamente no resuelve el email del destinatario por su
  cuenta** (el paquete sigue sin depender de Users): el llamador, que ya
  tiene el `User` en mano, lo pasa explícitamente.
- `apps/api/src/shared/email/email.module.ts` (nuevo, `@Global()`, mismo
  patrón que `PrismaModule`): provee `EMAIL_DISPATCHER` vía una factory que
  construye un `SmtpEmailDispatcher` real si `EMAIL_SMTP_HOST` está
  configurado, o `undefined` si no — el canal `EMAIL` falla cerrado con una
  razón explícita en vez de simular un envío exitoso (MASTER_SPEC §90).
  6 variables nuevas y opcionales en `EnvironmentVariables`
  (`EMAIL_SMTP_HOST/PORT/SECURE/USER/PASSWORD`, `EMAIL_FROM_ADDRESS`) — sin
  romper ningún `.env` existente.
- `MembershipsController.invite()` ahora pasa `recipientEmail` y agrega
  `EMAIL` a los canales solicitados — la invitación de membership es el
  primer productor real que se beneficia de un email de verdad, no solo
  IN_APP. `apps/worker`'s `TenantProvisionedNotificationHandler` se queda
  deliberadamente en solo `IN_APP` (resolver el email del owner cruzando el
  límite de proceso queda fuera de alcance de este bloque).
- Tests: 4 nuevos en `request-notification.use-case.spec.ts` (sin
  dispatcher configurado, sin `recipientEmail`, envío real vía un
  dispatcher fake, y fallo del dispatcher propagado como `failureReason`) —
  33 tests totales en `@erp/notifications` (antes 29).
- **Smoke test manual contra Docker real** (sin credenciales SMTP reales
  disponibles en este entorno — exactamente el estado real de
  `EMAIL_SMTP_HOST` sin configurar): invitación real a un segundo usuario
  real → `SELECT` directo sobre `notification_deliveries` confirma
  `IN_APP`/`SENT` y `EMAIL`/`FAILED` con `failure_reason: "No email adapter
  configured."` — la ruta de fallo controlado funciona de punta a punta
  contra la app real, no solo en el test unitario.

**Expirar/revocar/reinvitar invitaciones pendientes (cierra el ítem 4 original)**

- `Membership.isExpiredInvitation(now, ttlSeconds)` (usa `updatedAt` como
  "invitado en", sin columna nueva) y `Membership.reinvite()` (reabre desde
  `REVOKED` o desde `INVITED`-y-vencida, reseteando el reloj de expiración
  vía el mismo `transitionTo` que ya usan `activate`/`suspend`/`revoke`).
  `MEMBERSHIP_INVITATION_TTL_SECONDS` nuevo en `EnvironmentVariables`
  (default 7 días).
- `AcceptMembershipInvitationUseCase` rechaza una invitación vencida con
  `InvitationExpiredError` (`410 INVITATION_EXPIRED`);
  `ListPendingInvitationsUseCase` filtra las vencidas de la lista de "mis
  invitaciones pendientes" del propio invitado.
- `InviteMembershipUseCase`: una membership existente `REVOKED`, o
  `INVITED`-pero-vencida, ya no bloquea permanentemente con
  `MembershipAlreadyExistsError` — se reabre la misma fila vía `reinvite()`
  en su lugar. Cierra un hueco real que la propia sesión 15 dejó
  documentado ("no re-invitación de un `REVOKED`").
- `RevokeMembershipInvitationUseCase` (nuevo):
  `DELETE /api/v1/tenants/memberships/:id`, mismo permiso
  `tenants.memberships.manage` que invitar. Deliberadamente restringido a
  `status === "INVITED"` (nuevo error `MembershipNotInvitedError`,
  `409 MEMBERSHIP_NOT_INVITED`) aunque `Membership.revoke()` en el dominio
  acepta cualquier estado no-`REVOKED` — "revocar una invitación" y
  "remover un miembro activo" siguen siendo operaciones distintas, y solo
  la primera está expuesta hoy.
- `@erp/api-client`: `MembershipResponse`/`PendingInvitationResponse` ganan
  `expiresAt`; nuevo método `revokeMembershipInvitation`.
- **UI** (`roles-permissions-page.tsx`): columna "Expira el ..." en la
  pestaña Miembros para invitaciones pendientes, botón "Revocar" con modal
  de confirmación (`RevokeInvitationModal`, mismo patrón que
  `StatusConfirmModal` de platform-admin). **Bug real encontrado durante la
  propia verificación E2E**: el callback `onInvited` siempre hacía
  `[...current, membership]` — al reabrir una fila revocada, la UI mostraba
  la misma membership duplicada (una fila `REVOKED` y otra `INVITED`) en
  vez de actualizar la existente. Corregido con un upsert por id.
- Tests: 12 nuevos en la entidad `Membership` (spec nuevo, no existía
  antes), 3 nuevos en `InviteMembershipUseCase`, 1 en
  `AcceptMembershipInvitationUseCase`, 1 en `ListPendingInvitationsUseCase`,
  4 en `RevokeMembershipInvitationUseCase` (spec nuevo) — 198 tests
  unitarios totales en `apps/api`. Suite de integración ampliada con 3
  escenarios reales contra Postgres: revocar → rechazar aceptar/re-revocar/
  revocar-id-inexistente → reinvitar reabre la misma fila → aceptar de
  verdad; una invitación realmente vencida rechazada en accept y ausente de
  "pendientes"; purga de archivos (ver arriba) — 20 tests de integración
  totales (antes 17). **E2E real nuevo**
  (`apps/e2e/tests/membership-invitations.spec.ts`, segundo test en el
  archivo): invita → revoca desde la UI → confirma `REVOKED` y sin botón →
  reinvita → confirma que la fila se reabre (no se duplica) → un segundo
  contexto de navegador (el invitado) acepta la invitación reabierta de
  verdad.
- Documentación actualizada: `docs/SECURITY.md` (secciones "Files",
  "Notifications" y "Membership Invitations" — huecos cerrados con
  tachado, filas de amenaza nuevas), `docs/DATABASE.md` (columna/índice
  nuevos en `file_objects`).
- Validación completa: `pnpm lint`/`typecheck` limpios en los 8
  paquetes/apps, `pnpm test` (198/198 `apps/api`, 33/33
  `@erp/notifications`, 9/9 `@erp/api-client`, 16/16 `apps/erp-web`, 6/6
  `@erp/worker`), `pnpm build` (8 paquetes/apps),
  `pnpm --filter @erp/api test:integration` (20/20 contra Postgres real),
  `pnpm --filter @erp/e2e test:e2e` (5/5 Playwright, incluyendo el test
  nuevo de revocar/reinvitar) — todo verde. Nota operativa: Docker Desktop
  se había detenido entre el bloque anterior de esta sesión y este
  (mismo patrón ya documentado en sesiones previas); reiniciado antes de
  correr `test:integration`/`test:e2e`.

### Hecho — sesión 19 (Notifications conectado al Event Bus)

- **Extracción a `@erp/notifications`** (nuevo paquete compartido, mismo
  patrón que `@erp/events` en la sesión 13): `Notification`,
  `NotificationDelivery`, sus repositorios, `RequestNotificationUseCase`,
  `ListNotificationsUseCase`, `MarkNotificationReadUseCase`,
  `NotificationsModule`, y los repositorios Prisma (ahora dependen de un
  token `PRISMA_CLIENT` propio del paquete en vez de la clase concreta
  `PrismaService` de `apps/api`, satisfecho vía `useExisting` — igual que
  `@erp/events`). La presentación HTTP (`NotificationResponseDto`,
  `handleNotificationsError`) se queda en `apps/api/src/core/notifications`,
  que ahora es solo un barrel que reexporta el paquete compartido más esos
  DTOs — ningún import existente (`NotificationsController`,
  `AppModule`) tuvo que cambiar.
- **`apps/worker/src/notifications/tenant-provisioned-notification.handler.ts`**
  (nuevo): el primer consumidor de negocio real de `DomainEventBus`
  (ADR-004 punto 5 / ADR-008 "Deferred"). `OnModuleInit` se suscribe a
  `tenancy.tenant.provisioned.v1` y envuelve la llamada a
  `RequestNotificationUseCase` en `consumeIdempotently` (el inbox de
  ADR-008, `consumerName: "notifications.tenant-provisioned"`) — una
  redelivery del mismo evento no produce una segunda notificación.
- **`TenantsController.provision()` ya no conoce Notifications.** Se quitó
  la llamada directa a `RequestNotificationUseCase` y su import — la
  notificación al owner ahora es un efecto secundario genuino de que
  `tenancy.tenant.provisioned.v1` se publique y sea consumido por
  `apps/worker`, no una llamada directa disfrazada de evento (contraste con
  la invitación de membresías, que sigue siendo una llamada directa a
  propósito: ver el nuevo texto en `docs/SECURITY.md`).
- **`apps/api`/`apps/worker`** ahora proveen también el token `PRISMA_CLIENT`
  de `@erp/notifications` en su `PrismaModule` global (`apps/worker` ya
  proveía el de `@erp/events`; ahora provee ambos). 4 archivos de test de
  wiring de `apps/api` (`configuration.module.spec.ts`,
  `files.module.spec.ts`, `tenants.module.spec.ts`,
  `platform-admin.module.spec.ts`) tenían su propio `StubInfraModule` que
  solo asilaba `PrismaService` sin la derivación `useExisting` — bug real
  de test encontrado al correr la suite completa (no el test aislado),
  corregido replicando el mismo patrón que el `PrismaModule` real.
- Tests: 29 tests de notificaciones movidos verbatim a `@erp/notifications`
  (169 tests unitarios en `apps/api`, antes 198 — la resta exacta) + 6 tests
  nuevos en `apps/worker` para `TenantProvisionedNotificationHandler`
  (efecto correcto desde el payload real, redelivery sin duplicar, payload
  malformado ignorado sin lanzar, suscripción real vía `onModuleInit`).
  Suite de integración de `apps/api` ampliada con un escenario real de
  punta a punta: provisiona un tenant real, despacha el outbox real,
  confirma exactamente una `Notification` real vía los repositorios Prisma
  reales (no una réplica en memoria), y confirma que una redelivery manual
  del mismo evento no crea una segunda — 17/17 en total (antes 16).
- Smoke test manual contra la infraestructura Docker real, con los
  procesos `apps/api`/`apps/worker` persistentes reconstruidos: registro y
  provisioning reales de un tenant → confirmado en el log real de
  `apps/worker` (proceso separado de `apps/api`) el despacho
  (`claimed=1 published=1 failed=0`) → `GET /api/v1/notifications` real
  confirma la notificación `tenancy.tenant_provisioned` con el contenido
  correcto, creada enteramente por `apps/worker` sin que `apps/api`
  ejecutara ningún código de notificaciones.
- Documentación actualizada: `docs/DECISIONS.md` (ADR-008 enmendado con la
  sección "Amendment (2026-08-29) — Notifications connected as the first
  real consumer"), `docs/SECURITY.md` (sección "Notifications" actualizada:
  hueco "Not wired to the Event Bus" cerrado con tachado, nueva fila de
  amenaza describiendo el control de idempotencia real).
- Validación completa: `pnpm lint`/`typecheck` limpios en los 8
  paquetes/apps (nuevo: `@erp/notifications`), `pnpm test` (169/169
  `apps/api`, 29/29 `@erp/notifications`, 6/6 `@erp/worker` — antes 1),
  `pnpm build` (8 paquetes/apps), `pnpm --filter @erp/api test:integration`
  (17/17 contra Postgres real), `pnpm --filter @erp/e2e test:e2e` (4/4
  Playwright, con el log real del worker despachando el evento durante el
  test de onboarding) — todo verde.

### Hecho — sesión 18 (UI de administración de plataforma + `isPlatformAdmin` en el flujo de auth)

- **`isPlatformAdmin` expuesto por primera vez fuera del dominio**: hasta
  este bloque el flag vivía en `User` (sesión 16) pero ningún DTO de
  Auth lo devolvía — el frontend no tenía forma de saber si la sesión
  actual pertenecía a un platform admin. `AuthenticatedSessionResult`
  (`apps/api/src/core/auth/application/`), `LoginUseCase`,
  `RefreshSessionUseCase`, `SessionUserDto`/`SessionResponseDto` y
  `AuthController.me()` ahora incluyen `isPlatformAdmin: boolean` en su
  `user`. Sin cambio de comportamiento — el valor ya existía, solo se
  propaga; los 198 tests de `apps/api` pasan sin modificar ninguna
  aserción de negocio, solo los mocks de `User` que ya requerían el campo
  desde la sesión 16.
- **`@erp/api-client`**: `AuthenticatedUser.isPlatformAdmin` nuevo. Tipos y
  métodos nuevos para el contrato HTTP completo de `platform-admin`
  (sesión 16), sin cobertura de SDK hasta ahora: `PlatformUserResponse`,
  `SetPlatformUserStatusInput`, `PlatformSettingResponse`,
  `SetPlatformSettingValueInput`, `PlatformSettingValueResponse`,
  `AuditEntryResponse` + `listPlatformUsers`, `setPlatformUserStatus`,
  `listPlatformSettingDefinitions`, `listPlatformSettings`,
  `setPlatformSettingValue`, `listPlatformAuditEntries`. De paso,
  `listAuditEntries` (el endpoint tenant-scoped `GET /api/v1/audit-entries`
  de la sesión 9) también se cubrió — nunca había tenido método de SDK pese
  a llevar 9 sesiones implementado. 9/9 tests en `@erp/api-client` (antes 8).
- **`apps/erp-web/src/features/platform-admin/platform-admin-page.tsx`**
  (nuevo): pantalla con pestañas Usuarios/Ajustes/Actividad, ruta
  `/platform-admin` nueva en el router propio (`AppPath`/`VALID_PATHS`),
  protegida en `app.tsx` con guardia de redirección (`!session.user.isPlatformAdmin`
  → `/tenants`) además de la verificación en el punto de render. Usuarios:
  lista cross-tenant con acción deshabilitar/reactivar
  (`PUT /platform/users/:id/status`). Ajustes: solo las claves con
  `PLATFORM` en `allowedScopes`, edición vía el mismo `ValueEditor` que ya
  usaba "Ajustes" de tenant. Actividad: `GET /platform/audit-entries` con
  traducción de `action` a español (`actionLabel`). Enlace persistente
  "Plataforma" en `ProductShell` (visible solo si
  `session.user.isPlatformAdmin`, mismo patrón que el resto del header),
  añadido a las 4 páginas que ya pasaban `navigate` a su shell (Tenants,
  Roles y permisos, Workspace, Ajustes).
- **Deduplicación de UI compartida**: `LoadingRows` y el bloque completo de
  `ValueEditor`/`serializeValue`/`parseValue`/`formatValue`/`typeLabel`
  vivían solo dentro de `settings-page.tsx`; se extrajeron a
  `shared/ui/loading-rows.tsx` y `shared/ui/value-editor.tsx` (más
  `shared/format/date.ts` para `formatDateTime`, antes `formatDate` local)
  para que `platform-admin-page.tsx` y `roles-permissions-page.tsx` los
  reutilicen sin triplicar la misma lógica de edición de valor tipado.
- **Bug real encontrado durante la propia verificación E2E, no simulado**:
  `Tabs` (`shared/ui/tabs.tsx`) mantiene los tres paneles montados
  permanentemente y solo alterna el atributo `hidden` — nunca desmonta ni
  remonta el panel inactivo. El `useEffect` original de `AuditPanel` corría
  una sola vez al montar la página completa, así que deshabilitar un
  usuario o cambiar un setting PLATFORM en otra pestaña nunca aparecía en
  "Actividad" sin recargar la página entera. Corregido subiendo el estado
  `activeTab` a `PlatformAdminPage` (`Tabs` ahora es controlado vía
  `value`/`onValueChange`) y haciendo que `AuditPanel` reciba `active` y
  vuelva a pedir datos cada vez que la pestaña se activa, no solo en el
  montaje inicial.
- **E2E real** (`apps/e2e/tests/platform-admin.spec.ts`, Chromium vía
  Testcontainers): cubre login como platform admin (confirmando
  `isPlatformAdmin: true` en la respuesta real de `POST /auth/login`),
  deshabilitar un usuario objetivo desde la UI, confirmar que su siguiente
  intento de login real es rechazado (`403 ACCOUNT_DISABLED`),
  reactivarlo, editar `localization.currency` a nivel PLATFORM desde la UI
  y confirmar que la fila pasa a mostrar `PLATFORM` como origen, y revisar
  la pestaña Actividad confirmando que tanto el cambio de setting como el
  cambio de estado de usuario aparecen como filas nuevas. `isPlatformAdmin`
  no tiene endpoint de otorgamiento por diseño (ADR-007) — el test lo
  otorga con una escritura directa a Postgres vía `pg`, el mismo mecanismo
  sancionado que cualquier smoke test manual de este proyecto.
  `apps/e2e/src/global-setup.ts` ahora expone
  `process.env.E2E_DATABASE_URL` (la URL de conexión efímera de
  Testcontainers) para que los archivos de test puedan abrir su propia
  conexión — Playwright hereda `process.env` del proceso principal al
  bifurcar los workers, patrón documentado de la propia herramienta, no un
  hack. `pg`/`@types/pg` añadidos como devDependencies de `apps/e2e`
  (ya eran dependencia real de `@erp/database`, no una librería nueva en el
  monorepo).
- **Nota operativa, no un bug de código**: la primera corrida de este E2E
  falló con `EADDRINUSE :::3000` — los servidores persistentes de
  `apps/api`/`apps/worker`/`apps/erp-web` que se mantienen corriendo entre
  sesiones (para que el usuario vea el progreso en vivo) ocupaban
  exactamente los puertos 3000/3001/5173 que el arnés E2E necesita para sus
  propios procesos efímeros — las dos primeras pruebas pasaron igual,
  porque terminaron ejecutándose contra el servidor persistente en vez del
  efímero (coincidencia inofensiva ya que ambos comparten esquema), pero la
  prueba nueva falló al no encontrar en la base efímera al usuario que
  `grantPlatformAdmin` acababa de promover en la base persistente. Detenidos
  los tres procesos persistentes antes de correr el E2E y reiniciados con
  build fresco al terminar — a documentar como paso explícito antes de
  correr `test:e2e` en cualquier sesión futura mientras existan servidores
  persistentes activos.
- Validación completa: `pnpm lint`/`typecheck` limpios en los 7
  paquetes/apps, `pnpm test` (198/198 `apps/api`, 9/9 `@erp/api-client`,
  16/16 `apps/erp-web`), `pnpm build` (7 paquetes/apps),
  `pnpm --filter @erp/api test:integration` (16/16 contra Postgres real),
  `pnpm --filter @erp/e2e test:e2e` (4/4 Playwright, incluyendo el test
  nuevo) — todo verde. Smoke test manual adicional contra la infraestructura
  Docker real (servidores persistentes reconstruidos y reiniciados):
  registro de dos usuarios reales, flag otorgado vía `UPDATE` directo,
  login real confirma `isPlatformAdmin: true`, listado de usuarios de
  plataforma real, deshabilitar → login real rechazado con
  `403 ACCOUNT_DISABLED` → reactivar, escritura real de
  `localization.currency=GTQ` a nivel PLATFORM → confirmado en el listado →
  revertido a `USD` → `GET /platform/audit-entries` confirma las auditorías
  reales de ambas acciones con el actor y los valores previo/nuevo
  correctos. Datos de prueba no eliminados de `users`/`audit_entries` por
  diseño — `audit_entries.user_id` usa `onDelete: Restrict`
  (MASTER_SPEC §10, los logs de auditoría no deben poder modificarse
  fácilmente), así que ningún usuario que haya generado una entrada de
  auditoría (toda cuenta registrada genera `user.registered`) puede
  eliminarse sin violar esa garantía; es el mismo motivo por el que esta
  base de desarrollo acumula usuarios de pruebas de sesiones anteriores.

### Hecho — sesión 17 (Inbox / idempotencia de consumidores — ADR-008)

- **ADR-008** (`docs/DECISIONS.md`): documenta el mecanismo de inbox que
  ADR-004 punto 5 dejó deliberadamente diferido — se construye ahora,
  antes del primer handler de negocio real, porque el diseño ya está
  completamente especificado en `docs/EVENTS.md` §9 y el patrón de
  claim/lease del outbox (ADR-004) es una plantilla ya probada para
  replicar. Decisión clave: dos estados únicamente (`PROCESSING`/
  `PROCESSED`, sin `FAILED` separado — un fallo simplemente deja la fila
  reclamable tras vencer su lease, mismo mecanismo de recuperación ya
  usado por el outbox) y reclamo atómico (`tryClaim`) en vez de una
  transacción compartida literal entre el chequeo de inbox y el efecto del
  consumidor (que habría exigido rediseñar cómo cada caso de uso existente
  recibe su cliente Prisma — cambio de alcance mucho mayor que el propio
  mecanismo de inbox).
- **`packages/events/`**: `InboxMessage` (entidad de dominio simple, sin
  lógica de transición compleja — el claim/lease vive en el repositorio,
  igual que `OutboxMessage.claimBatch`), `InboxMessageRepository`
  (`tryClaim`/`markProcessed`/`markFailed`), `PrismaInboxMessageRepository`
  (usa `SELECT ... FOR UPDATE` dentro de una transacción para una fila
  existente, y captura la violación de unicidad `P2002` para el caso de
  dos reclamos concurrentes de una fila nueva), `consumeIdempotently`
  (helper de aplicación: claim → ejecutar efecto → marcar procesado/fallido,
  nunca deja que la excepción del efecto se propague de vuelta a
  `DomainEventBus.publish`). `OutboxDispatcherModule` ahora también expone
  `INBOX_MESSAGE_REPOSITORY`, junto a `DomainEventBus`, para que un futuro
  handler registrado en `apps/worker` pueda inyectar ambos sin wiring
  adicional.
- Tabla nueva (migración `20260829224906_inbox_idempotency`, generada y
  **aplicada directamente contra Postgres real** vía `prisma migrate dev`):
  `inbox_messages`, con `@@unique([consumerName, messageId])` como
  frontera real de corrección (rechazada por Postgres, no solo filtrada
  por aplicación) y el mismo patrón de FK opcional a `tenants` ya usado por
  `outbox_messages`.
- Tests: 9 nuevos en `@erp/events` (3 de la entidad, 6 de
  `consumeIdempotently` cubriendo exactamente los contratos de
  `docs/EVENTS.md` §16: primera entrega, redelivery duplicada, dos
  reclamantes concurrentes, fallo sin lanzar + no reintento inmediato,
  recuperación tras vencer el lease, consumidores independientes para el
  mismo `messageId`) — 27 tests totales en `@erp/events` (antes 18). Suite
  de integración de `apps/api` ampliada con 3 escenarios reales contra
  Postgres: reclamo concurrente real (`Promise.all`, exactamente un
  ganador para el mismo par), recuperación de lease vencido real, y un
  escenario de punta a punta que provisiona un tenant real, despacha el
  outbox real, y confirma que una redelivery manual del mismo evento
  produce exactamente un efecto de consumidor — 16/16 en total (antes 13).
- Documentación actualizada: `docs/DATABASE.md` (nueva sección de la tabla
  `inbox_messages`, corregido el párrafo que decía "no hay inbox_messages
  todavía"), `docs/SECURITY.md` (nueva sección "Inbox / Consumer
  Idempotency" con modelo de amenazas y huecos conocidos; cerrado el hueco
  ya documentado en "Event Bus"; corregidas las referencias en
  "Notifications" para reflejar que el mecanismo ya existe aunque
  Notifications siga sin conectarse).
- Deliberadamente **no** incluido en este bloque: conectar Notifications de
  verdad al Event Bus — requiere extraer el módulo a un paquete compartido,
  alcance propio (ver ítem 1 de "Próximo" y ADR-008 "Deferred").
- Validación completa: `pnpm lint`/`typecheck` limpios, `pnpm test`
  (198/198 `apps/api`, 27/27 `@erp/events`), `pnpm build` (7 paquetes/apps),
  `pnpm --filter @erp/api test:integration` (16/16 contra Postgres real),
  `pnpm --filter @erp/e2e test:e2e` (3/3 Playwright) — todo verde. Migración
  también verificada manualmente contra la base de desarrollo de Docker
  Compose (no solo el Testcontainers efímero): `\d inbox_messages` confirma
  la estructura esperada, y un insert/delete manual confirma que la tabla
  acepta escrituras reales.

### Hecho — sesión 16 (Platform Administration plane — ADR-007)

- **ADR-007** (`docs/DECISIONS.md`): documenta la decisión de arquitectura
  que bloqueaba 3 ítems de esta cola desde hacía varias sesiones — "system
  administration usa un plano y credenciales separados"
  (`docs/ARCHITECTURE.md` §10). Decisión: reutilizar el `User`/`Session` ya
  construido y validado (Argon2id, sesiones opacas), agregando un flag
  `isPlatformAdmin` en vez de un sistema de credenciales completamente
  separado — evita duplicar infraestructura de auth ya correcta para una
  plataforma sin tenants de producción todavía. El usuario eligió
  explícitamente este enfoque frente a "credenciales completamente
  separadas" y "diferir la decisión".
- **`apps/api/src/core/users/`**: `User.isPlatformAdmin: boolean` (nuevo
  campo de dominio, `false` por defecto, nunca aceptado como input —
  `CreateUserUseCase` lo fija explícitamente). `UserRepository.findAll(limit)`
  nuevo — única excepción documentada a "sin queries unscoped de User", para
  el listado cross-tenant de plataforma. `ListUsersUseCase` nuevo.
- **`apps/api/src/core/platform-admin/`** (módulo nuevo, sin dependencia de
  Tenants/AccessControl): `PlatformAdminGuard` (corre tras
  `SessionAuthGuard`, exige `isPlatformAdmin=true`, falla cerrado con `500`
  si el guard se aplica sin `SessionAuthGuard` primero — mismo patrón que
  `PermissionGuard`). `PlatformUsersController`:
  `GET /api/v1/platform/users` (listar usuarios de toda la plataforma,
  `limit` opcional, tope 200), `PUT /api/v1/platform/users/:id/status`
  (primer caller HTTP real de `SetUserStatusUseCase`, que ya existía
  probado desde antes pero sin ningún endpoint que lo invocara — su
  auditoría `user.status_changed` tampoco cambió, solo ganó un caller).
- Migración nueva (`20260828175413_platform_admin_flag`, generada y
  **aplicada directamente contra Postgres real** vía `prisma migrate dev`):
  `users.is_platform_admin BOOLEAN NOT NULL DEFAULT false`.
- Tests: 7 nuevos (3 `ListUsersUseCase`, 3 `PlatformAdminGuard`, 1 wiring de
  `PlatformAdminModule`) — 193 tests unitarios totales en `apps/api` (antes
  186), más `app.module.spec.ts` ampliado con las 3 aserciones nuevas del
  módulo. Todos los `User.create({...})` existentes en tests (7 archivos)
  actualizados para el campo nuevo requerido.
- **Panel de avance actualizado** (`development-progress-panel.tsx`,
  pedido explícito del usuario para mantenerlo sincronizado en cada
  bloque): próximos hitos corregidos (ya no lista "endpoint de invitación
  de membresías", completado en sesión 15); Foundation recalculado de 53%
  a 78% — 6 de los 8 pasos de `docs/ARCHITECTURE.md` §17 completos, con
  trabajo adicional (Membership Invitations, Platform Admin, Swagger,
  Workers) más allá de esos 8 pasos; solo faltan un App Registry mínimo y
  una revisión integral formal de Foundation. Avance total recalculado de
  11% a 13% (promedio de 13 fases); `onboarding.spec.ts` y
  `development-progress-panel.spec.tsx` actualizados a los nuevos valores.
- Documentación actualizada: `docs/DATABASE.md` (columna nueva en
  `users`), `docs/SECURITY.md` (nueva sección "Platform Administration"
  con modelo de amenazas y huecos conocidos, incluyendo que no hay
  auto-protección contra que un admin se deshabilite a sí mismo, y que
  otorgar el primer platform admin es un paso manual de base de datos, no
  un endpoint).
- Validación: `pnpm lint`/`typecheck` limpios, `pnpm test` 193/193 en
  `apps/api`, 16/16 en `apps/erp-web`.

**Segundo bloque de la misma sesión — Escritura de settings PLATFORM
(cierra el ítem 1 original de esta cola)**:

- **`apps/api/src/core/configuration/`**: `ListPlatformSettingsUseCase`
  nuevo (reusa `GetEffectiveSettingUseCase` sin `tenantId`/`companyId`, así
  que su cadena de resolución solo llega a `PLATFORM → DEFAULT`, nunca
  `TENANT`/`COMPANY`). `SetSettingValueUseCase` no cambió — ya era
  domain-complete para `PLATFORM` desde que se construyó Typed
  Configuration; solo le faltaba un caller HTTP seguro. `SettingDefinitionResponseDto`/
  `EffectiveSettingResponseDto`/`SettingValueResponseDto`/
  `UserPreferenceResponseDto` ahora exportados desde el barrel público del
  módulo (antes internos de `presentation/`) para que `platform-admin`
  pueda reusarlos sin duplicar DTOs.
- **`apps/api/src/core/platform-admin/`**: `PlatformSettingsController`
  nuevo, mismo patrón de guard que `PlatformUsersController`
  (`SessionAuthGuard` + `PlatformAdminGuard`, sin `TenantContextGuard` — un
  valor PLATFORM no tiene tenant): `GET /api/v1/platform/settings/definitions`,
  `GET /api/v1/platform/settings` (valor PLATFORM vigente de cada
  definición, o su default), `PUT /api/v1/platform/settings/:key`. Graba
  `configuration.platform_setting.changed` — acción de auditoría
  deliberadamente distinta de `configuration.setting.changed` (tenant) para
  que una futura vista de auditoría de plataforma pueda diferenciarlas sin
  inspeccionar `tenantId`. `PlatformAdminModule` ahora importa también
  `ConfigurationModule` y `AuditModule` directamente (este último no lo
  re-exporta `ConfigurationModule`, así que sin importarlo aparte
  `RecordAuditEntryUseCase` no habría sido resoluble — bug real encontrado
  al correr la suite completa de tests, no solo el test aislado del
  módulo, corregido antes de continuar).
- **Sin migración nueva** — reutiliza `setting_definitions`/`setting_values`
  ya existentes; el `scopeKey` de un valor PLATFORM ya era literalmente
  `"platform"` en el dominio desde que se construyó Typed Configuration.
- Tests: 2 nuevos (`ListPlatformSettingsUseCase`) + 3 nuevas aserciones de
  wiring (`configuration.module.spec.ts`, `platform-admin.module.spec.ts`,
  `app.module.spec.ts`) — 195 tests unitarios totales en `apps/api` (antes
  193). Suite de integración ampliada con un escenario real contra Postgres:
  antes de cualquier override, tanto el listado de plataforma como la
  resolución efectiva de un tenant real caen en `DEFAULT`; tras escribir un
  valor PLATFORM real, **el mismo tenant sin override propio pasa a heredar
  ese valor** (`source: "PLATFORM"`) sin haber tocado nada del lado del
  tenant — la prueba central de que el fallback funciona de punta a punta,
  no solo que el valor se puede releer desde su propia fila.
- Smoke test manual contra Docker real: registro de un admin y un owner de
  tenant reales, provisioning real → `admin` sin flag rechazado con `403`
  en `GET /platform/settings/definitions` → flag otorgado vía `UPDATE`
  directo → catálogo visible → efectivo del tenant real en `DEFAULT` antes
  del override → `PUT /platform/settings/localization.currency` con
  `EUR` → `GET /platform/settings` confirma `EUR`/`PLATFORM` → **el
  mismo tenant real, sin tocar nada de su lado, ahora resuelve `EUR` en
  vez de `USD`** → el owner (sin flag) rechazado con `403` al intentar
  escribir en `/platform/settings` → clave inexistente rechazada con
  `404 SETTING_NOT_FOUND` → valor de tipo incorrecto rechazado con
  `400 INVALID_SETTING_VALUE` → `SELECT` directo sobre `audit_entries`
  confirma la entrada `configuration.platform_setting.changed` con el
  actor real y los valores previo/nuevo correctos. Datos de prueba
  limpiados después (incluyendo notificaciones automáticas de
  provisioning, encontradas como dependencia de FK al limpiar).
- Documentación actualizada: `docs/DECISIONS.md` (ADR-007 enmendado con la
  sección "Amendment (2026-08-29)"), `docs/SECURITY.md` (sección "Typed
  Configuration" — hueco "No PLATFORM-scope write endpoint" cerrado con
  tachado; sección "Platform Administration" ampliada con los assets y
  amenazas de la escritura de settings).
- Validación completa: `pnpm lint`/`typecheck` limpios, `pnpm test`
  (195/195 `apps/api`), `pnpm build` (7 paquetes/apps),
  `pnpm --filter @erp/api test:integration` (13/13 contra Postgres real),
  `pnpm --filter @erp/e2e test:e2e` (3/3 Playwright) — todo verde.

**Tercer bloque de la misma sesión — Vista de auditoría de plataforma
(cierra el ítem 2 original de esta cola — "mi actividad"/eventos no
tenant-scoped)**:

- **`apps/api/src/core/audit/`**: `AuditEntryRepository.findPlatformScoped(limit)`
  nuevo — filtro `WHERE tenant_id IS NULL` a nivel de query, estructural,
  no un filtro de aplicación que se pudiera olvidar (implementado en
  `PrismaAuditEntryRepository` e `InMemoryAuditEntryRepository`).
  `ListPlatformAuditEntriesUseCase` nuevo, mismo patrón que
  `ListAuditEntriesUseCase` (límite 50/tope 200).
- **`apps/api/src/core/platform-admin/`**: `PlatformAuditEntriesController`
  nuevo (`GET /api/v1/platform/audit-entries`), mismo patrón de guard que
  los otros dos controllers de plataforma. Reusa `AuditEntryResponseDto`/
  `ListAuditEntriesDto` ya existentes del barrel de `audit` — mismo shape
  de respuesta que el endpoint tenant-scoped, sin duplicar DTOs.
- **Sin migración nueva** — reutiliza `audit_entries` ya existente; la
  columna `tenant_id` ya era nullable desde que se construyó Audit.
- Tests: 3 nuevos (`ListPlatformAuditEntriesUseCase`) + 3 nuevas aserciones
  de wiring (`audit.module.spec.ts`, `platform-admin.module.spec.ts`,
  `app.module.spec.ts`) — 198 tests unitarios totales en `apps/api` (antes
  195). El escenario de integración ya existente de Audit se amplió (no se
  agregó uno nuevo) para verificar que la vista de plataforma ve
  exactamente la entrada `auth.login.succeeded` (`tenantId: null`) y
  ninguna de las dos entradas `tenant.provisioned` de los tenants reales
  creados en el mismo test.
- Smoke test manual contra Docker real: registro de un admin real, un
  login fallido real, un segundo usuario real que provisiona un tenant
  real → `admin` sin flag rechazado con `403` en `/platform/audit-entries`
  → flag otorgado vía `UPDATE` directo → el listado real muestra
  exactamente las entradas `tenantId: null` (registros, logins
  exitosos/fallidos) de toda la plataforma (incluyendo residuos de
  sesiones/E2E anteriores, confirmando que es genuinamente cross-tenant) y
  **ninguna entrada del provisioning del tenant real recién creado**,
  confirmando en runtime que el filtro estructural funciona. Datos de
  prueba limpiados después.
- Documentación actualizada: `docs/DECISIONS.md` (ADR-007, segunda sección
  "Amendment (2026-08-29)"), `docs/SECURITY.md` (sección "Audit" — dos
  huecos ya documentados cerrados con tachado: `SetUserStatusUseCase` sin
  caller HTTP, y entradas no tenant-scoped sin endpoint de lectura; sección
  "Platform Administration" ampliada con el asset y la amenaza del nuevo
  endpoint; corregido un hueco que ya no aplicaba sobre auditoría de
  settings PLATFORM no consultable).
- Validación completa: `pnpm lint`/`typecheck` limpios, `pnpm test`
  (198/198 `apps/api`), `pnpm build` (7 paquetes/apps),
  `pnpm --filter @erp/api test:integration` (13/13 contra Postgres real),
  `pnpm --filter @erp/e2e test:e2e` (3/3 Playwright) — todo verde.

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
- ~~Claude continuará con el ítem 1 de "Próximo" (App Registry mínimo)...~~
  — cerrado en la sesión 22, ver "Hecho — sesión 22" arriba. Claude
  continuará con Fase 2 (Master Data) como próximo bloque de trabajo.
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
- ~~Escritura de settings a nivel PLATFORM depende de un plano de
  administración de plataforma separado...~~ — cerrado en la sesión 16: el
  plano (ADR-007) y el endpoint en sí (`PUT /api/v1/platform/settings/:key`)
  ya existen. Ver "Hecho — sesión 16" (segundo bloque).
- ~~"Mi actividad"/vista de administración de plataforma para eventos no
  tenant-scoped depende de un plano de administración de plataforma...~~ —
  cerrado en la sesión 16 (tercer bloque): `GET /api/v1/platform/audit-entries`
  ya existe. Ver "Hecho — sesión 16" (tercer bloque).
- ~~Un `DomainEventBus` handler con efecto secundario no idempotente depende
  de construir primero `inbox_messages`...~~ — cerrado en la sesión 17
  (ADR-008).
- ~~Conectar Notifications al Event Bus depende de extraer el módulo a un
  paquete compartido...~~ — cerrado en la sesión 19: `@erp/notifications`
  ya existe y `apps/worker` lo consume. Ver "Hecho — sesión 19".
- ~~Una purga real de storage para archivos borrados depende de definir una
  ventana de retención...~~ — cerrado en la sesión 20:
  `FILES_PURGE_RETENTION_DAYS` (default 30 días) y `FilePurgeScheduler` ya
  existen. Ver "Hecho — sesión 20".
- ~~Un adapter real de Email para Notifications depende de elegir un
  proveedor SMTP/transaccional...~~ — cerrado en la sesión 20:
  `SmtpEmailDispatcher` es genérico vía SMTP, no atado a un proveedor
  específico. Ver "Hecho — sesión 20".
- ~~Expirar/revocar invitaciones pendientes depende de decidir una política
  de TTL...~~ — cerrado en la sesión 20: `MEMBERSHIP_INVITATION_TTL_SECONDS`
  (default 7 días) ya existe, junto con revocar y reinvitar. Ver "Hecho —
  sesión 20".
- ~~`@erp/api-client` generado desde OpenAPI depende de elegir una
  herramienta de generación...~~ — cerrado en la sesión 21:
  `openapi-typescript` genera `src/generated/openapi-types.ts` desde
  `/api/docs-json` real, y `contracts.ts` deriva de ahí. Ver "Hecho —
  sesión 21".
- ~~Un App Registry mínimo (único ítem restante de la cola Claude) no depende
  de ninguna decisión de arquitectura pendiente...~~ — cerrado en la sesión
  22: `AppDefinition`/`TenantApp`/`AppConfiguration` ya existen (ADR-005).
  Ver "Hecho — sesión 22".
- ~~Una UI de administración de plataforma en erp-web...~~ — cerrado en la
  sesión 18: `platform-admin-page.tsx` (Usuarios/Ajustes/Actividad) ya
  existe y está cubierto por E2E real. Ver "Hecho — sesión 18".

## Integration needed

Ninguna pendiente en este momento — OpenAPI/Swagger (MASTER_SPEC §25) quedó
resuelto en la sesión 14 (`GET /api/docs`, `GET /api/docs-json`).

## Architecture decisions needed

Ninguna pendiente de aprobación en este momento. Decisiones ya registradas:
`docs/DECISIONS.md` ADR-006 (Identity & Session Strategy) — su pregunta
abierta sobre almacenamiento de tokens en el cliente quedó resuelta en la
práctica por `apps/erp-web` (memoria, no persistente); ADR-004 (Event
Architecture — implementado y ratificado en sesión 10, enmendado en sesión
13 para reflejar la extracción del dispatcher a `apps/worker`); ADR-007
(Platform Administration Plane — implementado y ratificado en sesión 16,
`isPlatformAdmin` + `PlatformAdminGuard`, enfoque elegido explícitamente por
el usuario entre tres alternativas presentadas); ADR-008 (Consumer-Side
Idempotency / Inbox — implementado y ratificado en sesión 17, mecanismo
completo verificado contra Postgres real; enmendado en sesión 19 con el
primer consumidor de negocio real, Notifications, conectado vía
`@erp/notifications` + `apps/worker`); ADR-005 (Plugin Architecture V1
mínimo — implementado y ratificado en sesión 22: catálogo code-owned
`FOUNDATION_APPS` vacío en producción, `AppDefinition`/`TenantApp`/
`AppConfiguration`, lifecycle `ENABLED`/`DISABLED` colapsado, chequeo real
de dependencias/dependents, verificado con fixtures contra Postgres real y
E2E de navegador real); ADR-009 (Payment Gateway Adapters V1 —
implementado y ratificado en sesión 27, alcance deliberadamente limitado
a `CASH`/`BANK_TRANSFER`, sin ningún adapter credenciado); ADR-010 (POS
Terminal Idempotency Scope V1 — implementado y ratificado en sesión 30,
documenta explícitamente el límite de la garantía de idempotencia de
`RingUpSaleUseCase` bajo una carrera genuinamente simultánea, cubierta
solo para el caso real de una reintentona secuencial). Pendientes de
numerar formalmente cuando corresponda: ADR-001 (Modular Monolith),
ADR-002 (PostgreSQL/Prisma), ADR-003 (Multi-Tenancy — el patrón de
`docs/MULTITENANCY.md` §8 ya está verificado tres veces contra Postgres
real: manual, integration test, y ahora E2E de navegador).
