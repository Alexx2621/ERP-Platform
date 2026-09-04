# PII Classification

Estado: primera versión, sesión 36 (2026-09-04) — workstream de Data
lifecycle (`docs/ROADMAP.md` §17: "PII classification por module").

Alcance: inventario real de cada campo que almacena datos personales o
identificables en `packages/database/prisma/schema.prisma`, con su
clasificación y el manejo actual verificado contra el código real — no un
diseño aspiracional. Complementa, sin duplicar, los modelos de amenazas
por módulo ya existentes en `docs/SECURITY.md`.

## 1. Clasificación

| Nivel | Significado | Ejemplos en este código base |
| --- | --- | --- |
| **Directa** | Identifica a una persona física por sí sola o casi por sí sola. | `email`, `phone`, nombre de contacto. |
| **Indirecta** | Identifica a una persona combinada con otro dato, o describe su comportamiento/ubicación. | `ipAddress`, `userAgent`, dirección postal. |
| **Secreto de autenticación** | No es "PII" en el sentido de identificar a una persona, pero exige el mismo o mayor cuidado — nunca se registra en texto plano ni en logs. | `passwordHash`, `accessTokenHash`/`refreshTokenHash`. |
| **Libre/no estructurada** | Campo de texto libre donde un humano puede escribir cualquier cosa, incluida PII no anticipada por el schema. | `Activity.notes`, `Quote.notes`, `FileObject.originalFilename`. |
| **No PII** | Dato de negocio sin relación con una persona física identificable. | `Product.description`, `JournalEntry.description`, montos, códigos. |

## 2. Inventario por modelo

### Platform Core (`core/`)

| Modelo | Campo(s) | Nivel | Manejo actual verificado |
| --- | --- | --- | --- |
| `User` | `email` | Directa | Único a nivel de plataforma; nunca expuesto a otro tenant sin relación real (`docs/SECURITY.md` "Authentication"). |
| `User` | `displayName` | Directa | Nombre de persona, sin validación de formato — texto libre del usuario. |
| `UserCredential` | `passwordHash` | Secreto de autenticación | Argon2id (ADR-006) — nunca texto plano, nunca logueado. |
| `Session` | `accessTokenHash`, `refreshTokenHash` | Secreto de autenticación | SHA-256 de tokens opacos (ADR-006) — la fila nunca guarda el token real, solo su hash. |
| `Session` | `ipAddress`, `userAgent` | Indirecta | Capturados por request real de login/refresh; sin retención propia — viven mientras la sesión exista. |
| `AuditEntry` | `ipAddress`, `userAgent` (dentro de `previousValues`/`newValues`/campos dedicados según la acción) | Indirecta | Append-only por diseño (MASTER_SPEC §10) — nunca se borra ni se anonimiza; ver "Huecos" abajo. |
| `Notification` | `body`, `data` (JSON) | Indirecta (potencial) | El contenido lo decide cada producer (`RequestNotificationUseCase`) — puede referenciar nombre/email de otra persona si el producer lo incluye; sin sanitización estructural en la infraestructura. |
| `FileObject` | `originalFilename` | Libre/no estructurada | Nombre de archivo tal cual lo sube el usuario (p. ej. `"Pasaporte_Juan_Perez.pdf"`) — el contenido del archivo en sí (fuera del alcance de este inventario, que cubre solo la base de datos) puede contener PII arbitraria, protegido por URLs firmadas de corta duración (`docs/SECURITY.md` "Files"). |

### Master Data (`modules/customers`, `modules/suppliers`, `modules/crm`)

| Modelo | Campo(s) | Nivel | Manejo actual verificado |
| --- | --- | --- | --- |
| `Customer` | `legalName`, `email`, `phone`, `addressLine`, `city`, `country` | Directa/Indirecta | Todos opcionales salvo `name`/`code`; contrato de tres estados (omitir/`""`/valor) para no perder datos en updates parciales (sesión 23). |
| `Supplier` | mismos campos que `Customer` | Directa/Indirecta | Mismo manejo — entidades deliberadamente separadas, sin un modelo "Party" compartido (`docs/DATABASE.md`). |
| `Lead` | `name`, `companyName`, `email`, `phone` | Directa | `consentMarketing`/`consentedAt` reales (sesión 33) — el único modelo de este código base con un campo de consentimiento explícito, per el exit criterion de `docs/ROADMAP.md` §13. |
| `Activity` | `notes` | Libre/no estructurada | Hasta 2000 caracteres de texto libre, casi siempre relacionado con un lead/oportunidad/cliente real — el campo de mayor riesgo de PII no anticipada de todo el schema. |
| `CommerceOrder` | `guestEmail` | Directa | Checkout público sin autenticación (Fase 7A) — el único email capturado sin que el titular tenga cuenta ni sesión en la plataforma. |

### Otros módulos de negocio

| Modelo | Campo(s) | Nivel | Nota |
| --- | --- | --- | --- |
| `Quote`, `PurchaseOrder`, `PurchaseReceipt`, `SupplierInvoice`, `PosShift` | `notes` | Libre/no estructurada (riesgo bajo) | Contexto operativo (p. ej. "diferencia de caja $5"), rara vez sobre una persona identificable — a diferencia de `Activity.notes`, no está estructuralmente ligado a un contacto real. |
| `Payment` | `gatewayReference`, `failureReason` | No PII | **Confirmado por lectura directa del schema**: ningún campo de `Payment` almacena PAN, CVV ni datos de tarjeta — consistente con MASTER_SPEC §22 y ADR-009 (sin gateway credenciado en V1). |
| `Product`, `JournalEntry`/`JournalEntryLine`, `PipelineStage`, `BillOfMaterial`, etc. | `description` | No PII | Texto de negocio, sin relación con una persona física. |

**Campos con nombre engañoso, verificados y descartados como falso
positivo**: `QuoteLine.taxId` y `SalesOrderLine.taxId` son claves foráneas
reales hacia `Tax` (una tasa impositiva configurada por la empresa), no un
número de identificación fiscal de una persona — confirmado leyendo el
propio modelo antes de clasificarlo, no asumido por el nombre del campo.

## 3. Manejo transversal ya verificado (no aspiracional)

- **Ningún secreto en logs.** ADR-006/`docs/SECURITY.md` documentan que
  contraseñas, tokens y datos de tarjeta nunca se registran — verificado
  por inspección de cada punto de logging estructurado (`Logger` de Nest)
  en los schedulers/dispatchers de este código base.
- **Aislamiento cross-tenant real** (`docs/MULTITENANCY.md`, ADR-003)
  cubre todo dato PII tenant-owned de la misma forma que cualquier otro
  dato — un `Customer`/`Lead`/`Session` de un tenant es estructuralmente
  invisible para otro vía el patrón composite-FK.
- **IDOR-resistant por diseño**: `GetFileDownloadUrlUseCase`,
  `MarkNotificationReadUseCase` y equivalentes devuelven el mismo `404`
  para "no existe" y "es de otro tenant/usuario" — un atacante no puede
  distinguir ambos casos para enumerar recursos ajenos.

## 4. Huecos reales, no fabricados

- **Sin flujo de acceso/exportación de datos personales** ("derecho de
  acceso" tipo GDPR/LGPD). Ningún endpoint permite a un usuario o a un
  administrador exportar todo el PII asociado a una persona. MASTER_SPEC
  §83/84 ya condiciona import/export general a un caso de uso real; lo
  mismo aplica aquí — no se fabrica en este bloque.
- **Sin flujo de anonimización/borrado** ("derecho al olvido"). Deshabilitar
  un `User`/`Customer`/`Lead` cambia su `status`, pero nunca anonimiza sus
  campos PII. Construir esto correctamente requeriría decidir qué pasa con
  cada FK real hacia esa fila (órdenes, pagos, auditoría — que
  MASTER_SPEC §10 exige preservar) — una decisión de producto/legal real
  que este código base no tiene base para inventar sin un requisito
  concreto, la misma razón por la que Fase 12 sigue evidence-gated.
- **`AuditEntry` es append-only para siempre**, por diseño
  (MASTER_SPEC §10) — cualquier PII que entre en `previousValues`/
  `newValues` (p. ej. el email anterior de un `Customer` editado) queda
  ahí permanentemente. Esto es una tensión real y sin resolver entre
  auditabilidad (requisito explícito) y minimización de datos — documentada
  aquí, no oculta.
- **Campos libres (`Activity.notes`, `originalFilename`, `Notification.body`)
  no tienen ninguna validación ni escaneo de contenido.** Cualquier PII que
  un usuario escriba ahí queda tal cual, sin clasificación automática — un
  humano puede pegar un número de tarjeta en una nota de CRM y el sistema
  no lo detectaría. Fuera de alcance de este bloque (exigiría un motor de
  detección de PII, infraestructura real que no existe y no se fabrica
  aquí).
- **Sin retención dedicada para PII más allá de lo ya construido**: Files
  tiene retención real (`FILES_PURGE_RETENTION_DAYS`, sesión 20), el
  outbox ahora también (`OUTBOX_PURGE_RETENTION_DAYS`, sesión 36) — pero
  `sessions` revocadas/expiradas, `notifications` leídas y
  `audit_entries` no tienen ningún job de purga propio. Sesiones/
  notificaciones son candidatas reales para un futuro bloque de esta
  misma naturaleza; `audit_entries` deliberadamente no, por la razón ya
  explicada arriba.

## 5. Cómo mantener esto actualizado

Este documento es un inventario, no un generador automático — un módulo
nuevo que agregue un campo con nombre `email`/`phone`/`address`/`notes`/
similar debe agregarse aquí en la misma sesión que lo introduce, siguiendo
la tabla de clasificación de la sección 1. No existe todavía una
verificación de CI que falle si un campo PII nuevo no se documenta aquí —
el mismo tipo de deuda técnica aceptada ya documentada para las
architecture fitness functions de `docs/ARCHITECTURE.md` §16.
