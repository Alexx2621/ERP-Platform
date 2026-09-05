import { expect, test } from "@playwright/test";

test("registers receipts/issues, reserves and releases stock, and transfers between warehouses", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Inventario E2E ${runId}`;
  const tenantSlug = `inventario-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Inventario E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("InventoryE2E9!");
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
  await page.getByLabel("Código de organización").fill("INVORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Inventario E2E");
  await page.getByLabel("Código de empresa").fill("INVCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // --- A real product from Catalog ---
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
  await productDialog.getByLabel("Precio base").fill("15.0000");
  const createProductResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
  );
  await productDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createProductResponse).status()).toBe(201);
  await expect(page.getByRole("row", { name: /^WIDGET-01\s+Widget\b/ })).toBeVisible();

  // --- Two real warehouses from Comercial ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Comercial" }).click();
  await page.getByRole("tab", { name: "Bodegas" }).click();
  for (const [code, name] of [
    ["WH-01", "Bodega Central"],
    ["WH-02", "Bodega Norte"],
  ]) {
    await page.getByRole("button", { name: "Nueva bodega" }).click();
    const warehouseDialog = page.getByRole("dialog", { name: "Nueva bodega" });
    await warehouseDialog.getByLabel("Código").fill(code);
    await warehouseDialog.getByLabel("Nombre").fill(name);
    const createWarehouseResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/v1/warehouses") && response.request().method() === "POST",
    );
    await warehouseDialog.getByRole("button", { name: "Crear" }).click();
    expect((await createWarehouseResponse).status()).toBe(201);
    await expect(page.getByRole("row", { name: new RegExp(`^${code}\\s+${name}\\b`) })).toBeVisible();
  }

  // --- Inventory ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("heading", { name: "Inventario", exact: true })).toBeVisible();

  // Balances: empty, then a real receipt.
  await expect(page.getByText("Todavía no hay existencias registradas")).toBeVisible();
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  const receiptDialog = page.getByRole("dialog", { name: "Registrar movimiento" });
  await receiptDialog.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await receiptDialog.getByLabel("Producto").selectOption({ label: "Widget (WIDGET-01)" });
  await receiptDialog.getByLabel("Cantidad").fill("100.0000");
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/movements/receipt") && response.request().method() === "POST",
  );
  await receiptDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await receiptResponse).status()).toBe(201);
  const balanceRow = page.getByRole("row", { name: /Bodega Central/ });
  await expect(balanceRow).toBeVisible();
  await expect(balanceRow).toContainText("100.0000");

  // Real oversell rejection: issuing more than on-hand fails with a visible error.
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  const issueDialog = page.getByRole("dialog", { name: "Registrar movimiento" });
  await issueDialog.getByLabel("Tipo de movimiento").selectOption("ISSUE");
  await issueDialog.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await issueDialog.getByLabel("Producto").selectOption({ label: "Widget (WIDGET-01)" });
  await issueDialog.getByLabel("Cantidad").fill("999.0000");
  const oversellResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/movements/issue") && response.request().method() === "POST",
  );
  await issueDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await oversellResponse).status()).toBe(409);
  await expect(issueDialog.getByRole("alert")).toBeVisible();
  await issueDialog.getByRole("button", { name: "Cancelar" }).click();

  // Movements ledger shows the real RECEIPT row.
  await page.getByRole("tab", { name: "Movimientos" }).click();
  await expect(page.getByRole("row", { name: /Recepción/ })).toBeVisible();

  // Reservations: create one, confirm it reduces available stock, then release it.
  await page.getByRole("tab", { name: "Reservas" }).click();
  await expect(page.getByText("Todavía no hay reservas")).toBeVisible();
  await page.getByRole("button", { name: "Nueva reserva" }).click();
  const reservationDialog = page.getByRole("dialog", { name: "Nueva reserva" });
  await reservationDialog.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await reservationDialog.getByLabel("Producto").selectOption({ label: "Widget (WIDGET-01)" });
  await reservationDialog.getByLabel("Cantidad").fill("30.0000");
  const createReservationResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/reservations") && response.request().method() === "POST",
  );
  await reservationDialog.getByRole("button", { name: "Reservar" }).click();
  expect((await createReservationResponse).status()).toBe(201);
  const reservationRow = page.getByRole("row", { name: /Bodega Central/ });
  await expect(reservationRow).toBeVisible();
  await expect(reservationRow).toContainText("30.0000");
  await expect(reservationRow).toContainText("Activa");

  await page.getByRole("tab", { name: "Existencias" }).click();
  await expect(balanceRow).toContainText("70.0000"); // 100 on-hand - 30 reserved = 70 available

  await page.getByRole("tab", { name: "Reservas" }).click();
  const releaseResponse = page.waitForResponse(
    (response) => /\/api\/v1\/inventory\/reservations\/.+\/release$/.test(response.url()) && response.request().method() === "POST",
  );
  await reservationRow.getByRole("button", { name: "Liberar" }).click();
  expect((await releaseResponse).status()).toBe(201);
  await expect(reservationRow).toContainText("Liberada");

  await page.getByRole("tab", { name: "Existencias" }).click();
  await expect(balanceRow).toContainText("100.0000"); // available back to on-hand after release

  // Transfers: create IN_TRANSIT, complete it, confirm stock arrives at destination.
  await page.getByRole("tab", { name: "Transferencias" }).click();
  await expect(page.getByText("Todavía no hay transferencias")).toBeVisible();
  await page.getByRole("button", { name: "Nueva transferencia" }).click();
  const transferDialog = page.getByRole("dialog", { name: "Nueva transferencia" });
  await transferDialog.getByLabel("Bodega de origen").selectOption({ label: "Bodega Central (WH-01)" });
  await transferDialog.getByLabel("Bodega de destino").selectOption({ label: "Bodega Norte (WH-02)" });
  await transferDialog.getByLabel("Producto").selectOption({ label: "Widget (WIDGET-01)" });
  await transferDialog.getByLabel("Cantidad").fill("40.0000");
  const createTransferResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/transfers") && response.request().method() === "POST",
  );
  await transferDialog.getByRole("button", { name: "Crear transferencia" }).click();
  expect((await createTransferResponse).status()).toBe(201);
  const transferRow = page.getByRole("row", { name: /Widget/ });
  await expect(transferRow).toBeVisible();
  await expect(transferRow).toContainText("En tránsito");

  await page.getByRole("tab", { name: "Existencias" }).click();
  await expect(balanceRow).toContainText("60.0000"); // 100 - 40 in transit

  await page.getByRole("tab", { name: "Transferencias" }).click();
  const completeTransferResponse = page.waitForResponse(
    (response) => /\/api\/v1\/inventory\/transfers\/.+\/complete$/.test(response.url()) && response.request().method() === "POST",
  );
  await transferRow.getByRole("button", { name: "Completar" }).click();
  expect((await completeTransferResponse).status()).toBe(201);
  await expect(transferRow).toContainText("Completada");

  await page.getByRole("tab", { name: "Existencias" }).click();
  const destinationRow = page.getByRole("row", { name: /Bodega Norte/ });
  await expect(destinationRow).toBeVisible();
  await expect(destinationRow).toContainText("40.0000");
});
