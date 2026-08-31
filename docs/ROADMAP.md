# Technical Roadmap V1

Estado: **Fase 0 (Arquitectura) y Fase 1 (Foundation) aceptadas,
implementadas y cerradas formalmente — sesión 22, 2026-08-30. Ver
"Revisión de cierre de Foundation" en `docs/PROJECT_STATE.md`. Fase 2
(Master Data) implementada y cerrada formalmente — sesión 25, 2026-08-31,
en tres bloques (Catálogo, sesión 23; Customers/Suppliers, sesión 24;
Taxes/Warehouses/Pricing, sesión 25). Fase 3 (Inventory) implementada y
cerrada formalmente — sesión 26, 2026-08-31: Movement Ledger, balances
on-hand/reservado/disponible, reservas/liberaciones, ajustes y
transferencias con estado explícito, con seguridad de concurrencia real
verificada contra Postgres real (`docs/DATABASE.md`/`docs/SECURITY.md`
"Inventory"). Deliberadamente fuera de alcance por falta de aprobación
explícita (`docs/ROADMAP.md` §7): ubicaciones/bins de bodega,
lote/serie/vencimiento. Las fases 4-12 siguen como propuesta de roadmap
sin implementar.**

Estrategia: fases con exit criteria, sin fechas artificiales

Fuente: `docs/MASTER_SPEC.md` y Architecture V1 propuesta

## 1. Principios de ejecución

- Construir vertical slices verificables, no cientos de archivos vacíos.
- Una fase solo termina cuando cumple su quality gate; “código escrito” no equivale a terminado.
- Correctitud, seguridad e integridad preceden a amplitud funcional.
- No iniciar un módulo sin análisis de dominio, ownership, tenancy, permisos, API, eventos, auditoría y pruebas.
- Las decisions de arquitectura se registran antes de implementar el punto irreversible.
- Migrations son forward-only; rollback operativo se logra con compatibilidad, feature flags, backups y forward fixes.
- No introducir microservicios, Kafka, Kubernetes, OpenSearch o plugins externos sin métricas y ADR.
- Tras cada fase: Architecture, Security, Database, Testing, Performance y Technical Debt Review.

## 2. Definition of Ready para un módulo

Antes de implementar un módulo debe existir:

- objetivo y alcance/no alcance;
- bounded context y owner;
- aggregates, entidades, value objects e invariantes;
- casos de uso y state transitions;
- modelo de tenancy/company/branch/warehouse;
- permisos y policies;
- modelo relacional, constraints, índices y concurrencia;
- contrato REST/OpenAPI;
- domain/integration events y contratos síncronos;
- audit matrix;
- idempotencia y failure modes;
- estrategia de testing y observabilidad;
- dependencias de apps y datos.

## 3. Quality gate común

Cada entrega debe pasar, cuando el tooling exista:

- lint y formatting;
- TypeScript typecheck estricto;
- unit, integration y E2E tests aplicables;
- build reproducible;
- migrations probadas desde cero y sobre versión anterior;
- tenant isolation y authorization negative tests;
- OpenAPI/event compatibility checks;
- dependency/security scan;
- revisión de logs/secrets/PII;
- `git status` y diff sin cambios ajenos;
- documentación y ADRs actualizados.

No se persigue 100% de coverage. Los caminos críticos y negativos deben quedar probados.

## 4. Fase 0 — Architecture y planificación

### Objetivo

Convertir la visión en decisiones implementables y reducir riesgos antes del bootstrap.

### Entregables

- Architecture V1, Multi-Tenancy, Events, Plugins y Roadmap aprobados.
- ADR-001 Modular Monolith y deployment units.
- ADR-002 PostgreSQL/Prisma y estrategia de IDs/timestamps/Decimal.
- ADR-003 Multi-Tenancy y decisión inicial sobre RLS.
- ADR-004 Event Architecture/outbox/idempotencia.
- ADR-005 Plugin Architecture oficial/compilada.
- ADR-006 Identity/session strategy.
- Diseño detallado de Foundation DB en `DATABASE.md`.
- Threat model inicial y controles en `SECURITY.md`.
- Convenciones de módulos, API, errores, testing y migrations.
- Ownership y tareas activas reflejadas en `docs/tasks/CURRENT.md` antes de código.

### Spikes obligatorios

- Prisma + FKs compuestas tenant-safe + transactions.
- UUIDv7 real en Node/PostgreSQL/Prisma y política de generación.
- Sesiones/auth y revocación.
- RLS con pool, worker y migrations, aunque la decisión sea postergarlo.
- Outbox claim/recovery con PostgreSQL + BullMQ.

### Exit criteria

- No quedan decisiones bloqueantes de Foundation sin ADR/owner.
- El esquema Foundation y trust boundaries tienen revisión de arquitectura/seguridad.
- Se acepta explícitamente qué no se construirá en V1.

## 5. Fase 1 — Foundation

Foundation se entrega en incrementos; el orden es deliberado.

### 1A. Repository y developer platform

Entregables:

- pnpm workspace + Turborepo mínimos.
- Apps `api`, `worker`, `erp-web` solo con entrypoints funcionales.
- Packages compartidos únicamente cuando tengan consumidor real.
- TypeScript strict, lint, formatting, unit runner y build.
- Configuración de environment tipada y fail-fast.
- Docker Compose local para PostgreSQL, Redis y MinIO.
- GitHub Actions: lint, typecheck, test, build y dependency scan.
- README/setup y comandos reproducibles.

Exit:

- Clone limpio levanta entorno y pipeline verde.
- No hay secrets commiteados ni dependencias sin lock.

### 1B. Persistence y operational baseline

Entregables:

- PostgreSQL/Prisma y migración baseline.
- Transaction abstraction sin Prisma en Domain.
- ID, clock/timestamps, Decimal/Money contracts y error model.
- Structured logging, correlation IDs, liveness/readiness y métricas base.
- Integration test database aislada y factories.
- Backup/restore local documentado y primer restore test.

Exit:

- Migrations funcionan desde cero y en CI.
- Request y job pueden trazarse sin registrar secretos.
- Transacciones rollback/commit tienen integration tests.

### 1C. Tenancy vertical slice

Entregables:

- Tenant lifecycle mínimo.
- User global + Membership tenant-scoped.
- Organization + Company onboarding mínimo.
- Immutable ExecutionContext y tenant resolver.
- Scoped repository pattern + constraints tenant-safe.
- Provisioning idempotente.
- Dos-tenant test suite para read/write/relationships/cache.

Exit:

- Ningún endpoint privado accede a tenant-owned data sin contexto.
- Intentos cross-tenant fallan en policy/repository y DB constraint.

### 1D. Identity y Access Control

Entregables:

- Login/session/logout/revocation según ADR.
- Password recovery y rate limits base.
- MFA preparado o implementado según alcance aprobado.
- Permissions catalog, roles, role permissions y scoped assignments.
- Deny-by-default guards/policies.
- Invitation y Membership status transitions.
- Security audit para session fixation, CSRF, brute force, IDOR y privilege escalation.

Exit:

- Session revocation efectiva y tests de matriz RBAC/scope.
- Ninguna ruta administrativa depende de ocultar controles en frontend.

### 1E. Organization Structure y Configuration

Entregables:

- Organizations, Companies, Branches y Locations con lifecycle no destructivo.
- Settings tipadas por scope y user preferences permitidas.
- Timezone, locale y currency defaults con validación.
- Company/branch selection segura en ERP Web.

Exit:

- Relaciones cross-company/tenant inválidas se rechazan.
- Precedencia de settings y cambios auditables quedan probados.

### 1F. Audit, Eventing y Worker

Entregables:

- Audit matrix y append-only audit entries.
- Transactional outbox/inbox.
- BullMQ dispatcher/consumers, retries, backoff y DLQ.
- Correlation/causation/trace propagation.
- Event schema package y compatibility tests.
- Operational endpoints/métricas para lag y failures.

Exit:

- Pruebas de crash/duplicate/retry demuestran no pérdida y efecto idempotente.
- Audit y eventos no contienen secrets/PII innecesaria.

### 1G. App Registry, Files y Notifications base

Entregables:

- Catálogo de manifests oficiales validado en build.
- Entitlement stub/controlado + TenantApp install/enable/disable idempotente.
- Dependency resolution sin ciclos.
- Metadata de archivos, uploads/downloads firmados y ownership checks.
- Notification request + email/in-app adapter base mediante worker.

Exit:

- App disabled falla cerrado en API, worker y UI.
- Tenant A no puede acceder a archivo/config/app de Tenant B.

### Gate de Foundation

- Architecture/Security/DB reviews sin hallazgos críticos abiertos.
- Restore drill satisfactorio.
- SLOs iniciales definidos y observabilidad operable.
- Onboarding completo: crear tenant/company, invitar usuario, asignar rol, iniciar sesión y ejecutar una acción auditada.
- Foundation se prueba en staging antes de Master Data.

## 6. Fase 2 — Master Data

### Orden recomendado

1. Units of Measure y tax definitions base.
2. Party model, Customers y Suppliers, evitando duplicar identidad empresarial.
3. Product Catalog: Product, Variant, Category, Brand y atributos controlados.
4. Pricing/Price Lists con Decimal y vigencia.
5. Warehouses y locations maestras.
6. Import/export CSV inicial mediante worker para conjuntos grandes.

### Reglas clave

- Decidir explícitamente ownership tenant vs company.
- No guardar `stock` autoritativo en Product.
- Atributos flexibles no convierten todo el modelo en JSONB.
- Customer/Supplier comparten Party solo si el análisis demuestra semántica común útil.

### Exit criteria

- CRUD/use cases, bulk paths, paginación/filtering y audit completos.
- Constraints e isolation tests para todos los scopes.
- Catálogo soporta variantes sin anticipar manufactura innecesariamente.

## 7. Fase 3 — Inventory

### Entregables

- Inventory Movement Ledger append-only.
- On-hand projection consistente y reconciliable.
- Reservations/releases.
- Adjustments con reason/approval/audit.
- Transfers entre warehouses con estado explícito.
- Warehouse locations/bins, lotes/seriales/vencimientos solo según alcance aprobado.
- Conteos e historial.

### Riesgos a cerrar antes de código

- Definición matemática de on-hand, available, reserved e in-transit.
- Concurrency/locking y optimistic versioning.
- Unidades/conversiones y precisión de quantity.
- Reversal en vez de editar/eliminar movimientos.

### Exit criteria

- Pruebas concurrentes no permiten oversell/reservas negativas según policy.
- Cada cambio de saldo tiene ledger y reconciliación.
- Ningún módulo futuro podrá mutar stock fuera de Inventory contracts.

## 8. Fase 4 — Sales y Payments

### 4A. Sales

- Quotes, Sales Orders y lines.
- Estados/transiciones explícitos.
- Pricing snapshot, discounts/taxes y channel.
- Inventory reservation mediante port transaccional.
- Fulfillment boundaries y returns diseñados sin confundir Order/Invoice/Shipment/Payment.

### 4B. Payments

- Payment aggregate independiente.
- `PaymentGateway` ports y primeros adapters aprobados.
- Idempotency, webhook verification, capture/cancel/refund.
- Tokenización; ninguna tarjeta sensible almacenada.
- Reconciliation y estados ante timeouts ambiguos.

### Exit criteria

- Confirm/cancel/return tienen invariantes y compensaciones probadas.
- Duplicar request/webhook no duplica orden, cargo ni refund.
- Fallos del provider son reconciliables y observables.

La facturación fiscal y accounting posting no se simulan dentro de Sales; se integran en sus fases.

## 9. Fase 5 — Purchasing

### Entregables

- Purchase Requests cuando el workflow lo justifique.
- Purchase Orders y approvals.
- Receipts integrados con Inventory ledger.
- Supplier invoices como documento separado.
- Returns y estados de cierre.

### Exit criteria

- Recepción parcial, cancelación y devolución conservan trazabilidad.
- Permisos de aprobación y segregation of duties están probados.

## 10. Fase 6 — POS

### Entregables

- Web/PWA online-first.
- Register, shift, cash movements, tickets, returns y cierre.
- Adapters de barcode/thermal print según hardware validado.
- Integración con Sales, Payments e Inventory mediante contracts.

### Restricción

Offline transaccional no se incluye automáticamente. Antes requiere ADR sobre device identity, local ledger, conflict resolution, correlativos, reservas y reconciliación. Tauri se evalúa solo si PWA no satisface hardware.

### Exit criteria

- Cierres y cash movements son auditables y Decimal-safe.
- Reintentos de terminal no duplican ventas/pagos.

## 11. Fase 7 — Commerce

### 7A. Commerce Engine

- Catalog publication, pricing/promotions, cart, checkout, customers, orders, payment/shipping/tax ports.
- Multi-storefront model y domain mapping.
- Rate limits, anti-abuse e idempotency.

### 7B. Storefront

- Next.js separado del ERP Web.
- Search inicial PostgreSQL.
- Product/cart/checkout/account UX.
- SEO, accessibility, performance y secure session model.

### Exit criteria

- Storefront no contiene reglas autoritativas de Commerce.
- Checkout repetido/webhook duplicado conserva exactamente un efecto.

## 12. Fase 8 — Accounting

### Entregables

- Chart of Accounts, Fiscal Period, Journal Entry/Lines y Ledger.
- Double-entry invariants y Decimal.
- Posting/reversal; no edición destructiva de asientos posted.
- Reconciliation y primeros financial statements.
- Integration mappings desde Sales, Payments, Purchasing e Inventory.

### Exit criteria

- Todo asiento balancea y los períodos cerrados están protegidos.
- Reprocesar source events no duplica postings.
- Revisión por especialista contable y jurisdiccional.

## 13. Fase 9 — CRM

- Leads, opportunities, activities y pipelines.
- Relación explícita con Party/Customers sin duplicar ownership.
- Consent/privacy y notification preferences.
- Eventos de Sales consumidos de forma idempotente.

Exit: pipeline configurable, permisos de equipos y privacidad verificados.

## 14. Fase 10 — Manufacturing

- Bill of Materials con versionado/vigencia.
- Production Orders, operations y material requirements.
- Issue/consume/return/finished goods mediante Inventory ledger.
- Costing model aprobado antes de calcular costos.
- Lot/serial traceability si el mercado lo requiere.

Exit: ninguna producción altera stock sin ledger; consumos, scrap y reversals son auditables.

## 15. Fase 11 — Plugin Platform

Evolución del sistema oficial de V1:

- Plugin SDK estable.
- App Registry avanzado y compatibility certification.
- Marketplace interno de módulos oficiales.
- Feature contributions más amplias con contracts versionados.
- Installation/upgrade UX y operational tooling.
- Primer spike aislado de third-party trust model.

No se habilita marketplace público hasta cubrir sandbox/capabilities, firma, secrets, egress, quotas, data consent, revocation, migrations y incident response descritos en `PLUGINS.md`.

## 16. Fase 12 — Scale, solo por evidencia

Posibles iniciativas, cada una con métricas y ADR independientes:

- read replicas para workloads de lectura;
- partitioning de tablas de alto volumen;
- OpenSearch cuando PostgreSQL ya no cumpla search SLOs;
- CDN/image pipeline avanzado;
- services dedicados para Notifications, Search, Files, Payments, Commerce o Inventory;
- RabbitMQ/Kafka cuando routing/throughput/replay lo justifiquen;
- Kubernetes cuando despliegues, autoscaling y equipos lo justifiquen;
- multi-region/residency o database-per-tenant para requisitos concretos.

No es una migración única a “microservices”; cada extracción debe tener ownership, contrato, consistency model, SLO, runbook y rollback.

## 17. Workstreams transversales

### Seguridad

- Threat model por fase.
- Dependency/container scans, secret detection y patch cadence.
- MFA/SSO/API keys/service accounts según roadmap y riesgo.
- Access reviews, support access JIT y incident response antes de enterprise.

### Observabilidad y SRE

- SLOs por capability y alertas accionables.
- Tracing API/worker/integrations.
- Capacity tests antes de cada lanzamiento mayor.
- Runbooks, backup/PITR y disaster-recovery drills.

### UX y Design System

- Tokens y componentes accesibles desde Foundation.
- Server-state, form-state y UI-state separados.
- DataGrid, command palette y dashboards cuando existan casos, no como bloqueo del Core.

### Data lifecycle

- Retention, archive, export, privacy y legal holds.
- PII classification por module.
- Migrations/backfills reentrantes y observables.

### Developer platform

- SDK TypeScript desde OpenAPI cuando el contrato se estabilice.
- Test fixtures, local tooling y previews.
- Module templates solo después de confirmar el patrón con dos módulos reales.

## 18. Backlog explícitamente diferido

- GraphQL.
- CQRS completo/event sourcing.
- Microfrontends.
- POS offline y Tauri.
- Marketplace público/third-party plugins.
- Kafka/RabbitMQ/Kubernetes.
- OpenSearch.
- Multi-region activa-activa.
- Facturación SaaS completa.
- Developer Portal público.
- AI/BI avanzado.

“Diferido” no significa rechazado; significa que no condicionará Foundation sin un requisito demostrado.

## 19. Próxima acción recomendada

Después de aprobar estos documentos:

1. registrar los ADR-001 a ADR-006;
2. detallar `DATABASE.md` y `SECURITY.md` para Foundation;
3. crear tareas con ownership no superpuesto;
4. ejecutar los spikes de Fase 0;
5. comenzar 1A y no avanzar a 1C hasta que persistence/test harness de 1B sea estable.

El primer resultado funcional que debe perseguirse es: **un tenant puede provisionarse, un usuario puede autenticarse mediante Membership, seleccionar una Company y ejecutar una acción autorizada que quede auditada y produzca un evento durable, sin que otro tenant pueda observarla o afectarla**.
