# PROMPT MAESTRO — PLATAFORMA EMPRESARIAL MODULAR ERP + E-COMMERCE + POS + PLUGINS

Quiero que actúes como **arquitecto de software senior, desarrollador full-stack senior, especialista en sistemas ERP, SaaS multi-tenant, arquitectura modular, seguridad, bases de datos, e-commerce, sistemas POS, DevOps y diseño de software empresarial escalable**.

Tu tarea será ayudarme a diseñar y desarrollar desde cero una plataforma empresarial moderna, estable, segura, modular y altamente escalable.

No quiero desarrollar simplemente un ERP tradicional.

Quiero construir una **plataforma empresarial modular generalizada**, capaz de adaptarse a la mayor cantidad posible de tipos de negocio mediante módulos, aplicaciones, canales, configuraciones e integraciones.

La plataforma debe poder evolucionar durante muchos años sin necesidad de reescribir completamente el sistema.

---

# 1. VISIÓN GENERAL DEL PRODUCTO

La plataforma debe funcionar como un ecosistema empresarial central.

Debe existir un núcleo principal llamado:

**ERP Core / Platform Core**

Sobre este núcleo se deberán poder agregar módulos como:

- Productos
- Catálogos
- Inventarios
- Ventas
- Compras
- Clientes
- Proveedores
- CRM
- Cuentas por cobrar
- Cuentas por pagar
- Contabilidad
- Bancos
- Caja
- Gastos
- Cotizaciones
- Pedidos
- Facturación
- Producción
- Manufactura
- Recursos humanos
- Nómina
- Proyectos
- Servicios
- Reportes
- Business Intelligence
- Auditoría
- E-commerce
- POS
- B2B
- Portal de clientes
- Aplicaciones móviles
- Integraciones externas

No todos los clientes deberán utilizar todos los módulos.

Cada empresa podrá habilitar únicamente los módulos que necesite.

Ejemplo:

Empresa A:

- Productos
- Inventario
- Ventas
- POS

Empresa B:

- Productos
- Inventario
- Compras
- Manufactura
- E-commerce

Empresa C:

- CRM
- Ventas
- Contabilidad
- Facturación
- Portal de clientes

El sistema debe estar diseñado para soportar esta filosofía desde su arquitectura inicial.

---

# 2. PRINCIPIO FUNDAMENTAL

No quiero construir un sistema diferente para cada industria.

Quiero construir:

**una plataforma base + módulos + canales + integraciones + extensiones**

La plataforma deberá permitir eventualmente soluciones especializadas para industrias como:

- Retail
- Distribuidoras
- Mayoristas
- Restaurantes
- Manufactura
- Textiles
- Clínicas
- Talleres
- Empresas de servicios
- E-commerce
- Hoteles
- Construcción
- Logística
- Empresas B2B
- Comercios con varias sucursales

Sin contaminar el Core con lógica específica de cada industria.

---

# 3. ARQUITECTURA GENERAL

La arquitectura inicial debe ser:

**Modular Monolith**

NO comenzar con microservicios.

Sin embargo, cada módulo debe estar suficientemente desacoplado para que en el futuro pueda convertirse en un microservicio si existe una razón real.

Utilizar los siguientes principios:

- Modular Monolith
- Domain Driven Design cuando aporte valor
- Clean Architecture
- SOLID
- Separation of Concerns
- Dependency Inversion
- Event Driven Architecture
- API First
- Multi-Tenant Architecture
- RBAC
- Auditability
- Extensibility
- High Cohesion
- Low Coupling

Evitar sobrearquitectura innecesaria.

La prioridad debe ser:

1. Correctitud
2. Seguridad
3. Mantenibilidad
4. Escalabilidad
5. Rendimiento
6. Experiencia de desarrollo

---

# 4. STACK TECNOLÓGICO PRINCIPAL

Utilizar preferentemente:

## Lenguaje

TypeScript

Debe utilizarse TypeScript tanto como sea posible en backend y frontend.

Evitar `any` salvo que exista una justificación técnica clara.

---

## Backend

Node.js LTS

NestJS

Arquitectura modular.

REST API inicialmente.

OpenAPI / Swagger para documentación.

No comenzar con GraphQL salvo que aparezca posteriormente una necesidad real.

---

## Base de datos

PostgreSQL

Será la base de datos principal y fuente de verdad del sistema.

Debe aprovechar:

- relaciones
- foreign keys
- constraints
- índices
- transactions
- ACID
- JSONB cuando tenga sentido
- locking
- timestamps
- views cuando aporten valor

No utilizar MongoDB, Firebase o bases NoSQL como almacenamiento principal de operaciones financieras, inventarios o ventas.

---

## ORM

Prisma.

Sin embargo, evitar acoplar la lógica de negocio directamente a Prisma.

Preferir:

Controller
↓
Application Service / Use Case
↓
Domain
↓
Repository Interface
↓
Prisma Repository
↓
PostgreSQL

---

## Frontend ERP

React

TypeScript

Vite

El ERP administrativo será principalmente una aplicación web.

---

## E-commerce

Next.js

TypeScript

Separar claramente:

Commerce Engine

de

Storefront.

El Commerce Engine contiene lógica de negocio.

El Storefront contiene experiencia visual y presentación.

---

## Estilos

Tailwind CSS.

Crear un Design System propio.

No depender completamente de una librería visual externa.

Crear componentes reutilizables como:

- Button
- Input
- Select
- Modal
- Drawer
- Table
- DataGrid
- Badge
- Card
- Form
- DatePicker
- CurrencyInput
- QuantityInput
- Sidebar
- Header
- Tabs
- Notifications
- Command Palette

---

## Cache

Redis.

Utilizar para:

- caché
- rate limiting
- sesiones si corresponde
- locks
- datos temporales
- colas

Redis NO será la fuente principal de verdad.

---

## Jobs y colas

BullMQ + Redis inicialmente.

Ejemplos:

- enviar correos
- generar PDFs
- procesar imágenes
- sincronizar marketplaces
- procesar webhooks
- enviar notificaciones
- generar reportes pesados
- procesar exportaciones
- tareas periódicas

---

## Archivos

Storage compatible con S3.

Producción:

Amazon S3 o equivalente.

Desarrollo local:

MinIO.

Nunca depender del almacenamiento local del servidor para documentos importantes.

---

## Contenedores

Docker.

El proyecto debe poder ejecutarse localmente mediante Docker Compose.

No utilizar Kubernetes inicialmente.

Preparar la arquitectura para que pueda utilizarse posteriormente si el tamaño del sistema realmente lo requiere.

---

## Monorepo

pnpm

Turborepo

Estructura conceptual:

apps/
- api
- erp-web
- ecommerce
- worker
- docs

packages/
- ui
- config
- types
- sdk
- auth
- events
- utilities
- plugin-sdk

---

# 5. ESTRUCTURA DEL BACKEND

Diseñar inicialmente algo similar a:

src/

core/
    auth/
    tenants/
    organizations/
    companies/
    users/
    roles/
    permissions/
    audit/
    configuration/
    events/
    files/
    notifications/

modules/
    customers/
    suppliers/
    products/
    catalog/
    inventory/
    sales/
    purchasing/
    payments/
    accounting/
    crm/
    ecommerce/
    pos/
    manufacturing/

integrations/
    payments/
    shipping/
    tax/
    messaging/
    marketplaces/

shared/
    domain/
    infrastructure/
    application/
    utilities/

La estructura exacta podrá ajustarse si existe una mejor solución.

Explica siempre el motivo de cualquier cambio importante.

---

# 6. MULTI-TENANCY

El sistema debe ser multi-tenant desde el principio.

Debe diferenciar correctamente conceptos como:

Platform

Tenant

Organization

Company

Branch

Location

Warehouse

No asumir que todos son lo mismo.

Modelo conceptual inicial:

Platform
↓
Tenant
↓
Organization
↓
Company
↓
Branch / Location
↓
Warehouse

Un Tenant representa un cliente de la plataforma.

Un Tenant puede tener una o varias organizaciones o empresas.

Una empresa puede tener múltiples sucursales.

Una sucursal puede tener múltiples ubicaciones operativas.

Una empresa puede tener múltiples bodegas.

No todos los registros necesitarán todos los IDs.

Diseñar correctamente el alcance.

Ejemplo:

Product puede pertenecer a company.

InventoryMovement deberá conocer company y warehouse.

User puede pertenecer al Tenant y tener acceso a diferentes empresas.

Nunca confiar únicamente en filtros del frontend para aislamiento de datos.

La separación multi-tenant debe protegerse desde backend.

---

# 7. SEGURIDAD MULTI-TENANT

Toda consulta debe considerar el Tenant correspondiente.

Nunca debe ser posible modificar una URL o ID y acceder a información de otro Tenant.

Implementar posteriormente pruebas automatizadas específicas para verificar aislamiento entre tenants.

Considerar estrategias como:

tenant_id

company_id

scoped repositories

guards

policies

database constraints

y eventualmente Row Level Security de PostgreSQL si se considera conveniente.

Explicar ventajas y desventajas antes de implementarlo.

---

# 8. AUTENTICACIÓN

Diseñar autenticación profesional.

Debe soportar eventualmente:

- correo + contraseña
- MFA
- recuperación de contraseña
- sesiones
- dispositivos
- revocación de sesiones
- OAuth
- OpenID Connect
- SSO empresarial
- API Keys
- Service Accounts

Las contraseñas jamás deben almacenarse sin hashing seguro.

Usar algoritmos modernos adecuados.

Proteger contra:

- brute force
- credential stuffing
- session hijacking
- CSRF cuando corresponda
- XSS
- SQL injection
- privilege escalation

---

# 9. AUTORIZACIÓN

Implementar RBAC granular.

No limitarse a:

ADMIN
USER

Crear permisos como:

products.read
products.create
products.update
products.delete

inventory.read
inventory.adjust
inventory.transfer

sales.orders.read
sales.orders.create
sales.orders.cancel

purchasing.orders.create

accounting.entries.read
accounting.entries.post

users.manage
roles.manage

Cada usuario puede tener uno o varios roles.

Los roles tendrán múltiples permisos.

Posteriormente evaluar ABAC para casos complejos.

---

# 10. AUDITORÍA

Toda operación crítica deberá dejar registro.

Ejemplos:

- creación de usuario
- modificación de permisos
- eliminación de producto
- cambio de precio
- ajuste de inventario
- cancelación de venta
- devolución
- cambio de factura
- modificación contable

Registrar cuando corresponda:

user_id

tenant_id

company_id

action

resource

resource_id

previous_values

new_values

ip_address

user_agent

timestamp

correlation_id

Los logs de auditoría no deben poder modificarse fácilmente.

---

# 11. EVENT-DRIVEN ARCHITECTURE

Crear un Event Bus interno.

Ejemplos de eventos:

ProductCreated

ProductUpdated

CustomerCreated

OrderCreated

OrderConfirmed

OrderPaid

OrderCancelled

InventoryReserved

InventoryReleased

InventoryAdjusted

PaymentReceived

PaymentFailed

InvoiceIssued

ProductionStarted

ProductionCompleted

Los módulos deben reaccionar a eventos cuando corresponda.

Ejemplo:

OrderPaid

puede provocar:

Inventory
→ confirmar salida

Accounting
→ crear movimiento

CRM
→ actualizar comportamiento del cliente

Loyalty
→ agregar puntos

Notifications
→ enviar confirmación

Evitar dependencias directas innecesarias entre módulos.

---

# 12. EVENTOS DE DOMINIO VS EVENTOS DE INTEGRACIÓN

Diferenciar:

Domain Events

de

Integration Events.

No publicar indiscriminadamente todos los eventos fuera del sistema.

Preparar eventualmente un patrón Transactional Outbox para integraciones externas y alta confiabilidad.

---

# 13. IDEMPOTENCIA

Las operaciones críticas deben ser idempotentes cuando corresponda.

Especialmente:

- pagos
- webhooks
- creación de pedidos externos
- sincronizaciones
- facturación
- procesamiento de eventos

Evitar que un webhook repetido genere dos pagos o dos ventas.

---

# 14. MOTOR DE PLUGINS / APPS

Quiero que eventualmente la plataforma permita agregar módulos o aplicaciones.

No implementar inicialmente ejecución insegura de código externo arbitrario.

Primero desarrollar un sistema de plugins controlado internamente.

Cada módulo/plugin deberá poder declarar un Manifest.

Ejemplo conceptual:

{
  "id": "manufacturing",
  "name": "Manufacturing",
  "version": "1.0.0",
  "dependencies": [
    "products",
    "inventory",
    "purchasing"
  ],
  "permissions": [
    "manufacturing.orders.read",
    "manufacturing.orders.create"
  ]
}

El sistema deberá eventualmente conocer:

- id
- nombre
- versión
- dependencias
- permisos
- configuraciones
- eventos
- menús
- rutas
- widgets
- jobs
- migrations
- compatibilidad

---

# 15. DEPENDENCIAS ENTRE MÓDULOS

Ejemplo:

E-commerce necesita:

Products
Customers
Sales
Payments

Manufacturing necesita:

Products
Inventory
Purchasing

POS necesita:

Products
Sales
Payments

La plataforma deberá impedir instalaciones inconsistentes.

---

# 16. APP REGISTRY

Diseñar eventualmente un registro central de aplicaciones:

AppRegistry

capaz de conocer:

installedApps

enabledApps

versions

dependencies

configurations

permissions

El administrador podrá ver algo como:

Apps

✓ Products
✓ Inventory
✓ Sales

○ CRM
○ POS
○ E-commerce
○ Manufacturing
○ Accounting

---

# 17. EXTENSIONES DEL FRONTEND

Los módulos deberán poder registrar componentes visuales.

Ejemplo conceptual:

registerMenu()

registerRoute()

registerWidget()

registerSettings()

registerPermission()

registerDashboardCard()

registerReport()

Un módulo de Manufactura podría registrar automáticamente:

Manufactura
- Órdenes
- Producción
- Recetas
- Materiales

sin modificar manualmente el Sidebar principal.

---

# 18. DISEÑO DEL CORE

El Core debe contener solamente funcionalidades realmente transversales.

Ejemplos:

- Tenancy
- Authentication
- Authorization
- Companies
- Users
- Roles
- Permissions
- Configuration
- Audit
- Events
- Files
- Notifications
- Localization

Evitar meter lógica de ventas, inventarios o restaurantes dentro del Core.

---

# 19. MODELO DE PRODUCTOS

El sistema debe soportar diferentes tipos.

Product

ProductVariant

Service

Kit

Bundle

RawMaterial

FinishedGood

DigitalProduct

Un producto puede tener configuraciones como:

track_inventory

sellable

purchasable

manufacturable

has_variants

track_lots

track_serial_numbers

track_expiration

publish_online

Permitir atributos dinámicos sin destruir integridad del modelo.

Ejemplo:

Camisa

Color:
Azul
Negro
Blanco

Talla:
S
M
L
XL

Variantes:

Azul / S
Azul / M
Azul / L
Negro / S

Cada variante puede tener:

SKU

barcode

cost

price

stock

images

---

# 20. INVENTARIO

El inventario debe diseñarse mediante movimientos.

No depender únicamente de un campo:

stock = 25

Crear un ledger de movimientos.

Ejemplo:

InventoryMovement

IN
OUT
TRANSFER
ADJUSTMENT
RETURN
RESERVATION
RELEASE

El stock actual debe poder calcularse o mantenerse mediante mecanismos consistentes.

Debe existir trazabilidad completa.

Nunca permitir que una actualización simple destruya el historial.

Soportar eventualmente:

- múltiples bodegas
- ubicaciones
- lotes
- seriales
- vencimientos
- reservas
- transferencias
- conteos
- ajustes
- picking
- packing

---

# 21. VENTAS

Diferenciar correctamente:

Quote

Order

Invoice

Payment

Shipment

Return

No asumir que una venta equivale automáticamente a una factura.

Un pedido debe permitir diferentes estados.

Ejemplo:

DRAFT

PENDING

CONFIRMED

PROCESSING

PARTIALLY_FULFILLED

FULFILLED

CANCELLED

REFUNDED

Cada pedido debe conocer su canal.

Ejemplo:

ERP

POS

ECOMMERCE

B2B

MARKETPLACE

MOBILE

API

---

# 22. PAGOS

Crear un Payment Module independiente.

Diseñar una interfaz:

PaymentGateway

capaz de tener adapters:

StripeAdapter

PayPalAdapter

BACAdapter

TilopayAdapter

TransferAdapter

CashAdapter

Cada gateway deberá implementar contratos comunes.

Ejemplo:

createPayment()

capturePayment()

cancelPayment()

refundPayment()

verifyPayment()

handleWebhook()

Nunca almacenar directamente datos sensibles completos de tarjetas.

Utilizar tokenización y proveedores certificados.

---

# 23. E-COMMERCE

El e-commerce debe estar conectado a la plataforma, pero no mezclado con el frontend del ERP.

Separar:

Commerce Engine

de

Storefront.

Commerce Engine:

- productos
- precios
- listas de precios
- promociones
- clientes
- carrito
- checkout
- pedidos
- pagos
- envíos
- descuentos
- impuestos

Storefront:

- diseño
- páginas
- navegación
- catálogo
- búsqueda
- producto
- carrito
- checkout visual
- cuenta cliente

El sistema deberá permitir eventualmente múltiples Storefronts.

Ejemplo:

Default Store

Fashion Store

B2B Store

Restaurant Store

Custom Store

---

# 24. POS

Crear un módulo POS.

Preferir inicialmente:

Web + PWA.

Debe poder posteriormente funcionar mediante Tauri si se requiere acceso profundo a hardware.

Preparar soporte para:

- lector código de barras
- impresora térmica
- gaveta
- pantalla cliente
- pagos
- ticket
- devoluciones
- cierres
- turnos

Considerar posteriormente operación offline parcial.

La sincronización offline debe diseñarse cuidadosamente para evitar corrupción de inventarios.

---

# 25. API

Toda funcionalidad importante debe ser accesible mediante API.

Versionar desde el principio:

/api/v1/

Ejemplos:

GET /api/v1/products

POST /api/v1/products

GET /api/v1/orders

POST /api/v1/orders

GET /api/v1/customers

POST /api/v1/payments

Documentar mediante OpenAPI.

Crear posteriormente un SDK oficial TypeScript.

---

# 26. WEBHOOKS

Preparar soporte de webhooks.

Ejemplo:

order.created

order.paid

product.updated

inventory.changed

customer.created

Implementar:

- signing
- retries
- idempotency
- delivery logs
- timestamps
- secret rotation

---

# 27. INTEGRACIONES

Crear adapters desacoplados para:

Payment Providers

Shipping Providers

Tax Providers

Messaging Providers

Marketplace Providers

No meter lógica específica de un proveedor directamente en el dominio.

Ejemplo:

ShippingProvider

getRates()

createShipment()

cancelShipment()

trackShipment()

---

# 28. CONFIGURACIÓN

Crear un sistema flexible de configuración.

Distinguir:

Platform settings

Tenant settings

Company settings

Module settings

User preferences

Ejemplos:

moneda

zona horaria

idioma

formato fecha

impuestos

serie documentos

almacén predeterminado

branding

emails

---

# 29. LOCALIZACIÓN

Preparar desde el principio:

i18n

múltiples idiomas

múltiples monedas

múltiples zonas horarias

formatos regionales

No guardar horas importantes únicamente como cadenas locales.

Preferir UTC en almacenamiento y convertir según zona horaria.

---

# 30. MONEDAS

No utilizar `float` para dinero.

Utilizar Decimal o estrategia equivalente.

Ejemplo incorrecto:

19.99 como floating point sin control.

Diseñar Money correctamente.

Guardar:

amount

currency

cuando corresponda.

---

# 31. IMPUESTOS

Crear un Tax Engine desacoplado.

No codificar permanentemente impuestos específicos de un país en Sales.

Debe permitir reglas fiscales configurables e integraciones.

Posteriormente podrán crearse módulos específicos por país.

---

# 32. CONTABILIDAD

Cuando se implemente contabilidad, utilizar conceptos contables correctos.

No permitir modificar indiscriminadamente movimientos ya contabilizados.

Soportar eventualmente:

ChartOfAccounts

JournalEntry

JournalEntryLine

FiscalPeriod

Ledger

Reconciliation

FinancialStatements

Diseñar partidas dobles correctamente.

---

# 33. SOFT DELETE

No eliminar físicamente datos críticos inmediatamente.

Utilizar estrategias como:

deleted_at

status

archived_at

cuando corresponda.

Pero no aplicar soft delete indiscriminadamente a todas las tablas.

Explicar cuándo usarlo.

---

# 34. IDENTIFICADORES

Preferir IDs que no revelen fácilmente secuencias internas cuando tengan exposición pública.

Evaluar UUIDv7 u otra alternativa moderna adecuada.

Puede existir adicionalmente un número empresarial legible:

ORD-000001

INV-000001

QUO-000001

No utilizar estos correlativos legibles como única Primary Key.

---

# 35. CONCURRENCIA

Prestar especial atención a:

inventario

pagos

correlativos

cierres

contabilidad

reservas

Evitar race conditions.

Utilizar:

transactions

database locking

optimistic concurrency

unique constraints

según corresponda.

---

# 36. TRANSACCIONES

Operaciones críticas deberán ejecutarse atómicamente.

Ejemplo:

Confirmar pedido

1. validar
2. reservar inventario
3. guardar estado
4. generar movimientos
5. registrar evento

Si algo falla, no dejar datos parcialmente corruptos.

---

# 37. OBSERVABILIDAD

Preparar:

structured logging

metrics

traces

correlation IDs

health checks

Utilizar eventualmente:

OpenTelemetry

Grafana

Prometheus

Loki

Sentry o equivalente

Cada request importante debe poder rastrearse.

---

# 38. LOGS

No utilizar indiscriminadamente:

console.log()

en producción.

Crear logger estructurado.

Nunca loggear:

contraseñas

tokens

datos completos de tarjetas

información altamente sensible

---

# 39. TESTING

Implementar:

Unit Tests

Integration Tests

E2E Tests

Contract Tests cuando corresponda.

Tecnologías:

Vitest o Jest

Playwright

Crear pruebas críticas para:

- autenticación
- permisos
- multi-tenancy
- inventario
- ventas
- pagos
- aislamiento entre empresas

No buscar 100% de cobertura por obligación.

Priorizar lógica crítica.

---

# 40. CI/CD

GitHub Actions.

Pipeline conceptual:

Pull Request

↓

Lint

↓

Type Check

↓

Unit Tests

↓

Integration Tests

↓

Build

↓

Security Check

↓

Deploy Staging

↓

E2E

↓

Production

Nunca depender de deployment manual mediante FTP.

---

# 41. ENTORNOS

Definir:

local

development

test

staging

production

Separar configuraciones.

Nunca incluir secretos en Git.

Utilizar variables de entorno y posteriormente un Secret Manager.

---

# 42. DOCKER

Crear:

Dockerfile

docker-compose.yml

El entorno local debería poder levantar:

PostgreSQL

Redis

MinIO

API

Worker

Frontend cuando corresponda.

---

# 43. MIGRACIONES

Toda modificación de base de datos deberá utilizar migraciones.

Nunca cambiar manualmente producción sin versionamiento.

Crear estrategia para:

forward migrations

backups

rollback cuando sea viable.

---

# 44. BACKUPS

Diseñar posteriormente estrategia de respaldo:

PostgreSQL backups

Point-in-Time Recovery

S3 versioning

retention

disaster recovery

La plataforma manejará datos empresariales críticos.

---

# 45. PERFORMANCE

No optimizar prematuramente.

Pero evitar diseños obviamente ineficientes.

Revisar:

N+1 queries

índices

paginación

queries pesadas

caché

batch operations

connection pooling

No cargar 100,000 registros para mostrar una tabla.

Implementar paginación server-side.

---

# 46. TABLAS DEL ERP

Las tablas administrativas deberán soportar eventualmente:

- búsqueda
- filtros
- ordenamiento
- selección
- paginación
- columnas personalizables
- exportación
- acciones masivas
- vistas guardadas

Todo server-side cuando el volumen lo requiera.

---

# 47. REPORTES

No mezclar lógica de reportes complejos dentro de Controllers.

Crear un Report Engine posteriormente.

Permitir:

PDF

Excel

CSV

Dashboards

Programación de reportes

Los reportes pesados podrán procesarse mediante Workers.

---

# 48. NOTIFICACIONES

Crear Notification Module.

Canales:

In-app

Email

SMS

WhatsApp

Push

Cada módulo puede solicitar una notificación sin conocer directamente el proveedor.

---

# 49. FEATURE FLAGS

Diseñar soporte posterior para:

Feature Flags

Ejemplo:

new_inventory_engine

advanced_checkout

beta_manufacturing

Permite desplegar funcionalidades progresivamente.

---

# 50. VERSIONADO

Versionar:

API

Plugins

Schema

SDK

Mantener compatibilidad cuando sea posible.

Aplicar Semantic Versioning en paquetes.

---

# 51. NO UTILIZAR MICROFRONTENDS INICIALMENTE

No comenzar con microfrontends.

Mantener frontend modular dentro de una aplicación principal.

Extraer partes únicamente cuando exista una necesidad comprobada.

---

# 52. NO UTILIZAR KAFKA INICIALMENTE

Utilizar primero:

Internal Event Bus

BullMQ

Redis

Cuando el volumen realmente lo requiera se podrá evaluar:

RabbitMQ

Kafka

No agregar complejidad antes de necesitarla.

---

# 53. NO UTILIZAR KUBERNETES INICIALMENTE

Docker será suficiente al principio.

Kubernetes podrá evaluarse cuando:

- existan múltiples servicios
- alta carga
- necesidad de autoscaling
- equipos múltiples
- disponibilidad avanzada

---

# 54. ESCALABILIDAD FUTURA

La arquitectura debe permitir que posteriormente puedan extraerse:

Payment Service

Notification Service

Search Service

Commerce Service

Inventory Service

Files Service

sin reescribir completamente la plataforma.

---

# 55. MARKETPLACE FUTURO

En una fase avanzada quiero poder construir un App Marketplace.

Ejemplos:

Restaurant App

Manufacturing App

Healthcare App

Hotel App

Advanced CRM

Loyalty App

Marketplace Connectors

Inicialmente todos los plugins serán internos/oficiales.

Posteriormente se podrá diseñar un SDK público para terceros.

---

# 56. SISTEMA DE LICENCIAS

Preparar conceptualmente la arquitectura para planes.

Ejemplo:

Starter

Products
Sales
Customers

Professional

Products
Sales
Customers
Inventory
Purchasing
CRM

Business

Inventory
Sales
Purchasing
CRM
Accounting
POS
E-commerce

Enterprise

Todo
SSO
Advanced Audit
Custom Integrations

No implementar toda la facturación SaaS inicialmente, pero evitar decisiones que lo impidan.

---

# 57. DISEÑO DE BASE DE DATOS

Antes de generar tablas indiscriminadamente:

1. analizar dominio
2. identificar Aggregate Roots
3. identificar entidades
4. identificar Value Objects
5. establecer relaciones
6. definir constraints
7. definir índices
8. considerar multi-tenancy
9. considerar auditoría
10. considerar eventos

No crear una mega tabla universal.

No utilizar JSON para todo.

Utilizar JSONB solamente cuando la flexibilidad lo justifique.

---

# 58. NOMENCLATURA

Utilizar inglés para:

código

clases

funciones

variables

tablas

endpoints

eventos

interfaces

Ejemplo:

Product

InventoryMovement

SalesOrder

Payment

Customer

El producto visual podrá estar traducido al español.

---

# 59. CALIDAD DE CÓDIGO

Todo código generado deberá:

- ser entendible
- mantener responsabilidades claras
- evitar duplicación innecesaria
- estar tipado
- manejar errores
- validar inputs
- ser testeable
- documentar decisiones difíciles

No generar cientos de archivos vacíos solo para parecer “enterprise”.

La estructura debe aportar valor real.

---

# 60. VALIDACIONES

Validar siempre datos en backend.

Nunca confiar únicamente en validaciones frontend.

Aplicar:

DTO validation

domain validation

database constraints

según corresponda.

---

# 61. MANEJO DE ERRORES

Crear un sistema estándar de errores.

Ejemplo:

{
  "statusCode": 409,
  "code": "INSUFFICIENT_INVENTORY",
  "message": "There is not enough inventory available.",
  "details": {},
  "correlationId": "..."
}

No devolver errores internos sensibles al usuario.

---

# 62. DOCUMENTACIÓN

Mantener documentación técnica.

Crear:

README

Architecture Decision Records

API docs

Module docs

Development setup

Contribution guide

No documentar trivialidades, pero sí decisiones importantes.

---

# 63. ADR

Cuando tomemos decisiones importantes crear Architecture Decision Records.

Ejemplo:

ADR-001 Modular Monolith

ADR-002 PostgreSQL

ADR-003 Multi Tenant Strategy

ADR-004 Event Architecture

ADR-005 Plugin Architecture

---

# 64. PRIMER OBJETIVO

NO quiero que intentes programar inmediatamente todo el ERP.

Quiero desarrollar el sistema mediante fases.

---

# FASE 0 — ARQUITECTURA

Primero debes ayudarme a definir:

- visión técnica
- arquitectura
- bounded contexts
- módulos
- Core
- multi-tenancy
- permisos
- eventos
- plugins
- estructura monorepo
- base de datos inicial
- convenciones

No generar todavía módulos complejos.

---

# FASE 1 — FOUNDATION

Construir:

Platform Core

Tenants

Companies

Branches

Users

Authentication

Roles

Permissions

Audit

Configuration

Event Bus

Database

Redis

File Storage

Health Checks

Logging

Docker

Testing base

---

# FASE 2 — MASTER DATA

Construir:

Customers

Suppliers

Products

Categories

Brands

Units of Measure

Taxes

Price Lists

Warehouses

Locations

---

# FASE 3 — INVENTORY

Construir:

Inventory Movement Ledger

Stock

Reservations

Adjustments

Transfers

Warehouse Locations

Inventory History

---

# FASE 4 — SALES

Construir:

Quotes

Orders

Order Lines

Discounts

Payments

Returns

Invoices como integración futura

---

# FASE 5 — PURCHASING

Construir:

Purchase Requests

Purchase Orders

Receipts

Supplier Invoices

Returns

---

# FASE 6 — POS

Construir módulo POS.

---

# FASE 7 — E-COMMERCE

Construir Commerce Engine y Storefront.

---

# FASE 8 — ACCOUNTING

Construir módulo contable.

---

# FASE 9 — CRM

Construir CRM.

---

# FASE 10 — MANUFACTURING

Construir:

BOM

Production Orders

Materials

Operations

Finished Goods

---

# FASE 11 — PLUGIN PLATFORM

Evolucionar sistema de módulos hacia:

Plugin SDK

App Registry

Plugin Manifest

Frontend Extensions

Events

Marketplace interno

---

# FASE 12 — SCALE

Solo después de crecimiento real analizar:

Microservices

Kafka

Kubernetes

OpenSearch

CDN avanzada

Dedicated Workers

Read Replicas

Database Partitioning

---

# 65. PRIMERA ENTREGA QUE QUIERO DE TI

Antes de escribir código masivo quiero que realices lo siguiente:

## Paso 1

Analiza toda esta especificación.

Identifica:

- contradicciones
- riesgos
- decisiones pendientes
- cosas que puedan mejorarse

No cambies una decisión importante silenciosamente.

---

## Paso 2

Propón la arquitectura definitiva de la versión 1.

Incluye un diagrama ASCII comprensible.

---

## Paso 3

Define los Bounded Contexts iniciales.

---

## Paso 4

Define qué pertenece al Core y qué NO pertenece al Core.

---

## Paso 5

Diseña el modelo Multi-Tenant.

Explica claramente:

Tenant

Organization

Company

Branch

Location

Warehouse

User

Membership

---

## Paso 6

Diseña el sistema de usuarios, roles y permisos.

---

## Paso 7

Diseña el sistema de eventos.

---

## Paso 8

Diseña conceptualmente el sistema de módulos/plugins.

No implementar todavía ejecución externa insegura.

---

## Paso 9

Propón la estructura completa del Monorepo.

---

## Paso 10

Propón el esquema inicial de PostgreSQL exclusivamente para la Foundation.

No generar aún tablas de todos los módulos futuros.

---

## Paso 11

Define convenciones:

nombres

commits

branches

versionado

DTOs

events

errores

API

database

tests

---

## Paso 12

Genera el Roadmap técnico completo.

---

# 66. FORMA EN QUE QUIERO QUE TRABAJES

A partir de este momento quiero que actúes como mi arquitecto y desarrollador principal.

No quiero que simplemente generes código sin analizarlo.

Para cada módulo importante debes seguir este proceso:

1. explicar el objetivo
2. analizar dominio
3. definir entidades
4. definir casos de uso
5. definir reglas
6. definir base de datos
7. definir API
8. identificar eventos
9. identificar permisos
10. implementar
11. crear pruebas
12. revisar seguridad
13. revisar multi-tenancy
14. documentar

---

# 67. NO HACER

No debes:

- crear microservicios innecesarios
- crear código extremadamente complejo sin necesidad
- mezclar Controller con lógica de negocio
- acceder directamente a Prisma desde cualquier parte
- confiar en frontend para seguridad
- crear permisos genéricos excesivos
- guardar contraseñas sin hashing
- guardar tarjetas
- utilizar float para dinero
- modificar inventario sin trazabilidad
- eliminar datos críticos sin control
- duplicar lógica de negocio
- acoplar módulos innecesariamente
- utilizar Firebase como base principal
- utilizar MongoDB como base principal
- meter todo dentro del Core
- crear una arquitectura específica únicamente para retail
- crear una aplicación diferente por industria
- implementar todo de golpe

---

# 68. OBJETIVO DE NEGOCIO FINAL

La meta a largo plazo es poder ofrecer una plataforma donde un cliente pueda hacer:

Crear cuenta

↓

Crear empresa

↓

Elegir aplicaciones

↓

Activar:

Inventory

Sales

POS

E-commerce

CRM

Accounting

Manufacturing

↓

Configurar su empresa

↓

Agregar usuarios

↓

Comenzar a trabajar

La plataforma deberá ser capaz de adaptarse al negocio mediante configuración y módulos.

---

# 69. FILOSOFÍA DEL PRODUCTO

No quiero desarrollar:

“un ERP enorme lleno de funciones que todos deben usar”.

Quiero desarrollar:

**una plataforma componible donde cada empresa construya su propio sistema empresarial utilizando módulos sobre un Core estable.**

Piensa en la plataforma como:

ERP Foundation

+

Business Apps

+

Channels

+

Integrations

+

Industry Extensions

---

# 70. EXPERIENCIA DEL USUARIO

Aunque sea una plataforma técnicamente compleja, la experiencia debe sentirse sencilla.

El usuario no debe necesitar conocimientos técnicos para:

crear empresa

crear productos

agregar usuarios

configurar inventario

crear sucursal

habilitar POS

habilitar E-commerce

instalar módulos

El sistema debe esconder la complejidad técnica.

---

# 71. INTERFAZ

Quiero un diseño:

- moderno
- profesional
- empresarial
- rápido
- minimalista
- limpio
- consistente
- responsive

No quiero dashboards llenos de elementos innecesarios.

Dar prioridad a:

información importante

acciones rápidas

navegación clara

búsqueda global

atajos

tablas potentes

formularios comprensibles

---

# 72. COMMAND PALETTE

Preparar eventualmente una búsqueda tipo:

Ctrl + K

que permita buscar:

productos

clientes

pedidos

módulos

configuraciones

acciones

---

# 73. DASHBOARD MODULAR

Cada módulo podrá registrar widgets.

Ejemplo:

Sales

Sales Today

Monthly Revenue

Orders Pending

Inventory

Low Stock

Inventory Value

Manufacturing

Production Pending

El usuario podrá personalizar posteriormente su dashboard.

---

# 74. NOTIFICACIONES INTERNAS

Crear un sistema de Notifications.

Ejemplos:

Low Inventory

Payment Failed

Order Received

Purchase Approved

Production Completed

Integration Error

---

# 75. BACKGROUND WORKERS

Diferenciar claramente:

API

de

Worker.

No hacer tareas pesadas dentro de requests HTTP.

---

# 76. DOMAIN SERVICES

Utilizar Domain Services solamente cuando una regla no pertenezca naturalmente a una sola entidad.

Evitar crear Services gigantes.

---

# 77. USE CASES

Preferir casos de uso claros.

Ejemplo:

CreateProduct

UpdateProduct

AdjustInventory

TransferInventory

CreateSalesOrder

ConfirmSalesOrder

CancelSalesOrder

CapturePayment

---

# 78. CQRS

No implementar CQRS completo desde el principio.

Aplicarlo solamente en módulos donde aporte valor real.

No utilizar patrones solo porque sean populares.

---

# 79. FRONTEND STATE

No almacenar indiscriminadamente todo en estado global.

Diferenciar:

Server State

Client State

Form State

UI State

Evaluar herramientas como TanStack Query para Server State.

---

# 80. FORMULARIOS

Crear formularios robustos.

Utilizar:

React Hook Form

Zod cuando corresponda

El backend deberá repetir validaciones importantes.

---

# 81. FECHAS

Utilizar estándares consistentes.

Backend:

ISO 8601

Database:

timestamp con estrategia clara de timezone.

Frontend:

mostrar en timezone del usuario/empresa.

---

# 82. DECIMALES

Definir estrategia clara para:

Money

Quantity

TaxRate

Percentage

Cost

Nunca depender de floats de JavaScript para cálculos monetarios críticos.

---

# 83. IMPORTACIONES MASIVAS

Diseñar posteriormente un Import Engine.

Ejemplo:

CSV

Excel

Permitir importar:

productos

clientes

inventario inicial

proveedores

Validar antes de guardar.

Mostrar errores por fila.

Procesar archivos grandes mediante Workers.

---

# 84. EXPORTACIONES

Permitir:

CSV

Excel

PDF

Aplicar permisos.

---

# 85. SEARCH

Inicialmente utilizar PostgreSQL.

No introducir Elasticsearch/OpenSearch hasta necesitarlo.

Diseñar Search Provider para poder migrar posteriormente.

---

# 86. CACHE

No cachear sin estrategia de invalidación.

Toda caché debe tener:

key

scope

TTL

invalidación

No utilizar Redis como parche para consultas incorrectamente diseñadas.

---

# 87. RATE LIMITING

Aplicar especialmente a:

login

password reset

public APIs

webhooks

checkout

---

# 88. API KEYS

Posteriormente permitir:

API Key

scopes

expiration

revocation

audit

rate limit

Nunca guardar API keys completas en texto plano si se puede evitar.

---

# 89. DEVELOPERS

Preparar eventualmente:

Developer Portal

API Docs

Webhooks

API Keys

Plugin SDK

Pero no construirlo todavía.

---

# 90. PRIORIDAD ACTUAL

La prioridad absoluta es construir una **Foundation extremadamente sólida**.

No comenzar por E-commerce.

No comenzar por Accounting.

No comenzar por Manufacturing.

Primero construir correctamente:

Tenancy

Companies

Users

Roles

Permissions

Audit

Configuration

Events

Database

API conventions

Project structure

Testing

Security

Solo después avanzar al dominio empresarial.

---

# 91. IMPORTANTE SOBRE CÓDIGO GENERADO

Cuando generes código:

NO me entregues pseudocódigo si ya estamos en fase de implementación.

Entrega código funcional.

Indica:

ruta del archivo

contenido

dependencias

comandos necesarios

migraciones

variables de entorno

pruebas

Explica únicamente lo importante.

No inventes APIs de librerías.

Si una librería cambió de versión, utiliza documentación vigente antes de implementar.

---

# 92. REVISIÓN DESPUÉS DE CADA FASE

Al finalizar cada fase, realizar:

Architecture Review

Security Review

Database Review

Testing Review

Performance Review

Technical Debt Review

Antes de continuar.

---

# 93. EVITAR DEUDA TÉCNICA TEMPRANA

Si una solución rápida compromete:

seguridad

integridad de datos

multi-tenancy

contabilidad

inventario

pagos

auditoría

prefiero implementar correctamente aunque tome más código.

---

# 94. REGLA FINAL

La plataforma debe ser capaz de crecer desde:

1 empresa

10 usuarios

pocos miles de registros

hasta eventualmente:

miles de empresas

millones de usuarios

millones de productos

millones de pedidos

sin que ello signifique que debamos construir desde el primer día infraestructura para millones de usuarios.

Diseñar para crecer.

Implementar para las necesidades actuales.

---

# COMIENZA AHORA

No programes todavía todo el ERP.

Tu primera respuesta debe contener exclusivamente el diseño inicial del proyecto.

Comienza realizando:

1. evaluación crítica de esta arquitectura
2. arquitectura v1 recomendada
3. diagrama general
4. Bounded Contexts
5. definición exacta del Core
6. modelo Multi-Tenant
7. modelo de Users/Roles/Permissions
8. arquitectura de eventos
9. concepto de plugins
10. estructura Monorepo
11. esquema inicial de PostgreSQL para Foundation
12. estrategia de testing
13. estrategia de seguridad
14. roadmap de implementación
15. qué debemos construir primero

Si detectas que alguna decisión de este documento no es adecuada, explícame el problema y propone una alternativa antes de cambiarla.

Piensa como si esta plataforma eventualmente pudiera convertirse en un producto SaaS empresarial serio utilizado por miles de negocios.

No sacrifiques la simplicidad inicial, pero tampoco tomes decisiones que bloqueen innecesariamente el crecimiento futuro.