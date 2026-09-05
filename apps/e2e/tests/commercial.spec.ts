import { expect, test } from "@playwright/test";

test("manages taxes, warehouses, and price lists with items", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Comercial E2E ${runId}`;
  const tenantSlug = `comercial-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Comercial E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("CommercialE2E9!");
  const registrationResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/register"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("COMORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Comercial E2E");
  await page.getByLabel("Código de empresa").fill("COMCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "Comercial" }).click();
  await expect(page).toHaveURL(/\/commercial$/);
  await expect(page.getByRole("heading", { name: "Comercial", exact: true })).toBeVisible();

  // --- Taxes ---
  await expect(page.getByText("Todavía no hay impuestos")).toBeVisible();
  await page.getByRole("button", { name: "Nuevo impuesto" }).click();
  const taxDialog = page.getByRole("dialog", { name: "Nuevo impuesto" });
  await taxDialog.getByLabel("Código").fill("IVA");
  await taxDialog.getByLabel("Nombre").fill("IVA");
  await taxDialog.getByLabel("Tasa (%)", { exact: false }).fill("12.0000");
  const createTaxResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/taxes") && response.request().method() === "POST",
  );
  await taxDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createTaxResponse).status()).toBe(201);
  const taxRow = page.getByRole("row", { name: /^IVA\s+IVA\b/ });
  await expect(taxRow).toBeVisible();
  await expect(taxRow).toContainText("12.0000%");
  await expect(taxRow).toContainText("Activo");

  const deactivateTaxResponse = page.waitForResponse(
    (response) => /\/api\/v1\/taxes\/.+\/status$/.test(response.url()) && response.request().method() === "PUT",
  );
  await taxRow.getByRole("button", { name: "Desactivar" }).click();
  expect((await deactivateTaxResponse).status()).toBe(200);
  await expect(taxRow).toContainText("Inactivo");

  // --- Warehouses ---
  await page.getByRole("tab", { name: "Bodegas" }).click();
  await page.getByRole("button", { name: "Nueva bodega" }).click();
  const warehouseDialog = page.getByRole("dialog", { name: "Nueva bodega" });
  await warehouseDialog.getByLabel("Código").fill("WH-01");
  await warehouseDialog.getByLabel("Nombre").fill("Bodega Central");
  await warehouseDialog.getByLabel("Ciudad").fill("Ciudad de Guatemala");
  const createWarehouseResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/warehouses") && response.request().method() === "POST",
  );
  await warehouseDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createWarehouseResponse).status()).toBe(201);
  const warehouseRow = page.getByRole("row", { name: /^WH-01\s+Bodega Central\b/ });
  await expect(warehouseRow).toBeVisible();
  await expect(warehouseRow).toContainText("Ciudad de Guatemala");

  // --- Pricing: needs a real product from Catalog first ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  // exact: true — the home dashboard's own "Productos activos" widget caption
  // ("N en el catálogo") would otherwise substring-match "Catálogo" too.
  await page.getByRole("button", { name: "Catálogo", exact: true }).click();
  await page.getByRole("tab", { name: "Unidades" }).click();
  await page.getByRole("button", { name: "Nueva unidad de medida" }).click();
  const uomDialog = page.getByRole("dialog", { name: "Nueva unidad de medida" });
  await uomDialog.getByLabel("Código").fill("UN");
  await uomDialog.getByLabel("Nombre").fill("Unidad");
  await uomDialog.getByLabel("Símbolo").fill("u");
  await uomDialog.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByRole("row", { name: /^UN\s+Unidad\b/ })).toBeVisible();

  await page.getByRole("tab", { name: "Productos" }).click();
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  const productDialog = page.getByRole("dialog", { name: "Nuevo producto" });
  await productDialog.getByLabel("Código").fill("MUG-01");
  await productDialog.getByLabel("Nombre").fill("Taza de cerámica");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Precio base").fill("9.9900");
  const createProductResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
  );
  await productDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createProductResponse).status()).toBe(201);
  await expect(page.getByRole("row", { name: /^MUG-01\s+Taza de cerámica\b/ })).toBeVisible();

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Comercial" }).click();
  await page.getByRole("tab", { name: "Precios" }).click();
  await expect(page.getByText("Todavía no hay listas de precios")).toBeVisible();

  await page.getByRole("button", { name: "Nueva lista de precios" }).click();
  const priceListDialog = page.getByRole("dialog", { name: "Nueva lista de precios" });
  await priceListDialog.getByLabel("Código").fill("WHOLESALE");
  await priceListDialog.getByLabel("Nombre").fill("Mayoreo");
  await priceListDialog.getByLabel("Moneda (ISO 4217)").fill("USD");
  const createPriceListResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/pricing/price-lists") && response.request().method() === "POST",
  );
  await priceListDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createPriceListResponse).status()).toBe(201);
  const priceListRow = page.getByRole("row", { name: /^WHOLESALE\s+Mayoreo\b/ });
  await expect(priceListRow).toBeVisible();
  await expect(priceListRow).toContainText("USD");

  await priceListRow.getByRole("button", { name: "Precios" }).click();
  const itemsDialog = page.getByRole("dialog", { name: "Precios de Mayoreo" });
  await expect(itemsDialog.getByText("Todavía no hay productos en esta lista")).toBeVisible();
  await itemsDialog.getByLabel("Producto").selectOption({ label: "Taza de cerámica (MUG-01)" });
  await itemsDialog.getByLabel("Precio").fill("7.9900");
  const addItemResponse = page.waitForResponse(
    (response) => /\/api\/v1\/pricing\/price-lists\/.+\/items$/.test(response.url()) && response.request().method() === "POST",
  );
  await itemsDialog.getByRole("button", { name: "Agregar" }).click();
  expect((await addItemResponse).status()).toBe(201);
  const itemRow = itemsDialog.getByRole("row", { name: /Taza de cerámica/ });
  await expect(itemRow).toBeVisible();
  await expect(itemRow).toContainText("7.9900");

  const removeItemResponse = page.waitForResponse(
    (response) => /\/api\/v1\/pricing\/price-lists\/.+\/items\/.+$/.test(response.url()) && response.request().method() === "DELETE",
  );
  await itemRow.getByRole("button", { name: "Quitar" }).click();
  expect((await removeItemResponse).status()).toBe(204);
  await expect(itemsDialog.getByText("Todavía no hay productos en esta lista")).toBeVisible();
});
