import { expect, test } from "@playwright/test";

test("runs the full PurchaseOrder -> Confirm -> partial Receipt -> Return -> SupplierInvoice lifecycle against the real backend", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Compras E2E ${runId}`;
  const tenantSlug = `compras-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Compras E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("PurchasingE2E9!");
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
  await page.getByLabel("Nombre comercial").fill("Empresa Compras E2E");
  await page.getByLabel("Código de empresa").fill("COMCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // --- A real supplier from Contactos ---
  await page.getByRole("button", { name: "Contactos" }).click();
  await page.getByRole("tab", { name: "Proveedores" }).click();
  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const supplierDialog = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await supplierDialog.getByLabel("Código").fill("SUP-01");
  await supplierDialog.getByLabel("Nombre").fill("Suministros del Norte");
  const createSupplierResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/suppliers") && response.request().method() === "POST",
  );
  await supplierDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createSupplierResponse).status()).toBe(201);

  // --- A real tracked-inventory product from Catálogo ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Catálogo" }).click();
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
  await productDialog.getByLabel("Código").fill("BOLT-01");
  await productDialog.getByLabel("Nombre").fill("Tornillo");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Precio base").fill("1.0000");
  const createProductResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
  );
  await productDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createProductResponse).status()).toBe(201);

  // --- A real warehouse from Comercial ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Comercial" }).click();
  await page.getByRole("tab", { name: "Bodegas" }).click();
  await page.getByRole("button", { name: "Nueva bodega" }).click();
  const warehouseDialog = page.getByRole("dialog", { name: "Nueva bodega" });
  await warehouseDialog.getByLabel("Código").fill("WH-01");
  await warehouseDialog.getByLabel("Nombre").fill("Bodega Central");
  const createWarehouseResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/warehouses") && response.request().method() === "POST",
  );
  await warehouseDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createWarehouseResponse).status()).toBe(201);

  // --- Compras: PurchaseOrder ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Compras" }).click();
  await expect(page).toHaveURL(/\/purchasing$/);
  await expect(page.getByRole("heading", { name: "Compras", exact: true })).toBeVisible();

  await expect(page.getByText("Todavía no hay órdenes de compra", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nueva orden" }).click();
  const orderCreateDialog = page.getByRole("dialog", { name: "Nueva orden de compra" });
  await orderCreateDialog.getByLabel("Proveedor").selectOption({ label: "Suministros del Norte (SUP-01)" });
  const createOrderResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/purchasing/orders") && response.request().method() === "POST",
  );
  await orderCreateDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createOrderResponse).status()).toBe(201);

  await page.getByRole("button", { name: "Ver", exact: true }).click();
  const orderDetail = page.getByRole("dialog", { name: /^Orden de compra/ });
  await orderDetail.getByLabel("Producto").selectOption({ label: "Tornillo (BOLT-01)" });
  await orderDetail.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await orderDetail.getByLabel("Cantidad").fill("100.0000");
  await orderDetail.getByLabel(/Costo unitario/).fill("0.5000");
  const addLineResponse = page.waitForResponse(
    (response) => /\/api\/v1\/purchasing\/orders\/[^/]+\/lines$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Agregar línea" }).click();
  expect((await addLineResponse).status()).toBe(201);
  await expect(orderDetail.getByText("50.0000")).toBeVisible(); // 100 * 0.5 = 50.00, real Postgres decimal round-trip

  const confirmResponse = page.waitForResponse(
    (response) => /\/api\/v1\/purchasing\/orders\/[^/]+\/confirm$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: /Confirmar/ }).click();
  expect((await confirmResponse).status()).toBe(201);

  // --- Partial receipt: 60 of 100 ---
  await orderDetail.getByLabel("Línea de la orden").selectOption({ index: 1 });
  await orderDetail.getByLabel("Cantidad recibida").fill("60.0000");
  await orderDetail.getByRole("button", { name: "Agregar a la lista" }).click();
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/purchasing/receipts") && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Registrar recepción" }).click();
  expect((await receiptResponse).status()).toBe(201);

  await orderDetail.getByRole("button", { name: "Cerrar modal" }).click();
  await expect(orderDetail).not.toBeVisible();

  // Balance reflects the real ledger: 60 received so far.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  const balanceRow = page.getByRole("row", { name: /Bodega Central/ });
  await expect(balanceRow).toContainText("60.0000");

  // --- Return: a real ISSUE movement (goods going back to the supplier) reduces stock ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Compras" }).click();
  await page.getByRole("tab", { name: "Devoluciones" }).click();
  await page.getByRole("button", { name: "Nueva devolución" }).click();
  const returnDialog = page.getByRole("dialog", { name: "Nueva devolución" });
  const orderLinesForReturnResponse = page.waitForResponse(
    (response) => /\/api\/v1\/purchasing\/orders\/[^/]+\/lines$/.test(response.url()) && response.request().method() === "GET",
  );
  await returnDialog.getByLabel("Orden de compra").selectOption({ index: 1 });
  await orderLinesForReturnResponse;
  await returnDialog.getByLabel("Línea de la orden").selectOption({ index: 1 });
  await returnDialog.getByLabel("Cantidad a devolver").fill("5.0000");
  await returnDialog.getByRole("button", { name: "Agregar a la lista" }).click();
  const createReturnResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/purchasing/returns") && response.request().method() === "POST",
  );
  await returnDialog.getByRole("button", { name: "Registrar devolución" }).click();
  expect((await createReturnResponse).status()).toBe(201);

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await expect(balanceRow).toContainText("55.0000"); // 60 - 5 returned

  // --- Supplier invoice, recorded as its own document, then cancelled ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Compras" }).click();
  await page.getByRole("tab", { name: "Facturas de proveedor" }).click();
  await page.getByRole("button", { name: "Nueva factura" }).click();
  const invoiceDialog = page.getByRole("dialog", { name: "Nueva factura de proveedor" });
  await invoiceDialog.getByLabel("Proveedor", { exact: true }).selectOption({ label: "Suministros del Norte (SUP-01)" });
  await invoiceDialog.getByLabel("Orden de compra").selectOption({ index: 1 });
  await invoiceDialog.getByLabel("Número de factura del proveedor").fill("FAC-1001");
  await invoiceDialog.getByLabel("Monto").fill("50.0000");
  await invoiceDialog.getByLabel("Fecha de emisión").fill("2026-09-01");
  const createInvoiceResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/purchasing/supplier-invoices") && response.request().method() === "POST",
  );
  await invoiceDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await createInvoiceResponse).status()).toBe(201);

  await expect(page.getByText("Registrada", { exact: true })).toBeVisible();
  const cancelInvoiceResponse = page.waitForResponse(
    (response) => /\/api\/v1\/purchasing\/supplier-invoices\/[^/]+\/cancel$/.test(response.url()) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Cancelar" }).click();
  expect((await cancelInvoiceResponse).status()).toBe(201);
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
});
