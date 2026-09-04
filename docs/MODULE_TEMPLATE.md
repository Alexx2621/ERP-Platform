# Module Template

Estado: primera versión, sesión 36 (2026-09-04) — workstream de Developer
platform (`docs/ROADMAP.md` §17: "Module templates solo después de
confirmar el patrón con dos módulos reales").

`docs/ROADMAP.md` puso esa condición explícita porque extraer un template
de un solo módulo (o de ninguno) es adivinar. Este documento se escribe
recién ahora porque el patrón ya no es una suposición: **15 módulos de
negocio reales** (Catalog, Customers, Suppliers, Taxes, Warehouses,
Pricing, Inventory, Sales, Payments, Purchasing, POS, Commerce,
Accounting, CRM, Manufacturing) siguieron, de forma independiente a lo
largo de más de 20 sesiones, exactamente la misma forma — lo que sigue es
una extracción de ese patrón real, con ejemplos reales citados, no un
diseño nuevo. No es un generador de código (`plop`/`hygen`/CLI) — construir
uno sin que nadie lo haya pedido sería la misma sobrearquitectura que
MASTER_SPEC §59/§93 advierte evitar; es una checklist/referencia para
copiar el patrón a mano, como ya se hizo 15 veces.

## 1. Cuándo usar este template

Para un módulo de negocio nuevo bajo `apps/api/src/modules/` — nunca para
capacidades de Platform Core (`apps/api/src/core/`), que tienen su propio
criterio en `docs/ARCHITECTURE.md` §5.3. Antes de empezar, resolver el
Definition of Ready completo de `docs/ROADMAP.md` §2 (objetivo/alcance,
bounded context, aggregates/invariantes, casos de uso, tenancy/company,
permisos, modelo relacional, contrato REST, eventos, audit matrix,
idempotencia, testing) — este template cubre el *cómo*, no sustituye el
*qué* ni el *por qué*.

## 2. Estructura de carpetas

```text
apps/api/src/modules/<module>/
  domain/
    <entity>.entity.ts            // Value objects/invariantes; nunca importa Prisma/Nest/HTTP
    <entity>.entity.spec.ts
    <entity>.repository.ts        // Interfaz + token DI (Symbol)
    decimal.ts                    // Solo si el módulo calcula con Decimal — ver §5
    errors.ts                     // Errores de dominio tipados
  application/
    use-cases/
      create-<entity>.use-case.ts
      create-<entity>.use-case.spec.ts
      ...
    errors.ts                     // Errores de aplicación (multi-entidad/orquestación)
  infrastructure/
    prisma-<entity>.repository.ts
  presentation/
    dto/
      create-<entity>.dto.ts      // class-validator + @ApiProperty explícitos
      <entity>-response.dto.ts
    <entity>.controller.ts
    <module>-error-mapper.ts      // Traduce errores de dominio/aplicación a HTTP
  test-support/
    in-memory-<entity>.repository.ts
  index.ts                        // Contrato público — único punto de import desde otros módulos
  <module>.module.ts
  <module>.module.spec.ts
```

Ejemplos reales de esta forma exacta: `apps/api/src/modules/crm/`,
`apps/api/src/modules/manufacturing/`. No todas las carpetas son
obligatorias si el módulo es pequeño (`docs/ARCHITECTURE.md` §6) —
Accounting, por ejemplo, no tiene `test-support/` para cada entidad
individual porque su dominio es simple de fabricar inline en los specs.

## 3. Reglas de dependencia (no negociables)

- `domain/` nunca importa NestJS, Prisma, HTTP ni SDKs de proveedores
  (`docs/ARCHITECTURE.md` §6).
- Otro módulo solo se consume a través de su `index.ts` — nunca su
  repositorio ni sus tablas directamente. Ejemplo real:
  `PricingModule` importa `CatalogModule` y llama a `GetProductUseCase`
  (el caso de uso público), nunca `PrismaProductRepository` directamente
  (sesión 25, primera dependencia genuina entre módulos de negocio).
- Un controller que necesita un guard/decorador de otro módulo (p. ej.
  `TenantContextGuard`) vive físicamente en el módulo dueño del guard, no
  donde "temáticamente" parecería pertenecer — la lección real del ciclo
  de módulos de `RolesController` (sesión 5), repetida desde entonces para
  `AuditEntriesController`, `NotificationsController`,
  `MembershipsController` y `AppsController`.

## 4. Multi-tenancy (obligatorio, sin excepción)

- Toda tabla tenant-owned: `tenant_id NOT NULL`, `@@unique([tenantId, id])`,
  y cada FK hacia otra tabla tenant-owned como FK compuesta
  `(tenantId, xId) -> (tenantId, id)` — nunca una FK simple sobre el `id`
  solo. Este patrón, probado por primera vez en RBAC (sesión 5), se
  replicó sin excepción en los 15 módulos de negocio posteriores
  (`docs/DECISIONS.md` ADR-003).
- `companyId` es obligatorio (no opcional) para datos de negocio reales —
  a diferencia de Foundation, un producto/cliente/pedido pertenece
  genuinamente a una empresa, nunca solo al tenant.
- Todo caso de uso deriva tenant/company del contexto autenticado
  (`TenantExecutionContext`), nunca del body del request.
- Todo módulo nuevo necesita al menos un test de integración con **dos
  tenants reales** confirmando que uno no puede leer/escribir datos del
  otro (`docs/MULTITENANCY.md` §13) — no opcional, no pospuesto.

## 5. Dinero y cantidades

Nunca `number`/`float` de JavaScript para dinero, cantidades o
porcentajes (MASTER_SPEC §30/§82). Dos patrones reales, según lo que el
módulo necesite:

- **Solo persistir/validar** un decimal (sin calcular con él): representar
  como string decimal canónico en el dominio, `numeric(precision, scale)`
  en la base — patrón usado por Catalog/Customers/Taxes desde la sesión 23.
- **Calcular** con decimales dentro del dominio (sumar líneas, aplicar un
  porcentaje, multiplicar cantidad×precio): una copia propia y acotada de
  aritmética `BigInt` escalada, sin dependencias externas — nunca
  `Prisma.Decimal` dentro de `domain/` (violaría la regla de §3). Cada
  módulo con esta necesidad (Sales, Inventory, POS, Commerce, Accounting,
  CRM) escribió su propio `domain/decimal.ts` pequeño y acotado a sus
  propias operaciones — no existe (deliberadamente) una librería
  decimal compartida en `packages/`, ya que cada módulo necesita un
  subconjunto distinto de operaciones y compartir prematuramente una
  abstracción sin un segundo caso de uso real habría sido especulativo.

## 6. Migraciones

Generar contra Postgres real, nunca a mano. El comando estándar de este
entorno no interactivo (`prisma migrate dev --create-only` falla cuando
necesita mostrar un prompt de advertencia):

```bash
pnpm --filter @erp/database exec prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --script \
  > <migración>/migration.sql
pnpm --filter @erp/database exec prisma migrate deploy
```

Técnica establecida desde la sesión 26, reutilizada sin cambios en cada
migración posterior. Regenerar el cliente (`prisma generate`) y
reconstruir `@erp/database` antes de que otros paquetes vean los tipos
nuevos.

## 7. Permisos y auditoría

- Permisos nuevos en `FOUNDATION_PERMISSIONS`
  (`apps/api/src/core/access-control/application/permission-catalog.ts`),
  convención `<module>.<resource>.<action>` — típicamente `.read` +
  `.manage`, y ocasionalmente un tercer permiso genuinamente distinto
  cuando el módulo lo exige (p. ej. `purchasing.orders.approve`, separado
  de `.manage`, para segregación de funciones real — sesión 29).
- Cada acción de escritura real graba una entrada de auditoría real
  (`RecordAuditEntryUseCase`, invocado desde el controller, nunca desde el
  use case — mismo patrón desde la sesión 9), acción con nombre
  `<module>.<entity>.<verb_pasado>` (p. ej.
  `manufacturing.order.confirmed`).
- Un tenant provisionado antes de que el módulo existiera no obtiene los
  permisos nuevos automáticamente — hueco real y documentado
  (`docs/SECURITY.md`, "No retroactive permission backfill" hasta la
  sesión 28) resuelto por `OwnerRolePermissionSyncSeeder`, que corre en
  cada arranque y sincroniza el rol Owner de cada tenant contra el
  catálogo vigente. Un módulo nuevo no necesita tocar ese seeder — ya
  cubre cualquier permiso nuevo automáticamente.
- Si el módulo se registra en el App Registry (`FOUNDATION_APPS`,
  ADR-015), cada controller lleva `@RequireApp(<key>)` a nivel de clase,
  después de `TenantContextGuard` — ver `docs/DECISIONS.md` ADR-015 para
  el patrón completo y por qué es a nivel de clase, no de método.

## 8. API y `@erp/api-client`

- Cada DTO con `@ApiProperty`/`@ApiPropertyOptional` explícitos,
  **siempre con `type:` explícito en un campo `nullable`** — omitirlo
  produce un schema OpenAPI vacío para uniones (`string | null`), un bug
  real encontrado en la sesión 21 y evitado proactivamente en cada módulo
  desde entonces.
- Tras levantar el servidor real, regenerar `@erp/api-client` contra el
  `/api/docs-json` real:
  `pnpm --filter @erp/api-client run generate-types` — nunca a mano.
- Excepciones documentadas de tipos generados
  (`packages/api-client/src/contracts.ts`): cuando un parámetro posicional
  del SDK ya cubre un campo del DTO real (p. ej. `cartId` en
  `checkout()`), usar `Omit<...>` explícito — no editar el archivo
  generado.

## 9. Testing

Los cuatro niveles, proporcionales al riesgo (`docs/ROADMAP.md` §3), en
el orden en que cada módulo real los construyó:

1. **Unitarios** (dominio + casos de uso, repositorio in-memory de
   `test-support/`) — la mayoría de la cobertura real vive aquí.
2. **Integración** (`apps/api/test/integration/<module>.integration-spec.ts`,
   contra Postgres real vía Testcontainers, reutilizando
   `postgres-test-harness.ts`) — obligatorio al menos un escenario de
   ciclo de vida completo y uno de aislamiento cross-tenant.
3. **Wiring del módulo** (`<module>.module.spec.ts`) — confirma que el
   grafo de DI real compila con solo `PrismaService` stubbeado, atrapa un
   provider faltante o un ciclo antes de que se manifieste en runtime.
4. **E2E** (`apps/e2e/tests/<module>.spec.ts`, Chromium real vía
   Testcontainers) — ciclo de vida completo por navegador real contra la
   UI real. Precaución real y repetida en este código base: `Tabs`
   (`shared/ui/tabs.tsx`) nunca desmonta paneles inactivos, así que
   `getByText`/`getByLabel` sin `{ exact: true }` puede coincidir con
   texto de una pestaña montada en paralelo — encontrado y corregido en
   Purchasing, Manufacturing y otros módulos; usar `{ exact: true }` o
   `getByRole` con scope desde el principio evita la ronda de depuración.

## 10. UI (`apps/erp-web`)

- Feature nueva bajo `apps/erp-web/src/features/<module>/`, ruta plana
  nueva en `shared/navigation/router.ts`, botón en el workspace.
- Listas/formularios que varias pestañas comparten (p. ej. catálogo de
  productos, lista de bodegas) se cargan **una sola vez a nivel de
  página**, no por pestaña activa — lección real de POS (sesión 30,
  corregida reactivamente) aplicada proactivamente en cada módulo desde
  Purchasing en adelante.
- Un componente genérico entre dos formularios similares es correcto
  cuando la UI no carga riesgo de divergencia de reglas de negocio
  (Contacts' `ContactPanel<T>` para Customer/Supplier); tres formularios
  con shapes de campo genuinamente distintos se quedan separados
  (Comercial: Impuestos/Bodegas/Precios, sesión 25) — no forzar una
  abstracción para ahorrar líneas si el costo es plumbing dinámico.

## 11. Qué NO incluye este template

- Un generador de código real (`plop`/`hygen`/CLI propio) — nadie lo ha
  pedido y copiar el patrón a mano 15 veces ya demostró ser manejable;
  construir uno ahora sería infraestructura sin consumidor real.
- "Previews" (entornos de PR desplegados automáticamente) — el otro ítem
  de Developer platform en `docs/ROADMAP.md` §17 además de este template,
  deliberadamente fuera de este bloque: requiere infraestructura de
  despliegue real que este código base no tiene (`docs/PROJECT_STATE.md`
  "Production Status": *Not deployed*) — mismo gate de evidencia ya
  aplicado a Fase 12.
