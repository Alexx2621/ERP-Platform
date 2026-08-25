# Event Architecture V1 — Propuesta

Estado: **Propuesta para aprobación**

Alcance: eventos de dominio, eventos de integración, outbox, jobs e idempotencia

## 1. Decisión V1

V1 tendrá dos mecanismos explícitamente distintos:

- **Domain events**: hechos internos del dominio, in-process, usados dentro del bounded context y, excepcionalmente, por handlers internos estrechamente controlados.
- **Integration events**: contratos versionados entre módulos, workers o sistemas externos; se persisten en transactional outbox y se entregan al menos una vez.

BullMQ/Redis será transporte de trabajo, no fuente de verdad. PostgreSQL conservará estado, outbox e inbox. No se usará Kafka ni un broker distribuido en V1.

La arquitectura no es event sourcing. El estado actual vive en tablas relacionales; Audit Log, Domain Events y Integration Events tienen fines diferentes.

## 2. Principios

- Un evento describe un hecho ya ocurrido; no es una orden disfrazada.
- Si una invariante debe cumplirse antes de responder, se usa un caso de uso/port síncrono y una transacción.
- La escritura de estado y del outbox ocurre en la misma transacción.
- La entrega es **at-least-once**; los consumers deben tolerar duplicados.
- No se promete “exactly once”. Se busca **exactly-once effect** mediante idempotencia y constraints.
- Los contratos son pequeños, versionados, tenant-aware y sin datos sensibles innecesarios.
- Producers no conocen la implementación ni el orden de sus consumers.
- Un consumer no muta tablas de otro módulo.
- Retries solo corrigen fallos transitorios; errores permanentes terminan en dead-letter/quarantine con visibilidad operativa.
- Correlation y causation atraviesan request, transacción, outbox, job e integración.

## 3. Taxonomía

### 3.1 Domain Event

Hecho expresado en el lenguaje del bounded context, generado por un aggregate o use case.

Ejemplos conceptuales:

- `CompanyActivated`
- `MembershipRevoked`
- `SalesOrderConfirmed`
- `InventoryReservationCreated`

Características:

- Puede contener tipos ricos internos.
- No es API pública.
- Puede cambiar junto con el módulo.
- Se procesa dentro de los límites transaccionales definidos por el módulo.
- No se serializa automáticamente ni se publica externamente.

### 3.2 Integration Event

Hecho estable que otro módulo/proceso puede consumir sin conocer internals del producer.

Ejemplos:

- `organization.company.activated.v1`
- `sales.order.confirmed.v1`
- `payments.payment.received.v1`

Características:

- Schema serializable y versionado.
- Payload autocontenido solo con datos necesarios.
- Persistido en outbox.
- Compatible hacia atrás dentro de una major version.
- Puede originar jobs, webhooks o adapters externos.

### 3.3 Application Notification

Señal in-process para desacoplar pasos no críticos dentro de una aplicación. No tiene garantías durables y no debe usarse para trabajo que no puede perderse. Si el proceso cae y el efecto debe ocurrir, se requiere outbox.

### 3.4 Job

Solicitud de trabajo asíncrono, no un hecho de dominio: `GenerateReport`, `SendEmail`, `ProcessImage`. Los jobs viven en BullMQ, tienen contrato, retries e idempotency key propios. Pueden crearse a partir de un integration event.

### 3.5 Webhook

Proyección externa allowlisted de un integration event. Tiene contrato público, firma, delivery log, retry policy y secreto independientes. No todos los eventos internos se exponen como webhook.

### 3.6 Audit Entry

Registro de quién hizo qué, cuándo y sobre qué recurso. Puede compartir correlation ID con un evento, pero no lo sustituye ni debe alimentar lógica de negocio.

## 4. Cuándo usar sync y cuándo evento

| Necesidad | Mecanismo |
| --- | --- |
| Validar permiso o consultar dato requerido ahora | Port/facade síncrono |
| Preservar invariantes en una operación atómica | Use case + transacción síncrona |
| Notificar un hecho a varios módulos sin bloquear respuesta | Integration event + outbox |
| Ejecutar email, PDF, image processing o sync externo | Job BullMQ idempotente |
| Comunicar con tercero | Adapter async + outbox/job |
| Obtener respuesta inmediata de payment gateway | Port síncrono resiliente; persistir resultado/outbox atómicamente |

Ejemplo: si confirmar una orden exige reservar inventario, `ConfirmSalesOrder` llama un port de Inventory dentro del mismo proceso/transacción V1. Solo después publica `sales.order.confirmed.v1`. Notifications y CRM reaccionan async. No se confirma la orden esperando que un evento quizá reserve stock después.

## 5. Flujo de publicación

```text
HTTP / job command
  -> application use case
  -> begin PostgreSQL transaction
       -> mutate aggregate-owned tables
       -> write audit entry if required
       -> map selected domain fact to integration event
       -> insert outbox_messages
  -> commit
  -> return

Outbox dispatcher (worker)
  -> claim pending rows with DB locking
  -> enqueue/deliver
  -> consumer receives one or more times
       -> check inbox/idempotency
       -> execute local transaction
       -> persist consumer state + inbox record + optional new outbox
  -> mark delivery state / schedule retry
```

El publisher no envía a Redis antes del commit. El worker puede caer en cualquier punto; el diseño debe permitir reclamar el mensaje o procesarlo otra vez sin duplicar el efecto.

## 6. Envelope de integration event

Campos requeridos:

```json
{
  "eventId": "uuid-v7",
  "eventType": "sales.order.confirmed.v1",
  "eventVersion": 1,
  "occurredAt": "2026-08-25T18:30:00.000Z",
  "producer": "sales",
  "tenantId": "uuid-v7",
  "companyId": "uuid-v7-or-null",
  "aggregateType": "SalesOrder",
  "aggregateId": "uuid-v7",
  "aggregateVersion": 7,
  "correlationId": "uuid",
  "causationId": "uuid-or-null",
  "actor": {
    "type": "USER",
    "id": "uuid-v7"
  },
  "traceparent": "optional-w3c-trace-context",
  "payload": {}
}
```

Reglas:

- `eventId` identifica la emisión, no el aggregate.
- `eventType` contiene major version; `eventVersion` facilita validación/telemetría.
- `tenantId` es obligatorio para eventos tenant-owned; los eventos platform-global están en allowlist.
- `companyId` se incluye solo cuando el hecho tiene ese scope.
- `actor` describe quién causó el hecho; el proceso worker actual queda en logs/audit separados.
- `payload` no replica toda la entidad. Incluye IDs y valores estables necesarios para evitar lecturas acopladas.
- No contiene passwords, tokens, secretos, PAN, CVV ni PII innecesaria.
- El schema publicado es inmutable; cambios incompatibles crean `v2`.

## 7. Nomenclatura y schemas

- Integration event: `<bounded-context>.<aggregate>.<past-tense>.v<major>`.
- Lowercase `dot.case`, en inglés y en pasado.
- Ejemplos: `identity.membership.revoked.v1`, `inventory.reservation.created.v1`.
- Jobs: `<bounded-context>.<verb-noun>.v<major>`, por ejemplo `notifications.send-email.v1`.
- Domain event en código: `PascalCase`, por ejemplo `MembershipRevoked`.

Cada integration event tiene:

- owner/producer;
- propósito y consumers conocidos;
- JSON Schema o schema runtime equivalente;
- ejemplos válidos;
- clasificación de datos;
- política de retención;
- semántica de ordering e idempotencia;
- changelog de compatibilidad.

Los schemas viven en un paquete de contracts. Compartir schema no permite importar lógica, entidades o repositorios del producer.

## 8. Transactional outbox

### 8.1 Campos conceptuales

`outbox_messages`:

- `id` / event ID;
- `tenant_id`, `company_id` opcional;
- `event_type`, `event_version`;
- `aggregate_type`, `aggregate_id`, `aggregate_version`;
- envelope/payload JSONB validado;
- `occurred_at`, `available_at`;
- `status` (`PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`);
- `attempt_count`, `last_error_code` sanitizado;
- `locked_at`, `locked_by`;
- `published_at`;
- correlation/causation/trace metadata.

### 8.2 Claim y recuperación

- Workers reclaman lotes pequeños con `FOR UPDATE SKIP LOCKED` o mecanismo equivalente validado.
- Un lease vencido hace recuperable un mensaje `PROCESSING`.
- Los intentos usan exponential backoff con jitter y máximo por tipo.
- La publicación exitosa se marca después de que el transporte acepte el mensaje.
- Si el worker cae entre entrega y marcado, habrá duplicado; el consumer debe ser idempotente.
- Los fallos permanentes se clasifican y pasan a `FAILED`/DLQ sin loops infinitos.
- Retención y purga son jobs operativos auditados; no borrado ad hoc.

## 9. Inbox e idempotencia

`inbox_messages` registra, por consumer lógico:

- `consumer_name`;
- `message_id`;
- tenant/scope;
- `received_at`, `processed_at`;
- resultado/estado y error sanitizado.

Constraint mínimo: unique `(consumer_name, message_id)`.

El check de inbox, el efecto del consumer y la marca de procesado ocurren en la misma transacción local. Cuando un provider no admite transacción conjunta, se utiliza su idempotency key o una state machine reconciliable.

### 9.1 Idempotency keys de comandos

Pagos, webhooks, imports y creación externa de órdenes guardan una clave con:

- tenant/integration scope;
- operación;
- key normalizada o hash;
- hash del request relevante;
- resultado/recurso creado;
- estado y expiración.

La misma key + mismo request devuelve el resultado anterior. La misma key + request diferente devuelve conflicto. El TTL depende del dominio; no se adopta uno global.

## 10. Ordering y concurrencia

- No existe orden global.
- Para un aggregate, `aggregateVersion` permite detectar gaps o eventos obsoletos.
- BullMQ concurrency se configura por consumer, pero no se asume FIFO como garantía de consistencia.
- Si un consumer requiere orden por aggregate, serializa por clave o rechaza/reprograma gaps.
- Un evento antiguo nunca sobrescribe un estado más nuevo sin comprobación de versión.
- Timestamps no sustituyen versiones para resolver concurrencia.

## 11. Retries, errores y DLQ

Clasificación:

| Clase | Ejemplos | Acción |
| --- | --- | --- |
| Transitorio | timeout, 429, provider 5xx | retry con backoff/jitter |
| Permanente de datos | schema inválido, recurso imposible | DLQ/quarantine, alerta, no retry infinito |
| Autorización/configuración | módulo deshabilitado, secret revocado | pausar/reconciliar según handler |
| Bug | excepción inesperada repetida | retry limitado, DLQ y alerta |

La DLQ conserva event ID, consumer, attempts, timestamps y error sanitizado. Replay requiere autorización, motivo, audit entry y el mismo idempotency control. No se edita el payload original para “hacerlo pasar”; se corrige causa o se crea una acción compensatoria.

## 12. Eventos entre módulos

- El producer es dueño del nombre y schema.
- El consumer es dueño de su handler, inbox y retry policy.
- Ningún producer bloquea una transacción esperando handlers async.
- Un evento no concede acceso a datos de otro tenant.
- Un consumer puede ignorar eventos de un módulo deshabilitado según contrato, pero debe registrar la decisión cuando afecte operación.
- Los ciclos de eventos se revisan explícitamente; cada evento nuevo debe declarar causation para detectarlos.

Para workflows largos se preferirá una state machine/orchestrator explícita en el módulo dueño del proceso. No se construirán sagas genéricas antes de un caso real.

## 13. Webhooks salientes

El subsistema futuro de webhooks deberá:

- exponer solo eventos allowlisted y schemas públicos;
- crear un delivery por endpoint y event;
- firmar timestamp + body con HMAC y secreto rotatable;
- impedir replay con timestamp/event ID;
- usar HTTPS, límites de tamaño, timeouts y protección SSRF;
- reintentar con backoff y registrar response code/latency, no secretos;
- permitir disable automático de endpoints fallidos con visibilidad;
- conservar delivery logs según retención.

No se envía el event envelope interno completo sin revisión de datos.

## 14. Webhooks entrantes

Orden mínimo:

1. Capturar body raw dentro del límite.
2. Identificar provider/installation sin confiar en el payload.
3. Verificar firma, timestamp y secreto activo.
4. Persistir receipt/idempotency key.
5. Responder rápido según contrato del proveedor.
6. Procesar async.
7. Verificar contra el provider cuando el dominio lo requiera.
8. Aplicar state transition idempotente y auditada.

Nunca se acredita un pago solo porque un payload no verificado diga “paid”.

## 15. Observabilidad

Métricas mínimas:

- outbox pending count y edad del más antiguo;
- throughput, publish latency y attempts;
- consumer success/failure/retry/DLQ;
- queue depth y job duration;
- duplicates detectados;
- event version/schema failures;
- webhook delivery success y provider latency.

Logs y traces incluyen event ID, type, tenant, aggregate, correlation y causation. Payload completo se excluye por defecto.

Alertas operativas iniciales:

- edad de outbox supera SLO;
- crecimiento sostenido de DLQ;
- consumer detenido o retry storm;
- duplicados anormalmente altos;
- fallo de firma o webhook replay repetido.

## 16. Testing obligatorio

- Estado y outbox se guardan juntos o ninguno se guarda.
- Crash antes/después de enqueue no pierde el mensaje.
- Un evento duplicado produce un solo efecto.
- Dos workers no reclaman efectivamente el mismo efecto sin dedupe.
- Retry respeta clasificación y termina en DLQ al exceder política.
- Events de Tenant A nunca mutan datos de Tenant B.
- Gaps/versiones obsoletas siguen la policy del consumer.
- Schema compatibility bloquea cambios breaking silenciosos.
- Correlation/causation se propagan.
- Replay autorizado no duplica resultados.

## 17. Evolución

Se evaluará un broker externo solo cuando las métricas muestren limitaciones reales en throughput, routing, retención/replay o separación de despliegue. Antes de migrar se estabilizan contracts y semánticas; outbox permanece como frontera transaccional. Elegir RabbitMQ/Kafka será un ADR basado en requisitos, no una consecuencia automática del crecimiento.
