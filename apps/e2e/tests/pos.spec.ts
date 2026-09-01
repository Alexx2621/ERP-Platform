import { expect, test } from "@playwright/test";

test("runs the full Register -> Shift -> RingUpSale -> Return -> CloseShift lifecycle against the real backend", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `POS E2E ${runId}`;
  const tenantSlug = `pos-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria POS E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("PosE2E9!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/register"));
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("POSORG");
  await page.getByLabel("Nombre comercial").fill("Empresa POS E2E");
  await page.getByLabel("Código de empresa").fill("POSCO");
  const provisioningResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/tenants"));
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // --- A real customer from Contactos ---
  await page.getByRole("button", { name: "Contactos" }).click();
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const customerDialog = page.getByRole("dialog", { name: "Nuevo cliente" });
  await customerDialog.getByLabel("Código").fill("CUST-01");
  await customerDialog.getByLabel("Nombre").fill("Cliente de mostrador");
  const createCustomerResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/customers") && response.request().method() === "POST",
  );
  await customerDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createCustomerResponse).status()).toBe(201);

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
  await productDialog.getByLabel("Código").fill("MUG-01");
  await productDialog.getByLabel("Nombre").fill("Taza");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Precio base").fill("10.0000");
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
  await warehouseDialog.getByLabel("Nombre").fill("Bodega Mostrador");
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
  await receiptDialog.getByLabel("Bodega").selectOption({ label: "Bodega Mostrador (WH-01)" });
  await receiptDialog.getByLabel("Producto").selectOption({ label: "Taza (MUG-01)" });
  await receiptDialog.getByLabel("Cantidad").fill("20.0000");
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/movements/receipt") && response.request().method() === "POST",
  );
  await receiptDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await receiptResponse).status()).toBe(201);
  const balanceRow = page.getByRole("row", { name: /Bodega Mostrador/ });
  await expect(balanceRow).toContainText("20.0000");

  // --- Punto de venta: create a register on Cajas ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Punto de venta" }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await expect(page.getByRole("heading", { name: "Punto de venta", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Cajas" }).click();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  const registerDialog = page.getByRole("dialog", { name: "Nueva caja" });
  await registerDialog.getByLabel("Bodega").selectOption({ label: "Bodega Mostrador (WH-01)" });
  await registerDialog.getByLabel("Código").fill("REG-01");
  await registerDialog.getByLabel("Nombre").fill("Caja principal");
  const createRegisterResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/pos/registers") && response.request().method() === "POST",
  );
  await registerDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createRegisterResponse).status()).toBe(201);

  // --- Vender: open a shift (the single ACTIVE register auto-selects) ---
  await page.getByRole("tab", { name: "Vender" }).click();
  await page.getByLabel("Fondo de caja inicial").fill("50.0000");
  const openShiftResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/pos/shifts") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Abrir turno" }).click();
  expect((await openShiftResponse).status()).toBe(201);

  // --- Ring up a real CASH sale, with change due ---
  await page.getByLabel("Producto", { exact: true }).selectOption({ label: "Taza (MUG-01)" });
  await page.getByLabel("Cantidad", { exact: true }).fill("3.0000");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByText("Taza (MUG-01) · 3.0000")).toBeVisible();

  await page.getByLabel("Cliente").selectOption({ label: "Cliente de mostrador (CUST-01)" });
  await page.getByLabel("Efectivo recibido (opcional)").fill("50.0000");
  const ringUpResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/pos/sales") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Cobrar y facturar" }).click();
  expect((await ringUpResponse).status()).toBe(201);

  await expect(page.getByText(/Total 30\.0000/)).toBeVisible(); // 3 * 10.00, real Postgres decimal round-trip
  await expect(page.getByText(/Cambio a entregar: 20\.0000/)).toBeVisible();

  // Real stock left the warehouse: 20 - 3 = 17.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await expect(balanceRow).toContainText("17.0000");

  // --- Devolver the sale from Ventas, with a full refund ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Punto de venta" }).click();
  await page.getByRole("tab", { name: "Ventas" }).click();
  await page.getByRole("button", { name: "Devolver" }).click();
  const returnDialog = page.getByRole("dialog", { name: "Devolver venta" });
  const orderLinesResponse = page.waitForResponse(
    (response) => /\/api\/v1\/sales\/orders\/[^/]+\/lines$/.test(response.url()) && response.request().method() === "GET",
  );
  await orderLinesResponse;
  await returnDialog.getByLabel("Línea vendida").selectOption({ index: 1 });
  await returnDialog.getByLabel("Cantidad a devolver").fill("1.0000");
  await returnDialog.getByRole("button", { name: "Agregar a la lista" }).click();
  const createReturnResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/pos/returns") && response.request().method() === "POST",
  );
  await returnDialog.getByRole("button", { name: "Registrar devolución" }).click();
  expect((await createReturnResponse).status()).toBe(201);
  await expect(returnDialog).not.toBeVisible();

  // Real stock came back: 17 + 1 = 18.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await expect(balanceRow).toContainText("18.0000");

  // --- Close the shift: expected cash computed from the shift's own real ledger ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Punto de venta" }).click();
  await page.getByRole("tab", { name: "Vender" }).click();
  await page.getByRole("button", { name: "Cerrar turno" }).click();
  const closeDialog = page.getByRole("dialog", { name: "Cerrar turno" });
  // Opening 50 + CASH sale 30 - CASH refund 30 (full refund of the original payment) = 50 expected.
  await closeDialog.getByLabel("Efectivo contado").fill("50.0000");
  const closeShiftResponse = page.waitForResponse(
    (response) => /\/api\/v1\/pos\/shifts\/[^/]+\/close$/.test(response.url()) && response.request().method() === "POST",
  );
  await closeDialog.getByRole("button", { name: "Cerrar turno" }).click();
  expect((await closeShiftResponse).status()).toBe(201);

  await expect(page.getByText(/Contado 50\.0000 · Esperado 50\.0000 · Diferencia 0\.0000/)).toBeVisible();
});
