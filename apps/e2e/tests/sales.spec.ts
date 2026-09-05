import { expect, test } from "@playwright/test";

test("runs the full Quote -> SalesOrder -> Confirm -> Fulfill -> Payment -> Return lifecycle against the real backend", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Ventas E2E ${runId}`;
  const tenantSlug = `ventas-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Ventas E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("SalesE2E9!");
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
  await page.getByLabel("Código de organización").fill("VENORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Ventas E2E");
  await page.getByLabel("Código de empresa").fill("VENCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // --- A real customer from Contactos ---
  await page.getByRole("button", { name: "Contactos" }).click();
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const customerDialog = page.getByRole("dialog", { name: "Nuevo cliente" });
  await customerDialog.getByLabel("Código").fill("CUST-01");
  await customerDialog.getByLabel("Nombre").fill("Distribuidora Aurora");
  const createCustomerResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/customers") && response.request().method() === "POST",
  );
  await customerDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createCustomerResponse).status()).toBe(201);

  // --- A real tracked-inventory product from Catálogo ---
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
  await productDialog.getByLabel("Código").fill("WIDGET-01");
  await productDialog.getByLabel("Nombre").fill("Widget");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Precio base").fill("25.0000");
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

  // --- Real stock via Inventario ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  const receiptDialog = page.getByRole("dialog", { name: "Registrar movimiento" });
  await receiptDialog.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await receiptDialog.getByLabel("Producto").selectOption({ label: "Widget (WIDGET-01)" });
  await receiptDialog.getByLabel("Cantidad").fill("50.0000");
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/movements/receipt") && response.request().method() === "POST",
  );
  await receiptDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await receiptResponse).status()).toBe(201);

  // --- Ventas: Quote -> SalesOrder ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  // exact: true — the home dashboard's own "Ventas POS de hoy" widget button
  // would otherwise substring-match "Ventas" too (Playwright's default name
  // matching is substring-based).
  await page.getByRole("button", { name: "Ventas", exact: true }).click();
  await expect(page).toHaveURL(/\/sales$/);
  await expect(page.getByRole("heading", { name: "Ventas", exact: true })).toBeVisible();

  await expect(page.getByText("Todavía no hay cotizaciones")).toBeVisible();
  await page.getByRole("button", { name: "Nueva cotización" }).click();
  const quoteDialog = page.getByRole("dialog", { name: "Nueva cotización" });
  await quoteDialog.getByLabel("Cliente").selectOption({ label: "Distribuidora Aurora (CUST-01)" });
  const createQuoteResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/sales/quotes") && response.request().method() === "POST",
  );
  await quoteDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createQuoteResponse).status()).toBe(201);

  await page.getByRole("button", { name: "Ver", exact: true }).click();
  const quoteDetail = page.getByRole("dialog", { name: /^Cotización/ });
  await quoteDetail.getByLabel("Producto").selectOption({ label: "Widget (WIDGET-01)" });
  await quoteDetail.getByLabel("Cantidad").fill("4.0000");
  const addQuoteLineResponse = page.waitForResponse(
    (response) => /\/api\/v1\/sales\/quotes\/[^/]+\/lines$/.test(response.url()) && response.request().method() === "POST",
  );
  await quoteDetail.getByRole("button", { name: "Agregar línea" }).click();
  expect((await addQuoteLineResponse).status()).toBe(201);
  await expect(quoteDetail.getByText("100.0000")).toBeVisible(); // 4 * 25.00 = 100.00, real Postgres decimal round-trip

  await quoteDetail.getByLabel("Bodega para líneas con inventario").selectOption({ label: "Bodega Central (WH-01)" });
  const convertResponse = page.waitForResponse(
    (response) => /\/api\/v1\/sales\/quotes\/[^/]+\/convert$/.test(response.url()) && response.request().method() === "POST",
  );
  await quoteDetail.getByRole("button", { name: /Convertir a pedido/ }).click();
  expect((await convertResponse).status()).toBe(201);

  // Converting switches to the "Pedidos" tab and opens the new order's detail automatically.
  const orderDetail = page.getByRole("dialog", { name: /^Pedido/ });
  await expect(orderDetail).toBeVisible();
  await expect(orderDetail.getByText("100.0000")).toBeVisible();

  const confirmResponse = page.waitForResponse(
    (response) => /\/api\/v1\/sales\/orders\/[^/]+\/confirm$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: /Confirmar/ }).click();
  expect((await confirmResponse).status()).toBe(201);
  await expect(orderDetail.getByText("Reservada")).toBeVisible();

  // --- Payment: capture CASH ---
  await orderDetail.getByLabel(/Monto/).fill("100.0000");
  const captureResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/payments/capture") && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Cobrar" }).click();
  expect((await captureResponse).status()).toBe(201);
  await expect(orderDetail.getByText("Cobrado")).toBeVisible();

  // --- Fulfill ---
  const fulfillResponse = page.waitForResponse(
    (response) => /\/api\/v1\/sales\/orders\/[^/]+\/fulfill$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Despachar" }).click();
  expect((await fulfillResponse).status()).toBe(201);

  await orderDetail.getByRole("button", { name: "Cerrar modal" }).click();
  await expect(orderDetail).not.toBeVisible();

  // Balance reflects the real ledger: 50 received - 4 issued = 46 on hand.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  const balanceRow = page.getByRole("row", { name: /Bodega Central/ });
  await expect(balanceRow).toContainText("46.0000");

  // --- Return: a real RETURN movement restores stock ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  // exact: true — the home dashboard's own "Ventas POS de hoy" widget button
  // would otherwise substring-match "Ventas" too (Playwright's default name
  // matching is substring-based).
  await page.getByRole("button", { name: "Ventas", exact: true }).click();
  await page.getByRole("tab", { name: "Devoluciones" }).click();
  const fulfilledOrdersResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/sales/orders?") && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Nueva devolución" }).click();
  await fulfilledOrdersResponse;
  const returnDialog = page.getByRole("dialog", { name: "Nueva devolución" });
  const orderLinesForReturnResponse = page.waitForResponse(
    (response) => /\/api\/v1\/sales\/orders\/[^/]+\/lines$/.test(response.url()) && response.request().method() === "GET",
  );
  await returnDialog.getByLabel("Pedido despachado").selectOption({ index: 1 });
  await orderLinesForReturnResponse;
  await returnDialog.getByLabel("Línea del pedido").selectOption({ index: 1 });
  await returnDialog.getByLabel("Cantidad a devolver").fill("1.0000");
  await returnDialog.getByRole("button", { name: "Agregar a la lista" }).click();
  const createReturnResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/sales/returns") && response.request().method() === "POST",
  );
  await returnDialog.getByRole("button", { name: "Registrar devolución" }).click();
  expect((await createReturnResponse).status()).toBe(201);

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await expect(balanceRow).toContainText("47.0000"); // 46 + 1 returned
});
