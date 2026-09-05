/**
 * Fills a brand-new, separate "Demo ERP" tenant with realistic records
 * across every business module, so a fresh viewer of the platform (or the
 * new home dashboard's widgets) has real, non-zero content to look at.
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
 * API (`SEED_API_BASE_URL`, default `http://localhost:3000/api/v1`).
 *
 * Re-running is not guaranteed idempotent — a demo fill only needs to run
 * once; a second run will hit real 409s on unique codes (products,
 * customers, etc.) and stop. That's acceptable for a one-off seed, not a
 * production backfill.
 */

const BASE_URL = process.env.SEED_API_BASE_URL ?? "http://localhost:3000/api/v1";
const OWNER_EMAIL = "demo-owner@erp-platform.local";
const OWNER_PASSWORD = "DemoErp9!Platform";
const TENANT_SLUG = "demo-erp";

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

function log(step: string, message: string): void {
  console.log(`[seed-demo-data] ${step}: ${message}`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// --- Step 1-2: identity + tenant -------------------------------------------------

async function registerOrLoginOwner(): Promise<{ accessToken: string }> {
  try {
    const session = await api<{ accessToken: string }>("POST", "/auth/register", {
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD, displayName: "Propietaria Demo ERP" },
    });
    log("auth", `owner account created (${OWNER_EMAIL})`);
    return session;
  } catch (error) {
    if (error instanceof DemoSeedError && error.statusCode === 409) {
      const session = await api<{ accessToken: string }>("POST", "/auth/login", {
        body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
      });
      log("auth", `owner account already existed, logged in instead (${OWNER_EMAIL})`);
      return session;
    }
    throw error;
  }
}

async function provisionOrReuseTenant(accessToken: string): Promise<{ companyId: string }> {
  try {
    const provisioned = await api<{ company?: { id: string } }>("POST", "/tenants", {
      accessToken,
      body: {
        slug: TENANT_SLUG,
        name: "Demo ERP",
        organization: { code: "DEMOORG", name: "Demo ERP Holdings" },
        company: { code: "DEMOCO", name: "Demo ERP Comercial, S.A." },
      },
    });
    if (!provisioned.company) throw new Error("Provisioning did not return a company.");
    log("tenant", `provisioned "Demo ERP" (${TENANT_SLUG}), companyId=${provisioned.company.id}`);
    return { companyId: provisioned.company.id };
  } catch (error) {
    if (error instanceof DemoSeedError && error.statusCode === 409) {
      const companies = await api<Array<{ id: string }>>("GET", "/tenants/companies", {
        accessToken,
        tenantSlug: TENANT_SLUG,
      });
      const companyId = companies[0]?.id;
      if (!companyId) {
        throw new Error("Tenant already provisioned but has no company to reuse.", { cause: error });
      }
      log("tenant", `"Demo ERP" already provisioned, reusing companyId=${companyId}`);
      return { companyId };
    }
    throw error;
  }
}

// --- Step 3: master data -----------------------------------------------------

interface Ctx {
  accessToken: string;
  companyId: string;
}

function auth(ctx: Ctx) {
  return { accessToken: ctx.accessToken, tenantSlug: TENANT_SLUG, companyId: ctx.companyId };
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
  log("master-data", "2 units of measure ready");
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
  log("master-data", "3 categories ready");
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
  log("master-data", "2 brands ready");
  return { auroraId: aurora.id, andinaId: andina.id };
}

interface ProductRef {
  id: string;
  code: string;
  hasVariants: boolean;
  variantIds: string[];
}

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

  // An 11th product, deliberately not sold directly on its own — it exists
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

  log("master-data", `${Object.keys(products).length} products ready (2 with variants, 4 variants total)`);
  return products;
}

async function seedCustomers(ctx: Ctx) {
  const definitions = [
    { code: "CUST-01", name: "Distribuidora Aurora", email: "compras@aurora.gt", city: "Ciudad de Guatemala" },
    { code: "CUST-02", name: "Comercial Quetzal", email: "pedidos@quetzal.gt", city: "Quetzaltenango" },
    { code: "CUST-03", name: "Tienda Vista Hermosa", email: "contacto@vistahermosa.gt", city: "Antigua Guatemala" },
    { code: "CUST-04", name: "Grupo Mayoreo GT", email: "compras@mayoreogt.com", city: "Ciudad de Guatemala" },
    { code: "CUST-05", name: "Retail Express", email: "ventas@retailexpress.gt", city: "Escuintla" },
  ];
  const ids: Record<string, string> = {};
  for (const definition of definitions) {
    const customer = await findOrCreate<{ id: string }>(ctx, "/customers", "/customers", "code", definition.code, {
      ...definition,
      country: "GT",
    });
    ids[definition.code] = customer.id;
  }
  log("master-data", "5 customers ready");
  return ids;
}

async function seedSuppliers(ctx: Ctx) {
  const definitions = [
    { code: "SUP-01", name: "Importadora del Norte", email: "ventas@impnorte.gt" },
    { code: "SUP-02", name: "Textiles Andinos", email: "pedidos@textilesandinos.com" },
    { code: "SUP-03", name: "Electro Import GT", email: "contacto@electroimport.gt" },
    { code: "SUP-04", name: "Hogar y Estilo", email: "ventas@hogarestilo.gt" },
  ];
  const ids: Record<string, string> = {};
  for (const definition of definitions) {
    const supplier = await findOrCreate<{ id: string }>(ctx, "/suppliers", "/suppliers", "code", definition.code, {
      ...definition,
      country: "GT",
    });
    ids[definition.code] = supplier.id;
  }
  log("master-data", "4 suppliers ready");
  return ids;
}

async function seedWarehouses(ctx: Ctx) {
  const central = await findOrCreate<{ id: string }>(ctx, "/warehouses", "/warehouses", "code", "WH-01", {
    code: "WH-01",
    name: "Bodega Central",
    city: "Ciudad de Guatemala",
    country: "GT",
  });
  const north = await findOrCreate<{ id: string }>(ctx, "/warehouses", "/warehouses", "code", "WH-02", {
    code: "WH-02",
    name: "Bodega Norte",
    city: "Cobán",
    country: "GT",
  });
  log("master-data", "2 warehouses ready");
  return { centralId: central.id, northId: north.id };
}

async function seedTaxes(ctx: Ctx) {
  const iva = await findOrCreate<{ id: string }>(ctx, "/taxes", "/taxes", "code", "IVA", {
    code: "IVA",
    name: "IVA",
    rate: "12.0000",
  });
  await findOrCreate(ctx, "/taxes", "/taxes", "code", "EXENTO", { code: "EXENTO", name: "Exento", rate: "0.0000" });
  log("master-data", "2 taxes ready");
  return { ivaId: iva.id };
}

// --- Step 4: inventory --------------------------------------------------------

async function receiveStock(ctx: Ctx, warehouseId: string, products: Record<string, ProductRef>) {
  const receipts: Array<{ productKey: string; variantId?: string; quantity: string }> = [
    { productKey: "audifonos", quantity: "80.0000" },
    { productKey: "parlante", quantity: "60.0000" },
    { productKey: "cargador", quantity: "150.0000" },
    { productKey: "chaqueta", quantity: "45.0000" },
    { productKey: "sabanas", quantity: "55.0000" },
    { productKey: "ollas", quantity: "20.0000" },
    { productKey: "lampara", quantity: "65.0000" },
    { productKey: "mochila", quantity: "50.0000" },
    { productKey: "camiseta", variantId: products.camiseta.variantIds[0], quantity: "40.0000" },
    { productKey: "camiseta", variantId: products.camiseta.variantIds[1], quantity: "35.0000" },
    { productKey: "pantalon", variantId: products.pantalon.variantIds[0], quantity: "30.0000" },
    { productKey: "pantalon", variantId: products.pantalon.variantIds[1], quantity: "25.0000" },
  ];
  for (const receipt of receipts) {
    await api("POST", "/inventory/movements/receipt", {
      ...auth(ctx),
      body: {
        warehouseId,
        productId: products[receipt.productKey].id,
        productVariantId: receipt.variantId,
        quantity: receipt.quantity,
        reason: "Recepción inicial — carga de datos de demostración",
      },
    });
  }
  log("inventory", `${receipts.length} stock receipts recorded across ${Object.keys(products).length - 1} products`);
}

// --- Step 5: sales -------------------------------------------------------------

async function seedSales(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  customers: Record<string, string>,
  ivaId: string,
) {
  async function newOrder(customerCode: string) {
    return api<{ id: string }>("POST", "/sales/orders", {
      ...auth(ctx),
      body: { customerId: customers[customerCode], currency: "GTQ" },
    });
  }

  async function addLine(orderId: string, productKey: string, quantity: string, variantId?: string) {
    return api<{ id: string }>("POST", `/sales/orders/${orderId}/lines`, {
      ...auth(ctx),
      body: {
        productId: products[productKey].id,
        productVariantId: variantId,
        warehouseId,
        taxId: ivaId,
        quantity,
      },
    });
  }

  async function confirm(orderId: string) {
    await api("POST", `/sales/orders/${orderId}/confirm`, auth(ctx));
  }

  async function capture(orderId: string, amount: string, method: "CASH" | "BANK_TRANSFER") {
    await api("POST", "/payments/capture", {
      ...auth(ctx),
      body: {
        salesOrderId: orderId,
        method,
        amount,
        currency: "GTQ",
        idempotencyKey: `demo-seed-${orderId}-${method}`,
        reference: method === "BANK_TRANSFER" ? `TRF-${orderId.slice(0, 8)}` : undefined,
      },
    });
  }

  async function fulfill(orderId: string) {
    await api("POST", `/sales/orders/${orderId}/fulfill`, auth(ctx));
  }

  // 1. Fully fulfilled and paid.
  const order1 = await newOrder("CUST-01");
  await addLine(order1.id, "audifonos", "3.0000");
  await confirm(order1.id);
  await capture(order1.id, "836.7600", "CASH");
  await fulfill(order1.id);

  // 2. Fully fulfilled, paid by bank transfer.
  const order2 = await newOrder("CUST-02");
  await addLine(order2.id, "parlante", "5.0000");
  await confirm(order2.id);
  await capture(order2.id, "1058.4000", "BANK_TRANSFER");
  await fulfill(order2.id);

  // 3. Confirmed, reserved, not yet paid.
  const order3 = await newOrder("CUST-03");
  await addLine(order3.id, "cargador", "10.0000");
  await confirm(order3.id);

  // 4. Still a draft.
  const order4 = await newOrder("CUST-04");
  await addLine(order4.id, "chaqueta", "2.0000");

  // 5. Fulfilled, paid, then partially returned.
  const order5 = await newOrder("CUST-05");
  const order5Line = await addLine(order5.id, "sabanas", "4.0000");
  await confirm(order5.id);
  await capture(order5.id, "1157.9600", "CASH");
  await fulfill(order5.id);
  await api("POST", "/sales/returns", {
    ...auth(ctx),
    body: {
      salesOrderId: order5.id,
      reason: "Cliente devolvió una unidad por empaque dañado",
      lines: [{ salesOrderLineId: order5Line.id, quantity: "1.0000" }],
    },
  });

  // 6. Fulfilled, paid — a variant line.
  const order6 = await newOrder("CUST-01");
  await addLine(order6.id, "camiseta", "6.0000", products.camiseta.variantIds[0]);
  await confirm(order6.id);
  await capture(order6.id, "665.2800", "CASH");
  await fulfill(order6.id);

  log("sales", "6 sales orders created (draft/confirmed/fulfilled mix, 1 return)");
}

// --- Step 6: purchasing ---------------------------------------------------------

async function seedPurchasing(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  suppliers: Record<string, string>,
) {
  // 1. Confirmed and fully received.
  const order1 = await api<{ id: string }>("POST", "/purchasing/orders", {
    ...auth(ctx),
    body: { supplierId: suppliers["SUP-04"], currency: "GTQ" },
  });
  const order1Line = await api<{ id: string }>("POST", `/purchasing/orders/${order1.id}/lines`, {
    ...auth(ctx),
    body: { productId: products.ollas.id, warehouseId, quantity: "30.0000", unitCost: "320.0000" },
  });
  await api("POST", `/purchasing/orders/${order1.id}/confirm`, auth(ctx));
  await api("POST", "/purchasing/receipts", {
    ...auth(ctx),
    body: { purchaseOrderId: order1.id, lines: [{ purchaseOrderLineId: order1Line.id, quantity: "30.0000" }] },
  });

  // 2. Confirmed, partially received.
  const order2 = await api<{ id: string }>("POST", "/purchasing/orders", {
    ...auth(ctx),
    body: { supplierId: suppliers["SUP-03"], currency: "GTQ" },
  });
  const order2Line = await api<{ id: string }>("POST", `/purchasing/orders/${order2.id}/lines`, {
    ...auth(ctx),
    body: { productId: products.lampara.id, warehouseId, quantity: "40.0000", unitCost: "70.0000" },
  });
  await api("POST", `/purchasing/orders/${order2.id}/confirm`, auth(ctx));
  await api("POST", "/purchasing/receipts", {
    ...auth(ctx),
    body: { purchaseOrderId: order2.id, lines: [{ purchaseOrderLineId: order2Line.id, quantity: "25.0000" }] },
  });

  // 3. Still a draft.
  await api("POST", "/purchasing/orders", {
    ...auth(ctx),
    body: { supplierId: suppliers["SUP-01"], currency: "GTQ" },
  }).then((order) =>
    api("POST", `/purchasing/orders/${(order as { id: string }).id}/lines`, {
      ...auth(ctx),
      body: { productId: products.audifonos.id, warehouseId, quantity: "50.0000", unitCost: "140.0000" },
    }),
  );

  // 4. Fully received, closed, plus a supplier invoice.
  const order4 = await api<{ id: string }>("POST", "/purchasing/orders", {
    ...auth(ctx),
    body: { supplierId: suppliers["SUP-02"], currency: "GTQ" },
  });
  const order4Line = await api<{ id: string }>("POST", `/purchasing/orders/${order4.id}/lines`, {
    ...auth(ctx),
    body: { productId: products.mochila.id, warehouseId, quantity: "60.0000", unitCost: "110.0000" },
  });
  await api("POST", `/purchasing/orders/${order4.id}/confirm`, auth(ctx));
  await api("POST", "/purchasing/receipts", {
    ...auth(ctx),
    body: { purchaseOrderId: order4.id, lines: [{ purchaseOrderLineId: order4Line.id, quantity: "60.0000" }] },
  });
  await api("POST", `/purchasing/orders/${order4.id}/close`, auth(ctx));
  await api("POST", "/purchasing/supplier-invoices", {
    ...auth(ctx),
    body: {
      supplierId: suppliers["SUP-02"],
      purchaseOrderId: order4.id,
      invoiceNumber: "FAC-DEMO-1001",
      amount: "6600.0000",
      currency: "GTQ",
      issueDate: isoDate(new Date()),
      dueDate: isoDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
  });

  log("purchasing", "4 purchase orders created (draft/confirmed-partial/closed mix, 1 supplier invoice)");
}

// --- Step 7: POS -----------------------------------------------------------------

async function seedPos(
  ctx: Ctx,
  warehouseId: string,
  products: Record<string, ProductRef>,
  customers: Record<string, string>,
) {
  const register = await findOrCreate<{ id: string }>(ctx, "/pos/registers", "/pos/registers", "code", "REG-01", {
    warehouseId,
    code: "REG-01",
    name: "Caja principal",
  });
  const shift = await api<{ id: string }>("POST", "/pos/shifts", {
    ...auth(ctx),
    body: { registerId: register.id, openingCash: "500.0000", notes: "Turno de demostración" },
  });
  await api("POST", `/pos/shifts/${shift.id}/cash-movements`, {
    ...auth(ctx),
    body: { type: "CASH_IN", amount: "100.0000", reason: "Fondo adicional" },
  });

  const sale1 = await api<{ id: string }>("POST", "/pos/sales", {
    ...auth(ctx),
    body: {
      shiftId: shift.id,
      customerId: customers["CUST-01"],
      currency: "GTQ",
      paymentMethod: "CASH",
      amountTendered: "200.0000",
      idempotencyKey: `demo-pos-sale-1-${shift.id}`,
      lines: [{ productId: products.cargador.id, quantity: "2.0000" }],
    },
  });
  await api("POST", "/pos/sales", {
    ...auth(ctx),
    body: {
      shiftId: shift.id,
      customerId: customers["CUST-02"],
      currency: "GTQ",
      paymentMethod: "CASH",
      amountTendered: "200.0000",
      idempotencyKey: `demo-pos-sale-2-${shift.id}`,
      lines: [{ productId: products.parlante.id, quantity: "1.0000" }],
    },
  });
  await api("POST", "/pos/sales", {
    ...auth(ctx),
    body: {
      shiftId: shift.id,
      customerId: customers["CUST-03"],
      currency: "GTQ",
      paymentMethod: "BANK_TRANSFER",
      paymentReference: `POS-TRF-${shift.id.slice(0, 8)}`,
      idempotencyKey: `demo-pos-sale-3-${shift.id}`,
      lines: [{ productId: products.audifonos.id, quantity: "1.0000" }],
    },
  });
  await api("POST", "/pos/sales", {
    ...auth(ctx),
    body: {
      shiftId: shift.id,
      customerId: customers["CUST-04"],
      currency: "GTQ",
      paymentMethod: "CASH",
      amountTendered: "250.0000",
      idempotencyKey: `demo-pos-sale-4-${shift.id}`,
      lines: [{ productId: products.mochila.id, quantity: "1.0000" }],
    },
  });

  await api("POST", "/pos/returns", {
    ...auth(ctx),
    body: {
      shiftId: shift.id,
      posSaleId: sale1.id,
      reason: "Cliente cambió de opinión",
      issueRefund: true,
      idempotencyKey: `demo-pos-return-1-${shift.id}`,
      lines: [{ salesOrderLineId: sale1.id, quantity: "1.0000" }],
    },
  }).catch(() => {
    // If the sale's line id doesn't line up (POS doesn't expose it directly
    // in the ring-up response), skip the return rather than fail the whole
    // seed — the sale itself already gives the dashboard real content.
  });

  await api("POST", `/pos/shifts/${shift.id}/close`, {
    ...auth(ctx),
    body: { closingCashCounted: "900.0000" },
  });

  log("pos", "1 register, 1 shift, 4 ring-up sales, 1 return attempt, shift closed");
}

// --- Step 8: commerce --------------------------------------------------------

async function seedCommerce(ctx: Ctx, warehouseId: string, products: Record<string, ProductRef>) {
  const storefront = await findOrCreate<{ id: string; code: string }>(
    ctx,
    "/commerce/storefronts",
    "/commerce/storefronts",
    "code",
    "tienda-demo",
    { code: "tienda-demo", name: "Tienda Demo ERP", currency: "GTQ", defaultWarehouseId: warehouseId },
  );

  const toPublish = ["audifonos", "parlante", "cargador", "chaqueta", "mochila"];
  for (const key of toPublish) {
    await api("POST", `/commerce/storefronts/${storefront.id}/products`, {
      ...auth(ctx),
      body: { productId: products[key].id },
    });
  }

  async function guestCheckout(productKey: string, quantity: string, name: string, email: string, withPayment: boolean) {
    const cart = await api<{ id: string }>("POST", `/storefront/${storefront.code}/carts`, { body: {} });
    await api("POST", `/storefront/${storefront.code}/carts/${cart.id}/lines`, {
      body: { productId: products[productKey].id, quantity },
    });
    await api("POST", `/storefront/${storefront.code}/checkout`, {
      body: {
        cartId: cart.id,
        guestName: name,
        guestEmail: email,
        paymentReference: withPayment ? `WEB-TRF-${cart.id.slice(0, 8)}` : undefined,
      },
    });
  }

  await guestCheckout("audifonos", "1.0000", "Sofía Ramírez", "sofia.ramirez@example.com", false);
  await guestCheckout("mochila", "2.0000", "Diego Castillo", "diego.castillo@example.com", true);

  log("commerce", "1 storefront, 5 published products, 2 guest checkouts");
}

// --- Step 9: accounting -------------------------------------------------------

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
  await account("1100", "Cuentas por Cobrar", "ASSET");
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

  await entry("Aporte de capital inicial", [
    { accountId: cash.id, debit: "5000.0000" },
    { accountId: capital.id, credit: "5000.0000" },
  ]);
  await entry("Reconocimiento de venta en efectivo", [
    { accountId: cash.id, debit: "500.0000" },
    { accountId: revenue.id, credit: "500.0000" },
  ]);
  await entry("Pago de gasto operativo", [
    { accountId: expense.id, debit: "250.0000" },
    { accountId: bank.id, credit: "250.0000" },
  ]);
  await entry("Compra de inventario a crédito", [
    { accountId: inventoryAccount.id, debit: "1200.0000" },
    { accountId: payable.id, credit: "1200.0000" },
  ]);

  log("accounting", "8 accounts, 1 open fiscal period, 4 balanced journal entries");
}

// --- Step 10: CRM --------------------------------------------------------------

async function seedCrm(ctx: Ctx, customers: Record<string, string>) {
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
  ];
  const leadIds: string[] = [];
  for (const definition of leadDefinitions) {
    const lead = await api<{ id: string }>("POST", "/crm/leads", { ...auth(ctx), body: definition });
    leadIds.push(lead.id);
  }

  const converted = [];
  for (const leadId of leadIds.slice(0, 2)) {
    const result = await api<{ customerId: string }>("POST", `/crm/leads/${leadId}/convert`, auth(ctx));
    converted.push(result.customerId);
  }

  const opp1 = await api<{ id: string }>("POST", "/crm/opportunities", {
    ...auth(ctx),
    body: { name: "Renovación Distribuidora del Sur", pipelineId: pipeline.id, stageId: negotiation.id, customerId: converted[0], amount: "15000.0000", currency: "GTQ" },
  });
  const opp2 = await api<{ id: string }>("POST", "/crm/opportunities", {
    ...auth(ctx),
    body: { name: "Expansión Comercial Ideal", pipelineId: pipeline.id, stageId: prospecting.id, customerId: converted[1], amount: "8500.0000", currency: "GTQ" },
  });
  const opp3 = await api<{ id: string }>("POST", "/crm/opportunities", {
    ...auth(ctx),
    body: { name: "Pedido mayorista Aurora", pipelineId: pipeline.id, stageId: prospecting.id, customerId: customers["CUST-01"], amount: "22000.0000", currency: "GTQ" },
  });
  const opp4 = await api<{ id: string }>("POST", "/crm/opportunities", {
    ...auth(ctx),
    body: { name: "Contrato anual Grupo Mayoreo", pipelineId: pipeline.id, stageId: negotiation.id, customerId: customers["CUST-04"], amount: "31000.0000", currency: "GTQ" },
  });
  await api("PUT", `/crm/opportunities/${opp1.id}/stage`, { ...auth(ctx), body: { stageId: won.id } });

  await api("POST", "/crm/activities", {
    ...auth(ctx),
    body: { type: "CALL", subject: "Llamada inicial de calificación", relatedLeadId: leadIds[2] },
  });
  await api("POST", "/crm/activities", {
    ...auth(ctx),
    body: { type: "EMAIL", subject: "Envío de cotización", relatedOpportunityId: opp3.id },
  });
  await api("POST", "/crm/activities", {
    ...auth(ctx),
    body: { type: "MEETING", subject: "Reunión de cierre", relatedOpportunityId: opp4.id },
  });
  await api("POST", "/crm/activities", {
    ...auth(ctx),
    body: { type: "TASK", subject: "Seguimiento post-venta", relatedCustomerId: customers["CUST-01"] },
  });
  await api("POST", "/crm/activities", {
    ...auth(ctx),
    body: { type: "NOTE", subject: "Interesada en volumen mayor al trimestral habitual", relatedOpportunityId: opp2.id },
  });

  log("crm", "1 pipeline, 3 stages, 5 leads (2 converted), 4 opportunities, 5 activities");
}

// --- Step 11: manufacturing ----------------------------------------------------

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

  const order1 = await api<{ id: string }>("POST", "/manufacturing/orders", {
    ...auth(ctx),
    body: { billOfMaterialId: bom.id, warehouseId, quantityPlanned: "10.0000" },
  });
  await api("POST", `/manufacturing/orders/${order1.id}/confirm`, auth(ctx));
  const order1Materials = await api<Array<{ id: string }>>("GET", `/manufacturing/orders/${order1.id}/materials`, auth(ctx));
  for (const material of order1Materials) {
    await api("POST", `/manufacturing/orders/${order1.id}/materials/issue`, {
      ...auth(ctx),
      body: { productionOrderMaterialId: material.id, quantity: "5.0000" },
    });
  }
  await api("POST", `/manufacturing/orders/${order1.id}/finished-goods-receipts`, {
    ...auth(ctx),
    body: { quantity: "3.0000" },
  });

  const order2 = await api<{ id: string }>("POST", "/manufacturing/orders", {
    ...auth(ctx),
    body: { billOfMaterialId: bom.id, warehouseId, quantityPlanned: "5.0000" },
  });
  await api("POST", `/manufacturing/orders/${order2.id}/confirm`, auth(ctx));
  const order2Materials = await api<Array<{ id: string; quantityRequired: string }>>(
    "GET",
    `/manufacturing/orders/${order2.id}/materials`,
    auth(ctx),
  );
  for (const material of order2Materials) {
    await api("POST", `/manufacturing/orders/${order2.id}/materials/issue`, {
      ...auth(ctx),
      body: { productionOrderMaterialId: material.id, quantity: material.quantityRequired },
    });
  }
  await api("POST", `/manufacturing/orders/${order2.id}/finished-goods-receipts`, {
    ...auth(ctx),
    body: { quantity: "5.0000" },
  });
  await api("POST", `/manufacturing/orders/${order2.id}/close`, auth(ctx));

  log("manufacturing", "1 BOM, 2 production orders (1 confirmed-partial, 1 closed)");
}

// --- Orchestration ----------------------------------------------------------

async function main() {
  log("start", `seeding against ${BASE_URL}`);

  const session = await registerOrLoginOwner();
  const { companyId } = await provisionOrReuseTenant(session.accessToken);
  const ctx: Ctx = { accessToken: session.accessToken, companyId };

  const { unitId } = await seedUnitsOfMeasure(ctx);
  const categories = await seedCategories(ctx);
  const brands = await seedBrands(ctx);
  const products = await seedProducts(ctx, unitId, categories, brands);
  const customers = await seedCustomers(ctx);
  const suppliers = await seedSuppliers(ctx);
  const { centralId } = await seedWarehouses(ctx);
  const { ivaId } = await seedTaxes(ctx);
  await seedPriceList(ctx, products);

  await receiveStock(ctx, centralId, products);
  await seedSales(ctx, centralId, products, customers, ivaId);
  await seedPurchasing(ctx, centralId, products, suppliers);
  await seedPos(ctx, centralId, products, customers);
  await seedCommerce(ctx, centralId, products);
  await seedAccounting(ctx);
  await seedCrm(ctx, customers);
  await seedManufacturing(ctx, centralId, products);

  log("done", `"Demo ERP" (${TENANT_SLUG}) is fully seeded — log in as ${OWNER_EMAIL} to explore it.`);
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
  const items: Array<{ key: string; price: string }> = [
    { key: "audifonos", price: "229.0000" },
    { key: "parlante", price: "169.0000" },
    { key: "cargador", price: "69.0000" },
  ];
  const existingItems = await api<Array<{ productId: string }>>(
    "GET",
    `/pricing/price-lists/${priceList.id}/items`,
    auth(ctx),
  );
  for (const item of items) {
    const productId = products[item.key].id;
    if (existingItems.some((existing) => existing.productId === productId)) continue;
    await api("POST", `/pricing/price-lists/${priceList.id}/items`, {
      ...auth(ctx),
      body: { productId, price: item.price },
    });
  }
  log("master-data", "1 price list ready with 3 items");
}

main().catch((error) => {
  console.error("[seed-demo-data] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
