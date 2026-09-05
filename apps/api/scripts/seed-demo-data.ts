/**
 * Fills 3 separate, real tenants with at least 10 records in each of the
 * platform's 15 business modules, so tenant isolation and every module's
 * screens/dashboard widgets can be verified against real, non-trivial data
 * rather than a single lightly-seeded demo account.
 *
 * Deliberately talks to a real, running `apps/api` over plain HTTP (native
 * `fetch`, mirroring exactly what `@erp/api-client`'s own `request()` does)
 * rather than writing to Postgres directly — every domain invariant
 * (reservations, RBAC, idempotency, decimal precision) is exercised exactly
 * as a real user would trigger it, matching this project's "no simular
 * operaciones" standard (MASTER_SPEC §90). `@erp/api-client` itself isn't
 * imported here on purpose: it is a `"type": "module"` package with no CJS
 * `require` entry, and this script runs under `apps/api`'s own CommonJS
 * ts-node setup — a hand-rolled fetch helper avoids that mismatch entirely
 * without needing a second module system in this app.
 *
 * Run with `pnpm --filter @erp/api run seed:demo` against a locally running
 * API (`SEED_API_BASE_URL`, default `http://localhost:3000/api/v1`). Seeds
 * all 3 tenants in `TENANTS` below, sequentially.
 *
 * Master-data steps (unique `code`/`name`) are reentrant via `findOrCreate`
 * — a real requirement, not speculative: an earlier run of this script
 * failed partway through on a real backend bug, and the re-run needed to
 * skip everything already created. Transactional steps (orders, leads,
 * journal entries, ...) are not idempotent by design — re-running adds
 * more real records on top, which is the intended behavior for "at least
 * N records", not a bug to guard against.
 */

const BASE_URL = process.env.SEED_API_BASE_URL ?? "http://localhost:3000/api/v1";

interface TenantConfig {
  ownerEmail: string;
  ownerPassword: string;
  ownerName: string;
  tenantSlug: string;
  tenantName: string;
  orgCode: string;
  orgName: string;
  companyCode: string;
  companyName: string;
  /** Storefront.code is globally unique across every tenant (ADR, same precedent as Tenant.slug) — never reuse across tenants. */
  storefrontCode: string;
}

const TENANTS: TenantConfig[] = [
  {
    ownerEmail: "demo-owner@erp-platform.local",
    ownerPassword: "DemoErp9!Platform",
    ownerName: "Propietaria Demo ERP",
    tenantSlug: "demo-erp",
    tenantName: "Demo ERP",
    orgCode: "DEMOORG",
    orgName: "Demo ERP Holdings",
    companyCode: "DEMOCO",
    companyName: "Demo ERP Comercial, S.A.",
    storefrontCode: "tienda-demo",
  },
  {
    ownerEmail: "central-owner@erp-platform.local",
    ownerPassword: "CentralErp9!Platform",
    ownerName: "Propietario Ferretería Central",
    tenantSlug: "ferreteria-central",
    tenantName: "Ferretería La Central",
    orgCode: "FERCENTORG",
    orgName: "Ferretería La Central Holdings",
    companyCode: "FERCENTCO",
    companyName: "Ferretería La Central, S.A.",
    storefrontCode: "tienda-ferreteria-central",
  },
  {
    ownerEmail: "aurora-owner@erp-platform.local",
    ownerPassword: "AuroraErp9!Platform",
    ownerName: "Propietaria Boutique Aurora",
    tenantSlug: "boutique-aurora",
    tenantName: "Boutique Aurora",
    orgCode: "AURORAORG",
    orgName: "Boutique Aurora Holdings",
    companyCode: "AURORACO",
    companyName: "Boutique Aurora, S.A.",
    storefrontCode: "tienda-boutique-aurora",
  },
];

interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
}

class DemoSeedError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DemoSeedError";
  }
}

async function api<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    accessToken?: string;
    tenantSlug?: string;
    companyId?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.accessToken) headers["Authorization"] = `Bearer ${options.accessToken}`;
  if (options.tenantSlug) headers["X-Tenant-Slug"] = options.tenantSlug;
  if (options.companyId) headers["X-Company-Id"] = options.companyId;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => undefined)) as T | ApiErrorBody | undefined;

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | undefined;
    throw new DemoSeedError(
      response.status,
      errorBody?.code ?? "UNKNOWN_ERROR",
      errorBody?.message ?? `Request failed with status ${response.status}`,
    );
  }
  return payload as T;
}

function log(tenantSlug: string, step: string, message: string): void {
  console.log(`[seed-demo-data:${tenantSlug}] ${step}: ${message}`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// --- Identity + tenant -------------------------------------------------

async function registerOrLoginOwner(config: TenantConfig): Promise<{ accessToken: string }> {
  try {
    const session = await api<{ accessToken: string }>("POST", "/auth/register", {
      body: { email: config.ownerEmail, password: config.ownerPassword, displayName: config.ownerName },
    });
    log(config.tenantSlug, "auth", `owner account created (${config.ownerEmail})`);
    return session;
  } catch (error) {
    if (error instanceof DemoSeedError && error.statusCode === 409) {
      const session = await api<{ accessToken: string }>("POST", "/auth/login", {
        body: { email: config.ownerEmail, password: config.ownerPassword },
      });
      log(config.tenantSlug, "auth", `owner account already existed, logged in instead (${config.ownerEmail})`);
      return session;
    }
    throw error;
  }
}

async function provisionOrReuseTenant(config: TenantConfig, accessToken: string): Promise<{ companyId: string }> {
  try {
    const provisioned = await api<{ company?: { id: string } }>("POST", "/tenants", {
      accessToken,
      body: {
        slug: config.tenantSlug,
        name: config.tenantName,
        organization: { code: config.orgCode, name: config.orgName },
        company: { code: config.companyCode, name: config.companyName },
      },
    });
    if (!provisioned.company) throw new Error("Provisioning did not return a company.");
    log(config.tenantSlug, "tenant", `provisioned "${config.tenantName}", companyId=${provisioned.company.id}`);
    return { companyId: provisioned.company.id };
  } catch (error) {
    if (error instanceof DemoSeedError && error.statusCode === 409) {
      const companies = await api<Array<{ id: string }>>("GET", "/tenants/companies", {
        accessToken,
        tenantSlug: config.tenantSlug,
      });
      const companyId = companies[0]?.id;
      if (!companyId) {
        throw new Error("Tenant already provisioned but has no company to reuse.", { cause: error });
      }
      log(config.tenantSlug, "tenant", `"${config.tenantName}" already provisioned, reusing companyId=${companyId}`);
      return { companyId };
    }
    throw error;
  }
}

// --- Master data -----------------------------------------------------

interface Ctx {
  tenantSlug: string;
  accessToken: string;
  companyId: string;
}

function auth(ctx: Ctx) {
  return { accessToken: ctx.accessToken, tenantSlug: ctx.tenantSlug, companyId: ctx.companyId };
}

/**
 * Finds an existing record by its unique `code`/`name` before creating a
 * new one — makes every master-data step safe to re-run after a partial
 * failure (a real one happened while building this script: a downstream
 * step 409'd, and every master-data code had already been created), same
 * "reentrant" property this codebase's own catalog seeders are held to
 * (docs/ARCHITECTURE.md §14.4), applied here to an ad-hoc demo-fill script
 * rather than a code-owned catalog.
 */
async function findOrCreate<T extends Record<string, unknown>>(
  ctx: Ctx,
  listPath: string,
  createPath: string,
  matchField: string,
  matchValue: string,
  createBody: unknown,
): Promise<T> {
  const list = await api<T[]>("GET", listPath, auth(ctx));
  const existing = list.find((item) => item[matchField] === matchValue);
  if (existing) return existing;
  return api<T>("POST", createPath, { ...auth(ctx), body: createBody });
}

async function seedUnitsOfMeasure(ctx: Ctx) {
  const unit = await findOrCreate<{ id: string }>(
    ctx,
    "/catalog/units-of-measure",
    "/catalog/units-of-measure",
    "code",
    "UN",
    { code: "UN", name: "Unidad", symbol: "u" },
  );
  await findOrCreate(ctx, "/catalog/units-of-measure", "/catalog/units-of-measure", "code", "CJ", {
    code: "CJ",
    name: "Caja",
    symbol: "cj",
  });
  log(ctx.tenantSlug, "master-data", "2 units of measure ready");
  return { unitId: unit.id };
}

async function seedCategories(ctx: Ctx) {
  const electronics = await findOrCreate<{ id: string }>(
    ctx,
    "/catalog/categories",
    "/catalog/categories",
    "code",
    "ELEC",
    { code: "ELEC", name: "Electrónica" },
  );
  const clothing = await findOrCreate<{ id: string }>(ctx, "/catalog/categories", "/catalog/categories", "code", "ROPA", {
    code: "ROPA",
    name: "Ropa",
  });
  const home = await findOrCreate<{ id: string }>(ctx, "/catalog/categories", "/catalog/categories", "code", "HOGAR", {
    code: "HOGAR",
    name: "Hogar",
  });
  log(ctx.tenantSlug, "master-data", "3 categories ready");
  return { electronicsId: electronics.id, clothingId: clothing.id, homeId: home.id };
}

async function seedBrands(ctx: Ctx) {
  const aurora = await findOrCreate<{ id: string }>(ctx, "/catalog/brands", "/catalog/brands", "code", "AURORA", {
    code: "AURORA",
    name: "Aurora",
  });
  const andina = await findOrCreate<{ id: string }>(ctx, "/catalog/brands", "/catalog/brands", "code", "ANDINA", {
    code: "ANDINA",
    name: "Andina",
  });
  log(ctx.tenantSlug, "master-data", "2 brands ready");
  return { auroraId: aurora.id, andinaId: andina.id };
}

interface ProductRef {
  id: string;
  code: string;
  hasVariants: boolean;
  variantIds: string[];
}

/** The 10 simple, sellable+purchasable products every transactional loop cycles through. */
const SIMPLE_PRODUCT_KEYS = [
  "audifonos",
  "parlante",
  "cargador",
  "chaqueta",
  "sabanas",
  "ollas",
  "lampara",
  "mochila",
  "teclado",
  "silla",
] as const;

async function seedProducts(
  ctx: Ctx,
  unitId: string,
  categories: { electronicsId: string; clothingId: string; homeId: string },
  brands: { auroraId: string; andinaId: string },
): Promise<Record<string, ProductRef>> {
  const products: Record<string, ProductRef> = {};

  const simple: Array<{
    key: string;
    code: string;
    name: string;
    categoryId: string;
    brandId: string;
    basePrice: string;
    baseCost: string;
  }> = [
    { key: "audifonos", code: "AUD-001", name: "Audífonos inalámbricos", categoryId: categories.electronicsId, brandId: brands.auroraId, basePrice: "249.0000", baseCost: "140.0000" },
    { key: "parlante", code: "SPK-001", name: "Parlante Bluetooth", categoryId: categories.electronicsId, brandId: brands.auroraId, basePrice: "189.0000", baseCost: "95.0000" },
    { key: "cargador", code: "CHG-001", name: "Cargador USB-C 20W", categoryId: categories.electronicsId, brandId: brands.andinaId, basePrice: "79.0000", baseCost: "35.0000" },
    { key: "chaqueta", code: "JACK-001", name: "Chaqueta ligera", categoryId: categories.clothingId, brandId: brands.auroraId, basePrice: "349.0000", baseCost: "180.0000" },
    { key: "sabanas", code: "BED-001", name: "Juego de sábanas", categoryId: categories.homeId, brandId: brands.andinaId, basePrice: "259.0000", baseCost: "130.0000" },
    { key: "ollas", code: "POT-001", name: "Set de ollas", categoryId: categories.homeId, brandId: brands.auroraId, basePrice: "599.0000", baseCost: "320.0000" },
    { key: "lampara", code: "LAMP-001", name: "Lámpara de escritorio", categoryId: categories.homeId, brandId: brands.andinaId, basePrice: "149.0000", baseCost: "70.0000" },
    { key: "mochila", code: "BAG-001", name: "Mochila urbana", categoryId: categories.clothingId, brandId: brands.auroraId, basePrice: "219.0000", baseCost: "110.0000" },
    { key: "teclado", code: "KEY-001", name: "Teclado mecánico", categoryId: categories.electronicsId, brandId: brands.andinaId, basePrice: "179.0000", baseCost: "85.0000" },
    { key: "silla", code: "CHAIR-001", name: "Silla de oficina", categoryId: categories.homeId, brandId: brands.andinaId, basePrice: "449.0000", baseCost: "220.0000" },
  ];

  for (const item of simple) {
    const product = await findOrCreate<{ id: string }>(ctx, "/products", "/products", "code", item.code, {
      code: item.code,
      name: item.name,
      unitOfMeasureId: unitId,
      categoryId: item.categoryId,
      brandId: item.brandId,
      basePrice: item.basePrice,
      baseCost: item.baseCost,
      trackInventory: true,
      sellable: true,
      purchasable: true,
      hasVariants: false,
      publishOnline: false,
    });
    products[item.key] = { id: product.id, code: item.code, hasVariants: false, variantIds: [] };
  }

  const variantProducts: Array<{
    key: string;
    code: string;
    name: string;
    categoryId: string;
    brandId: string;
    variants: Array<{ sku: string; attributes: Record<string, string>; price: string; cost: string }>;
  }> = [
    {
      key: "camiseta",
      code: "SHIRT-001",
      name: "Camiseta básica",
      categoryId: categories.clothingId,
      brandId: brands.auroraId,
      variants: [
        { sku: "SHIRT-001-AZ-M", attributes: { color: "Azul", talla: "M" }, price: "99.0000", cost: "45.0000" },
        { sku: "SHIRT-001-NG-L", attributes: { color: "Negro", talla: "L" }, price: "99.0000", cost: "45.0000" },
      ],
    },
    {
      key: "pantalon",
      code: "PANT-001",
      name: "Pantalón casual",
      categoryId: categories.clothingId,
      brandId: brands.andinaId,
      variants: [
        { sku: "PANT-001-AZ-32", attributes: { color: "Azul", talla: "32" }, price: "179.0000", cost: "85.0000" },
        { sku: "PANT-001-NG-34", attributes: { color: "Negro", talla: "34" }, price: "179.0000", cost: "85.0000" },
      ],
    },
  ];

  for (const item of variantProducts) {
    const product = await findOrCreate<{ id: string }>(ctx, "/products", "/products", "code", item.code, {
      code: item.code,
      name: item.name,
      unitOfMeasureId: unitId,
      categoryId: item.categoryId,
      brandId: item.brandId,
      trackInventory: true,
      sellable: true,
      purchasable: true,
      hasVariants: true,
      publishOnline: false,
    });
    const variantIds: string[] = [];
    for (const variant of item.variants) {
      const created = await findOrCreate<{ id: string }>(
        ctx,
        `/products/${product.id}/variants`,
        `/products/${product.id}/variants`,
        "sku",
        variant.sku,
        variant,
      );
      variantIds.push(created.id);
    }
    products[item.key] = { id: product.id, code: item.code, hasVariants: true, variantIds };
  }

  // A 13th product, deliberately not sold directly on its own — it exists
  // to be Manufacturing's finished good later.
  const combo = await findOrCreate<{ id: string }>(ctx, "/products", "/products", "code", "COMBO-001", {
    code: "COMBO-001",
    name: "Combo de regalo audio",
    unitOfMeasureId: unitId,
    categoryId: categories.electronicsId,
    brandId: brands.auroraId,
    basePrice: "299.0000",
    baseCost: "150.0000",
    trackInventory: true,
    sellable: true,
    purchasable: false,
    hasVariants: false,
    publishOnline: false,
  });
  products.combo = { id: combo.id, code: "COMBO-001", hasVariants: false, variantIds: [] };

  log(ctx.tenantSlug, "master-data", `${Object.keys(products).length} products ready (2 with variants, 4 variants total)`);
  return products;
}

async function seedCustomers(ctx: Ctx) {
  const definitions = [
    { code: "CUST-01", name: "Distribuidora Aurora", email: "compras@aurora.gt", city: "Ciudad de Guatemala" },
    { code: "CUST-02", name: "Comercial Quetzal", email: "pedidos@quetzal.gt", city: "Quetzaltenango" },
    { code: "CUST-03", name: "Tienda Vista Hermosa", email: "contacto@vistahermosa.gt", city: "Antigua Guatemala" },
    { code: "CUST-04", name: "Grupo Mayoreo GT", email: "compras@mayoreogt.com", city: "Ciudad de Guatemala" },
    { code: "CUST-05", name: "Retail Express", email: "ventas@retailexpress.gt", city: "Escuintla" },
    { code: "CUST-06", name: "Almacenes del Valle", email: "compras@almacenesvalle.gt", city: "Chimaltenango" },
    { code: "CUST-07", name: "Supermercado Norte", email: "pedidos@supernorte.gt", city: "Huehuetenango" },
    { code: "CUST-08", name: "Comercial San Miguel", email: "ventas@sanmiguel.gt", city: "Retalhuleu" },
    { code: "CUST-09", name: "Distribuidora Pacífico", email: "compras@distripacifico.gt", city: "Mazatenango" },
    { code: "CUST-10", name: "Tienda El Progreso", email: "contacto@elprogreso.gt", city: "Zacapa" },
  ];
  const ids: Record<string, string> = {};
  for (const definition of definitions) {
    const customer = await findOrCreate<{ id: string }>(ctx, "/customers", "/customers", "code", definition.code, {
      ...definition,
      country: "GT",
    });
    ids[definition.code] = customer.id;
  }
  log(ctx.tenantSlug, "master-data", `${definitions.length} customers ready`);
  return ids;
}

async function seedSuppliers(ctx: Ctx) {
  const definitions = [
    { code: "SUP-01", name: "Importadora del Norte", email: "ventas@impnorte.gt" },
    { code: "SUP-02", name: "Textiles Andinos", email: "pedidos@textilesandinos.com" },
    { code: "SUP-03", name: "Electro Import GT", email: "contacto@electroimport.gt" },
    { code: "SUP-04", name: "Hogar y Estilo", email: "ventas@hogarestilo.gt" },
    { code: "SUP-05", name: "Suministros Industriales GT", email: "ventas@suminindustrial.gt" },
    { code: "SUP-06", name: "Distribuidora Continental", email: "pedidos@continentalgt.com" },
    { code: "SUP-07", name: "Manufacturas del Istmo", email: "contacto@manuistmo.gt" },
    { code: "SUP-08", name: "Comercializadora Atlántico", email: "ventas@atlanticogt.com" },
    { code: "SUP-09", name: "Insumos y Materiales S.A.", email: "compras@insumosmat.gt" },
    { code: "SUP-10", name: "Proveedora Central", email: "ventas@proveedoracentral.gt" },
  ];
  const ids: Record<string, string> = {};
  for (const definition of definitions) {
    const supplier = await findOrCreate<{ id: string }>(ctx, "/suppliers", "/suppliers", "code", definition.code, {
      ...definition,
      country: "GT",
    });
    ids[definition.code] = supplier.id;
  }
  log(ctx.tenantSlug, "master-data", `${definitions.length} suppliers ready`);
  return ids;
}

async function seedWarehouses(ctx: Ctx) {
  const definitions = [
    { code: "WH-01", name: "Bodega Central", city: "Ciudad de Guatemala" },
    { code: "WH-02", name: "Bodega Norte", city: "Cobán" },
    { code: "WH-03", name: "Bodega Sur", city: "Escuintla" },
    { code: "WH-04", name: "Bodega Este", city: "Zacapa" },
    { code: "WH-05", name: "Bodega Oeste", city: "Quetzaltenango" },
    { code: "WH-06", name: "Centro de Distribución", city: "Ciudad de Guatemala" },
    { code: "WH-07", name: "Bodega de Repuestos", city: "Mixco" },
    { code: "WH-08", name: "Bodega Temporal", city: "Villa Nueva" },
    { code: "WH-09", name: "Bodega de Devoluciones", city: "Ciudad de Guatemala" },
    { code: "WH-10", name: "Bodega Fría", city: "Antigua Guatemala" },
  ];
  const ids: Record<string, { id: string }> = {};
  for (const definition of definitions) {
    const warehouse = await findOrCreate<{ id: string }>(ctx, "/warehouses", "/warehouses", "code", definition.code, {
      ...definition,
      country: "GT",
    });
    ids[definition.code] = warehouse;
  }
  log(ctx.tenantSlug, "master-data", `${definitions.length} warehouses ready`);
  return { centralId: ids["WH-01"].id, all: ids };
}

async function seedTaxes(ctx: Ctx) {
  const definitions = [
    { code: "IVA", name: "IVA", rate: "12.0000" },
    { code: "EXENTO", name: "Exento", rate: "0.0000" },
    { code: "IVA_RED", name: "IVA Reducido", rate: "5.0000" },
    { code: "RET_IVA", name: "Retención IVA", rate: "1.5000" },
    { code: "RET_ISR", name: "Retención ISR", rate: "5.0000" },
    { code: "IVA_IMP", name: "IVA Importación", rate: "12.0000" },
    { code: "ARANCEL", name: "Arancel de Importación", rate: "15.0000" },
    { code: "TASA_MUN", name: "Tasa Municipal", rate: "2.0000" },
    { code: "IMP_TUR", name: "Impuesto de Turismo", rate: "3.0000" },
    { code: "TASA_ESP", name: "Tasa Especial", rate: "7.0000" },
  ];
  const ids: Record<string, string> = {};
  for (const definition of definitions) {
    const tax = await findOrCreate<{ id: string }>(ctx, "/taxes", "/taxes", "code", definition.code, definition);
    ids[definition.code] = tax.id;
  }
  log(ctx.tenantSlug, "master-data", `${definitions.length} taxes ready`);
  return { ivaId: ids["IVA"] };
}

async function seedPriceList(ctx: Ctx, products: Record<string, ProductRef>) {
  const priceList = await findOrCreate<{ id: string }>(
    ctx,
    "/pricing/price-lists",
    "/pricing/price-lists",
    "code",
    "GENERAL",
    { code: "GENERAL", name: "Lista general", currency: "GTQ" },
  );
  const items: Array<{ key: string; price: string }> = SIMPLE_PRODUCT_KEYS.map((key, index) => ({
    key,
    price: `${190 + index * 15}.0000`,
  }));
  const existingItems = await api<Array<{ productId: string }>>(
    "GET",
    `/pricing/price-lists/${priceList.id}/items`,
    auth(ctx),
  );
  let created = 0;
  for (const item of items) {
    const productId = products[item.key].id;
    if (existingItems.some((existing) => existing.productId === productId)) continue;
    await api("POST", `/pricing/price-lists/${priceList.id}/items`, {
      ...auth(ctx),
      body: { productId, price: item.price },
    });
    created += 1;
  }
  log(ctx.tenantSlug, "master-data", `1 price list ready with ${items.length} items (${created} created this run)`);
}

// --- Inventory --------------------------------------------------------

async function receiveStock(ctx: Ctx, warehouseId: string, products: Record<string, ProductRef>) {
  const receipts: Array<{ productKey: string; variantId?: string; quantity: string }> = [
    { productKey: "audifonos", quantity: "600.0000" },
    { productKey: "parlante", quantity: "500.0000" },
    { productKey: "cargador", quantity: "800.0000" },
    { productKey: "chaqueta", quantity: "400.0000" },
    { productKey: "sabanas", quantity: "400.0000" },
    { productKey: "ollas", quantity: "300.0000" },
    { productKey: "lampara", quantity: "400.0000" },
    { productKey: "mochila", quantity: "400.0000" },
    { productKey: "teclado", quantity: "400.0000" },
    { productKey: "silla", quantity: "300.0000" },
    { productKey: "camiseta", variantId: products.camiseta.variantIds[0], quantity: "400.0000" },
    { productKey: "camiseta", variantId: products.camiseta.variantIds[1], quantity: "400.0000" },
    { productKey: "pantalon", variantId: products.pantalon.variantIds[0], quantity: "400.0000" },
    { productKey: "pantalon", variantId: products.pantalon.variantIds[1], quantity: "400.0000" },
  ];
  for (const receipt of receipts) {
    await api("POST", "/inventory/movements/receipt", {
      ...auth(ctx),
      body: {
        warehouseId,
        productId: products[receipt.productKey].id,
        productVariantId: receipt.variantId,
        quantity: receipt.quantity,
        reason: "Recepción de demostración — carga de datos de verificación",
      },
    });
  }
  log(ctx.tenantSlug, "inventory", `${receipts.length} stock receipts recorded`);
}

// --- Sales + Payments ----------------------------------------------------

async function seedSales(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  customerIds: Record<string, string>,
  ivaId: string,
) {
  const customerCodes = Object.keys(customerIds);
  const orderCount = 12;
  let paymentsCaptured = 0;
  let returnsCreated = 0;

  for (let i = 0; i < orderCount; i += 1) {
    const customerCode = customerCodes[i % customerCodes.length];
    const productKey = SIMPLE_PRODUCT_KEYS[i % SIMPLE_PRODUCT_KEYS.length];
    const quantity = `${(i % 5) + 1}.0000`;

    const order = await api<{ id: string }>("POST", "/sales/orders", {
      ...auth(ctx),
      body: { customerId: customerIds[customerCode], currency: "GTQ" },
    });
    const line = await api<{ id: string; lineTotal: string }>("POST", `/sales/orders/${order.id}/lines`, {
      ...auth(ctx),
      body: { productId: products[productKey].id, warehouseId, taxId: ivaId, quantity },
    });

    // The first 2 orders stay DRAFT — a real "not yet confirmed" state for
    // the Ventas screen to show, not every order needs to reach the end.
    if (i < 2) continue;

    await api("POST", `/sales/orders/${order.id}/confirm`, auth(ctx));
    await api("POST", "/payments/capture", {
      ...auth(ctx),
      body: {
        salesOrderId: order.id,
        method: i % 2 === 0 ? "CASH" : "BANK_TRANSFER",
        amount: line.lineTotal,
        currency: "GTQ",
        idempotencyKey: `demo-seed-${order.id}`,
        reference: i % 2 === 0 ? undefined : `TRF-${order.id.slice(0, 8)}`,
      },
    });
    paymentsCaptured += 1;
    await api("POST", `/sales/orders/${order.id}/fulfill`, auth(ctx));

    if (i >= orderCount - 2) {
      await api("POST", "/sales/returns", {
        ...auth(ctx),
        body: {
          salesOrderId: order.id,
          reason: "Devolución de demostración — verificación de módulo",
          lines: [{ salesOrderLineId: line.id, quantity: "1.0000" }],
        },
      });
      returnsCreated += 1;
    }
  }

  // One more order using a variant line, so Sales exercises that path too.
  const variantOrder = await api<{ id: string }>("POST", "/sales/orders", {
    ...auth(ctx),
    body: { customerId: customerIds[customerCodes[0]], currency: "GTQ" },
  });
  const variantLine = await api<{ id: string; lineTotal: string }>("POST", `/sales/orders/${variantOrder.id}/lines`, {
    ...auth(ctx),
    body: {
      productId: products.camiseta.id,
      productVariantId: products.camiseta.variantIds[0],
      warehouseId,
      quantity: "3.0000",
    },
  });
  await api("POST", `/sales/orders/${variantOrder.id}/confirm`, auth(ctx));
  await api("POST", "/payments/capture", {
    ...auth(ctx),
    body: {
      salesOrderId: variantOrder.id,
      method: "CASH",
      amount: variantLine.lineTotal,
      currency: "GTQ",
      idempotencyKey: `demo-seed-${variantOrder.id}`,
    },
  });
  paymentsCaptured += 1;
  await api("POST", `/sales/orders/${variantOrder.id}/fulfill`, auth(ctx));

  log(
    ctx.tenantSlug,
    "sales",
    `${orderCount + 1} sales orders created, ${paymentsCaptured} payments captured, ${returnsCreated} returns`,
  );
}

// --- Purchasing ---------------------------------------------------------

async function seedPurchasing(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  supplierIds: Record<string, string>,
) {
  const supplierCodes = Object.keys(supplierIds);
  const orderCount = 12;
  let invoicesCreated = 0;

  for (let i = 0; i < orderCount; i += 1) {
    const supplierCode = supplierCodes[i % supplierCodes.length];
    const productKey = SIMPLE_PRODUCT_KEYS[i % SIMPLE_PRODUCT_KEYS.length];
    const quantity = `${((i % 5) + 2) * 10}.0000`;
    const unitCost = "50.0000";

    const order = await api<{ id: string }>("POST", "/purchasing/orders", {
      ...auth(ctx),
      body: { supplierId: supplierIds[supplierCode], currency: "GTQ" },
    });
    const line = await api<{ id: string; lineTotal: string }>("POST", `/purchasing/orders/${order.id}/lines`, {
      ...auth(ctx),
      body: { productId: products[productKey].id, warehouseId, quantity, unitCost },
    });

    // The first 2 orders stay DRAFT.
    if (i < 2) continue;

    await api("POST", `/purchasing/orders/${order.id}/confirm`, auth(ctx));

    const fullyReceive = i % 3 === 0;
    const receivedQuantity = fullyReceive ? quantity : (Number.parseFloat(quantity) * 0.6).toFixed(4);
    await api("POST", "/purchasing/receipts", {
      ...auth(ctx),
      body: { purchaseOrderId: order.id, lines: [{ purchaseOrderLineId: line.id, quantity: receivedQuantity }] },
    });
    if (fullyReceive) {
      await api("POST", `/purchasing/orders/${order.id}/close`, auth(ctx));
    }

    if (i % 4 === 0) {
      await api("POST", "/purchasing/supplier-invoices", {
        ...auth(ctx),
        body: {
          supplierId: supplierIds[supplierCode],
          purchaseOrderId: order.id,
          invoiceNumber: `FAC-DEMO-${order.id.slice(0, 8).toUpperCase()}`,
          amount: line.lineTotal,
          currency: "GTQ",
          issueDate: isoDate(new Date()),
          dueDate: isoDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        },
      });
      invoicesCreated += 1;
    }
  }

  log(ctx.tenantSlug, "purchasing", `${orderCount} purchase orders created, ${invoicesCreated} supplier invoices`);
}

// --- POS -----------------------------------------------------------------

async function seedPos(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  customerIds: Record<string, string>,
) {
  const customerCodes = Object.keys(customerIds);
  const register = await findOrCreate<{ id: string }>(ctx, "/pos/registers", "/pos/registers", "code", "REG-01", {
    warehouseId,
    code: "REG-01",
    name: "Caja principal",
  });
  // A register allows at most one OPEN shift at a time — a real
  // resumability gap found running this script: an earlier failed run
  // left a shift open (the crash happened before the closing call ever
  // ran), so a plain "always open a new shift" blew up on re-run with a
  // real business-rule rejection. Reuse the already-open one if there is
  // one, exactly like `findOrCreate` does for master data.
  const openShifts = await api<Array<{ id: string }>>(
    "GET",
    `/pos/shifts?registerId=${register.id}&status=OPEN`,
    auth(ctx),
  );
  const shift =
    openShifts[0] ??
    (await api<{ id: string }>("POST", "/pos/shifts", {
      ...auth(ctx),
      body: { registerId: register.id, openingCash: "500.0000", notes: "Turno de demostración" },
    }));
  await api("POST", `/pos/shifts/${shift.id}/cash-movements`, {
    ...auth(ctx),
    body: { type: "CASH_IN", amount: "100.0000", reason: "Fondo adicional" },
  });
  await api("POST", `/pos/shifts/${shift.id}/cash-movements`, {
    ...auth(ctx),
    body: { type: "CASH_OUT", amount: "20.0000", reason: "Pago de mensajería" },
  });

  const saleCount = 12;
  const sales: Array<{ id: string; salesOrderId: string }> = [];
  for (let i = 0; i < saleCount; i += 1) {
    const customerCode = customerCodes[i % customerCodes.length];
    const productKey = SIMPLE_PRODUCT_KEYS[i % SIMPLE_PRODUCT_KEYS.length];
    const useBankTransfer = i % 3 === 0;
    const sale = await api<{ id: string; salesOrderId: string }>("POST", "/pos/sales", {
      ...auth(ctx),
      body: {
        shiftId: shift.id,
        customerId: customerIds[customerCode],
        currency: "GTQ",
        paymentMethod: useBankTransfer ? "BANK_TRANSFER" : "CASH",
        paymentReference: useBankTransfer ? `POS-TRF-${shift.id.slice(0, 8)}-${i}` : undefined,
        // Comfortably covers the highest simple product's price (599.00)
        // times the highest quantity this loop generates (3) — a real
        // validation error found running this against the API: "500.00"
        // wasn't enough once the loop reached higher-priced products.
        amountTendered: useBankTransfer ? undefined : "2000.0000",
        idempotencyKey: `demo-pos-sale-${i}-${shift.id}`,
        lines: [{ productId: products[productKey].id, quantity: `${(i % 3) + 1}.0000` }],
      },
    });
    sales.push(sale);
  }

  // Real returns for the first 2 sales — looked up via the sale's own
  // underlying SalesOrder lines (a real bug found while scaling this
  // script up: the original version passed the PosSale's own id as the
  // salesOrderLineId, which never matched anything, so the "return" call
  // always failed silently behind a swallowed .catch()).
  let returnsCreated = 0;
  for (const sale of sales.slice(0, 2)) {
    const orderLines = await api<Array<{ id: string }>>(
      "GET",
      `/sales/orders/${sale.salesOrderId}/lines`,
      auth(ctx),
    );
    const firstLine = orderLines[0];
    if (!firstLine) continue;
    await api("POST", "/pos/returns", {
      ...auth(ctx),
      body: {
        shiftId: shift.id,
        posSaleId: sale.id,
        reason: "Cliente cambió de opinión",
        issueRefund: true,
        idempotencyKey: `demo-pos-return-${sale.id}`,
        lines: [{ salesOrderLineId: firstLine.id, quantity: "1.0000" }],
      },
    });
    returnsCreated += 1;
  }

  await api("POST", `/pos/shifts/${shift.id}/close`, {
    ...auth(ctx),
    body: { closingCashCounted: "3000.0000" },
  });

  log(ctx.tenantSlug, "pos", `1 register, 1 shift, ${saleCount} ring-up sales, ${returnsCreated} returns, shift closed`);
}

// --- Commerce --------------------------------------------------------

async function seedCommerce(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  storefrontCode: string,
) {
  const storefront = await findOrCreate<{ id: string; code: string }>(
    ctx,
    "/commerce/storefronts",
    "/commerce/storefronts",
    "code",
    storefrontCode,
    { code: storefrontCode, name: `Tienda ${ctx.tenantSlug}`, currency: "GTQ", defaultWarehouseId: warehouseId },
  );

  const toPublish = SIMPLE_PRODUCT_KEYS.slice(0, 8);
  for (const key of toPublish) {
    await api("POST", `/commerce/storefronts/${storefront.id}/products`, {
      ...auth(ctx),
      body: { productId: products[key].id },
    }).catch((error) => {
      // publishProduct is idempotent per docs/PROJECT_STATE.md — a real
      // republish is a no-op, not an error, but re-guard defensively in
      // case a future backend version changes that contract.
      if (!(error instanceof DemoSeedError && error.statusCode === 201)) throw error;
    });
  }

  const guests = [
    { name: "Sofía Ramírez", email: "sofia.ramirez@example.com" },
    { name: "Diego Castillo", email: "diego.castillo@example.com" },
    { name: "Valentina Gómez", email: "valentina.gomez@example.com" },
    { name: "Mateo Herrera", email: "mateo.herrera@example.com" },
    { name: "Isabella Cruz", email: "isabella.cruz@example.com" },
    { name: "Sebastián Morales", email: "sebastian.morales@example.com" },
    { name: "Camila Reyes", email: "camila.reyes@example.com" },
    { name: "Andrés Ortiz", email: "andres.ortiz@example.com" },
    { name: "Renata Flores", email: "renata.flores@example.com" },
    { name: "Emilio Vargas", email: "emilio.vargas@example.com" },
    { name: "Paula Jiménez", email: "paula.jimenez@example.com" },
    { name: "Tomás Ibáñez", email: "tomas.ibanez@example.com" },
  ];

  let checkoutsCompleted = 0;
  for (let i = 0; i < guests.length; i += 1) {
    const productKey = toPublish[i % toPublish.length];
    const guest = guests[i];
    const cart = await api<{ id: string }>("POST", `/storefront/${storefront.code}/carts`, { body: {} });
    await api("POST", `/storefront/${storefront.code}/carts/${cart.id}/lines`, {
      body: { productId: products[productKey].id, quantity: `${(i % 3) + 1}.0000` },
    });
    await api("POST", `/storefront/${storefront.code}/checkout`, {
      body: {
        cartId: cart.id,
        guestName: guest.name,
        guestEmail: guest.email,
        paymentReference: i % 3 === 0 ? `WEB-TRF-${cart.id.slice(0, 8)}` : undefined,
      },
    });
    checkoutsCompleted += 1;
  }

  log(
    ctx.tenantSlug,
    "commerce",
    `1 storefront, ${toPublish.length} published products, ${checkoutsCompleted} guest checkouts`,
  );
}

// --- Accounting -------------------------------------------------------

async function seedAccounting(ctx: Ctx) {
  async function account(code: string, name: string, type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE") {
    return findOrCreate<{ id: string }>(ctx, "/accounting/accounts", "/accounting/accounts", "code", code, {
      code,
      name,
      type,
    });
  }

  const cash = await account("1000", "Caja", "ASSET");
  const bank = await account("1010", "Bancos", "ASSET");
  const receivable = await account("1100", "Cuentas por Cobrar", "ASSET");
  const inventoryAccount = await account("1200", "Inventario", "ASSET");
  const payable = await account("2000", "Cuentas por Pagar", "LIABILITY");
  const capital = await account("3000", "Capital", "EQUITY");
  const revenue = await account("4000", "Ingresos por Ventas", "REVENUE");
  const expense = await account("5000", "Gastos Operativos", "EXPENSE");

  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const periodCode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  await findOrCreate(ctx, "/accounting/fiscal-periods", "/accounting/fiscal-periods", "code", periodCode, {
    code: periodCode,
    name: `Periodo ${periodCode}`,
    startDate: isoDate(periodStart),
    endDate: isoDate(periodEnd),
  });

  const entryDate = isoDate(today);
  async function entry(description: string, lines: Array<{ accountId: string; debit?: string; credit?: string }>) {
    await api("POST", "/accounting/journal-entries", { ...auth(ctx), body: { entryDate, description, lines } });
  }

  const pairs: Array<[string, string]> = [
    [cash.id, capital.id],
    [cash.id, revenue.id],
    [expense.id, bank.id],
    [inventoryAccount.id, payable.id],
    [receivable.id, revenue.id],
    [bank.id, receivable.id],
    [expense.id, cash.id],
    [payable.id, bank.id],
    [cash.id, revenue.id],
    [inventoryAccount.id, payable.id],
    [expense.id, bank.id],
    [receivable.id, revenue.id],
  ];

  let entriesCreated = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    const [debitAccountId, creditAccountId] = pairs[i];
    const amount = `${(i + 1) * 125}.0000`;
    await entry(`Movimiento contable de demostración #${i + 1}`, [
      { accountId: debitAccountId, debit: amount },
      { accountId: creditAccountId, credit: amount },
    ]);
    entriesCreated += 1;
  }

  log(ctx.tenantSlug, "accounting", `8 accounts, 1 open fiscal period, ${entriesCreated} balanced journal entries`);
}

// --- CRM --------------------------------------------------------------

async function seedCrm(ctx: Ctx, customerIds: Record<string, string>) {
  const customerCodes = Object.keys(customerIds);
  const pipeline = await findOrCreate<{ id: string }>(ctx, "/crm/pipelines", "/crm/pipelines", "code", "SALES", {
    code: "SALES",
    name: "Ventas",
  });
  const stagesPath = `/crm/pipelines/${pipeline.id}/stages`;
  const prospecting = await findOrCreate<{ id: string }>(ctx, stagesPath, stagesPath, "name", "Prospección", {
    name: "Prospección",
    isWon: false,
    isLost: false,
  });
  const negotiation = await findOrCreate<{ id: string }>(ctx, stagesPath, stagesPath, "name", "Negociación", {
    name: "Negociación",
    isWon: false,
    isLost: false,
  });
  const won = await findOrCreate<{ id: string }>(ctx, stagesPath, stagesPath, "name", "Cerrado ganado", {
    name: "Cerrado ganado",
    isWon: true,
    isLost: false,
  });

  const leadDefinitions = [
    { name: "Ana López", companyName: "Distribuidora del Sur", email: "ana.lopez@distrisur.gt" },
    { name: "Carlos Méndez", companyName: "Comercial Ideal", email: "carlos.mendez@comercialideal.gt" },
    { name: "María Fernanda Ruiz", companyName: "Grupo Innova", email: "mf.ruiz@grupoinnova.gt" },
    { name: "Jorge Salazar", companyName: "Ferretería Central", email: "jorge.salazar@ferreteriacentral.gt" },
    { name: "Lucía Ramírez", companyName: "Boutique Luna", email: "lucia.ramirez@boutiqueluna.gt" },
    { name: "Roberto Aguilar", companyName: "Comercial del Lago", email: "roberto.aguilar@comerlago.gt" },
    { name: "Daniela Castañeda", companyName: "Distribuidora Real", email: "daniela.castaneda@distrireal.gt" },
    { name: "Fernando Paz", companyName: "Grupo Andes", email: "fernando.paz@grupoandes.gt" },
    { name: "Gabriela Solís", companyName: "Comercial Estrella", email: "gabriela.solis@comercialestrella.gt" },
    { name: "Alejandro Rivas", companyName: "Distribuidora Norte GT", email: "alejandro.rivas@distrinorte.gt" },
    { name: "Karla Monterroso", companyName: "Almacén Central", email: "karla.monterroso@almacencentral.gt" },
    { name: "Pablo Estrada", companyName: "Comercializadora Maya", email: "pablo.estrada@comermaya.gt" },
  ];
  const leadIds: string[] = [];
  for (const definition of leadDefinitions) {
    const lead = await api<{ id: string }>("POST", "/crm/leads", { ...auth(ctx), body: definition });
    leadIds.push(lead.id);
  }

  const converted: string[] = [];
  for (const leadId of leadIds.slice(0, 4)) {
    const result = await api<{ customerId: string }>("POST", `/crm/leads/${leadId}/convert`, auth(ctx));
    converted.push(result.customerId);
  }

  const stages = [prospecting, negotiation, won];
  const opportunityCount = 12;
  const opportunityIds: string[] = [];
  for (let i = 0; i < opportunityCount; i += 1) {
    const useConverted = i < converted.length;
    const stage = stages[i % 2]; // alternate prospecting/negotiation; a few get moved to won below
    const opportunity = await api<{ id: string }>("POST", "/crm/opportunities", {
      ...auth(ctx),
      body: {
        name: `Oportunidad de demostración #${i + 1}`,
        pipelineId: pipeline.id,
        stageId: stage.id,
        customerId: useConverted ? converted[i] : customerIds[customerCodes[i % customerCodes.length]],
        amount: `${(i + 1) * 2500}.0000`,
        currency: "GTQ",
      },
    });
    opportunityIds.push(opportunity.id);
  }
  // Move a few real opportunities all the way to the won stage.
  for (const opportunityId of opportunityIds.slice(0, 3)) {
    await api("PUT", `/crm/opportunities/${opportunityId}/stage`, { ...auth(ctx), body: { stageId: won.id } });
  }

  const activityTypes: Array<"CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK"> = [
    "CALL",
    "EMAIL",
    "MEETING",
    "NOTE",
    "TASK",
  ];
  let activitiesCreated = 0;
  for (let i = 0; i < leadIds.length; i += 1) {
    await api("POST", "/crm/activities", {
      ...auth(ctx),
      body: {
        type: activityTypes[i % activityTypes.length],
        subject: `Seguimiento de demostración #${i + 1}`,
        relatedLeadId: leadIds[i],
      },
    });
    activitiesCreated += 1;
  }
  for (let i = 0; i < opportunityIds.length; i += 1) {
    await api("POST", "/crm/activities", {
      ...auth(ctx),
      body: {
        type: activityTypes[(i + 1) % activityTypes.length],
        subject: `Nota de oportunidad de demostración #${i + 1}`,
        relatedOpportunityId: opportunityIds[i],
      },
    });
    activitiesCreated += 1;
  }

  log(
    ctx.tenantSlug,
    "crm",
    `1 pipeline, 3 stages, ${leadDefinitions.length} leads (${converted.length} converted), ${opportunityCount} opportunities, ${activitiesCreated} activities`,
  );
}

// --- Manufacturing ----------------------------------------------------

async function seedManufacturing(ctx: Ctx, warehouseId: string, products: Record<string, ProductRef>) {
  const bom = await findOrCreate<{ id: string }>(
    ctx,
    "/manufacturing/bills-of-material",
    "/manufacturing/bills-of-material",
    "code",
    "BOM-COMBO-01",
    {
      productId: products.combo.id,
      code: "BOM-COMBO-01",
      name: "Combo de regalo audio",
      components: [
        { componentProductId: products.audifonos.id, quantityPerUnit: "1.0000" },
        { componentProductId: products.cargador.id, quantityPerUnit: "1.0000" },
      ],
    },
  );

  const orderCount = 12;
  let closedCount = 0;
  for (let i = 0; i < orderCount; i += 1) {
    const quantityPlanned = `${(i % 4) + 3}.0000`;
    const order = await api<{ id: string }>("POST", "/manufacturing/orders", {
      ...auth(ctx),
      body: { billOfMaterialId: bom.id, warehouseId, quantityPlanned },
    });
    await api("POST", `/manufacturing/orders/${order.id}/confirm`, auth(ctx));

    const materials = await api<Array<{ id: string; quantityRequired: string }>>(
      "GET",
      `/manufacturing/orders/${order.id}/materials`,
      auth(ctx),
    );
    const fullyIssue = i % 2 === 0;
    for (const material of materials) {
      const issueQuantity = fullyIssue
        ? material.quantityRequired
        : `${(Number.parseFloat(material.quantityRequired) * 0.5).toFixed(4)}`;
      await api("POST", `/manufacturing/orders/${order.id}/materials/issue`, {
        ...auth(ctx),
        body: { productionOrderMaterialId: material.id, quantity: issueQuantity },
      });
    }

    const receivedQuantity = fullyIssue ? quantityPlanned : `${(Number.parseFloat(quantityPlanned) * 0.5).toFixed(4)}`;
    await api("POST", `/manufacturing/orders/${order.id}/finished-goods-receipts`, {
      ...auth(ctx),
      body: { quantity: receivedQuantity },
    });

    if (fullyIssue) {
      await api("POST", `/manufacturing/orders/${order.id}/close`, auth(ctx));
      closedCount += 1;
    }
  }

  log(ctx.tenantSlug, "manufacturing", `1 BOM, ${orderCount} production orders (${closedCount} closed)`);
}

// --- Orchestration ----------------------------------------------------------

async function seedTenant(config: TenantConfig): Promise<void> {
  log(config.tenantSlug, "start", `seeding "${config.tenantName}" against ${BASE_URL}`);

  const session = await registerOrLoginOwner(config);
  const { companyId } = await provisionOrReuseTenant(config, session.accessToken);
  const ctx: Ctx = { tenantSlug: config.tenantSlug, accessToken: session.accessToken, companyId };

  const { unitId } = await seedUnitsOfMeasure(ctx);
  const categories = await seedCategories(ctx);
  const brands = await seedBrands(ctx);
  const products = await seedProducts(ctx, unitId, categories, brands);
  const customerIds = await seedCustomers(ctx);
  const supplierIds = await seedSuppliers(ctx);
  const { centralId } = await seedWarehouses(ctx);
  const { ivaId } = await seedTaxes(ctx);
  await seedPriceList(ctx, products);

  await receiveStock(ctx, centralId, products);
  await seedSales(ctx, centralId, products, customerIds, ivaId);
  await seedPurchasing(ctx, centralId, products, supplierIds);
  await seedPos(ctx, centralId, products, customerIds);
  await seedCommerce(ctx, centralId, products, config.storefrontCode);
  await seedAccounting(ctx);
  await seedCrm(ctx, customerIds);
  await seedManufacturing(ctx, centralId, products);

  log(config.tenantSlug, "done", `"${config.tenantName}" is fully seeded — log in as ${config.ownerEmail} to explore it.`);
}

async function main() {
  for (const config of TENANTS) {
    await seedTenant(config);
  }
  console.log(`[seed-demo-data] all ${TENANTS.length} tenants seeded successfully.`);
}

main().catch((error) => {
  console.error("[seed-demo-data] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
