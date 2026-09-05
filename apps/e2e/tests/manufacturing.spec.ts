import { expect, test } from "@playwright/test";

test("runs the full BillOfMaterial -> ProductionOrder -> Confirm -> partial Issue/Return -> partial FinishedGoods -> Close lifecycle against the real backend", async ({
  page,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Manufactura E2E ${runId}`;
  const tenantSlug = `manufactura-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Manufactura E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("ManufacturingE2E9!");
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
  await page.getByLabel("Código de organización").fill("MFGORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Manufactura E2E");
  await page.getByLabel("Código de empresa").fill("MFGCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // --- Two real, inventory-tracked products from Catálogo: a finished good and a component ---
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
  for (const [code, name] of [
    ["CHAIR-01", "Silla de madera"],
    ["WOOD-01", "Tabla de madera"],
  ]) {
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const productDialog = page.getByRole("dialog", { name: "Nuevo producto" });
    await productDialog.getByLabel("Código").fill(code);
    await productDialog.getByLabel("Nombre").fill(name);
    await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
    await productDialog.getByLabel("Precio base").fill("10.0000");
    const createProductResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
    );
    await productDialog.getByRole("button", { name: "Crear" }).click();
    expect((await createProductResponse).status()).toBe(201);
    await expect(page.getByRole("row", { name: new RegExp(`^${code}\\s+${name}\\b`) })).toBeVisible();
  }

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

  // --- Receive real component stock via Inventario before it can be issued to a production order ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  const receiptDialog = page.getByRole("dialog", { name: "Registrar movimiento" });
  await receiptDialog.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await receiptDialog.getByLabel("Producto").selectOption({ label: "Tabla de madera (WOOD-01)" });
  await receiptDialog.getByLabel("Cantidad").fill("50.0000");
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/movements/receipt") && response.request().method() === "POST",
  );
  await receiptDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await receiptResponse).status()).toBe(201);
  const woodBalanceRow = page.getByRole("row", { name: /Tabla de madera/ });
  await expect(woodBalanceRow).toContainText("50.0000");

  // --- Manufactura: a real Bill of Materials with one component ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Manufactura" }).click();
  await expect(page).toHaveURL(/\/manufacturing$/);
  await expect(page.getByRole("heading", { name: "Manufactura", exact: true })).toBeVisible();

  await expect(page.getByText("Todavía no hay listas de materiales", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nueva lista de materiales" }).click();
  const bomDialog = page.getByRole("dialog", { name: "Nueva lista de materiales" });
  await bomDialog.getByLabel("Código").fill("BOM-CHAIR");
  await bomDialog.getByLabel("Nombre").fill("Silla de madera");
  await bomDialog.getByLabel("Producto terminado").selectOption({ label: "Silla de madera (CHAIR-01)" });
  await bomDialog.getByLabel("Componente").selectOption({ label: "Tabla de madera (WOOD-01)" });
  await bomDialog.getByLabel("Cantidad por unidad").fill("2.0000");
  await bomDialog.getByRole("button", { name: "Agregar componente" }).click();
  await expect(bomDialog.getByRole("listitem").filter({ hasText: "Tabla de madera (WOOD-01)" })).toBeVisible();
  const createBomResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/manufacturing/bills-of-material") && response.request().method() === "POST",
  );
  await bomDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createBomResponse).status()).toBe(201);
  await expect(bomDialog).not.toBeVisible();
  await expect(page.getByRole("row", { name: /BOM-CHAIR/ })).toBeVisible();

  // --- A real production order: 10 planned units, requiring 20.0000 of the component (10 x 2.0000) ---
  await page.getByRole("tab", { name: "Órdenes de producción" }).click();
  await page.getByRole("button", { name: "Nueva orden" }).click();
  const orderDialog = page.getByRole("dialog", { name: "Nueva orden de producción" });
  await orderDialog.getByLabel("Lista de materiales").selectOption({ label: "Silla de madera (v1) — Silla de madera (CHAIR-01)" });
  await orderDialog.getByLabel("Bodega").selectOption({ label: "Bodega Central (WH-01)" });
  await orderDialog.getByLabel("Cantidad a producir").fill("10.0000");
  const createOrderResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/manufacturing/orders") && response.request().method() === "POST",
  );
  await orderDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createOrderResponse).status()).toBe(201);
  await expect(orderDialog).not.toBeVisible();
  await expect(page.getByRole("row", { name: /Silla de madera/ })).toContainText("Borrador");

  await page.getByRole("button", { name: "Ver", exact: true }).click();
  const orderDetail = page.getByRole("dialog", { name: /^Orden de producción/ });
  await expect(orderDetail.getByText("20.0000")).toBeVisible(); // material requirement snapshotted from the BOM: 10 x 2.0000

  const confirmResponse = page.waitForResponse(
    (response) => /\/api\/v1\/manufacturing\/orders\/[^/]+\/confirm$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Confirmar" }).click();
  expect((await confirmResponse).status()).toBe(201);

  // --- Genuinely partial material issue: 8.0000 of the 20.0000 required ---
  await orderDetail.getByLabel("Material").selectOption({ index: 1 });
  await orderDetail.getByLabel("Cantidad", { exact: true }).fill("8.0000");
  const issueResponse = page.waitForResponse(
    (response) => /\/api\/v1\/manufacturing\/orders\/[^/]+\/materials\/issue$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Emitir" }).click();
  expect((await issueResponse).status()).toBe(201);
  await expect(orderDetail.getByText("8.0000")).toBeVisible(); // quantityIssuedNet reflects the real Inventory movement

  // --- A real return of part of what was just issued: 2.0000 back ---
  await orderDetail.getByLabel("Material").selectOption({ index: 1 });
  await orderDetail.getByLabel("Cantidad", { exact: true }).fill("2.0000");
  const returnResponse = page.waitForResponse(
    (response) => /\/api\/v1\/manufacturing\/orders\/[^/]+\/materials\/return$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetail.getByRole("button", { name: "Devolver" }).click();
  expect((await returnResponse).status()).toBe(201);
  await expect(orderDetail.getByText("6.0000")).toBeVisible(); // net issued: 8 issued - 2 returned = 6.0000

  await orderDetail.getByRole("button", { name: "Cerrar modal" }).click();
  await expect(orderDetail).not.toBeVisible();

  // Component balance reflects the real ledger: 50 received - 8 issued + 2 returned = 44.0000 on hand.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await expect(woodBalanceRow).toContainText("44.0000");

  // --- Record a genuinely partial finished-goods receipt against the confirmed order ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Manufactura" }).click();
  await page.getByRole("tab", { name: "Órdenes de producción" }).click();
  await page.getByRole("button", { name: "Ver", exact: true }).click();
  const orderDetailAgain = page.getByRole("dialog", { name: /^Orden de producción/ });
  await orderDetailAgain.getByLabel("Cantidad recibida").fill("3.0000");
  const receiveFinishedGoodsResponse = page.waitForResponse(
    (response) => /\/api\/v1\/manufacturing\/orders\/[^/]+\/finished-goods-receipts$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetailAgain.getByRole("button", { name: "Registrar recepción" }).click();
  expect((await receiveFinishedGoodsResponse).status()).toBe(201);
  await expect(orderDetailAgain.getByText("3.0000 de 10.0000 unidades completadas.")).toBeVisible();

  // --- Close the order: partial completion (3 of 10) does not block closing, by design ---
  const closeResponse = page.waitForResponse(
    (response) => /\/api\/v1\/manufacturing\/orders\/[^/]+\/close$/.test(response.url()) && response.request().method() === "POST",
  );
  await orderDetailAgain.getByRole("button", { name: "Cerrar orden" }).click();
  expect((await closeResponse).status()).toBe(201);
  await expect(page.getByRole("dialog", { name: /^Orden de producción.*Cerrada$/ })).toBeVisible();
  await orderDetailAgain.getByRole("button", { name: "Cerrar modal" }).click();

  // Finished good balance reflects the real ledger: 3.0000 received at the production order's warehouse.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  const chairBalanceRow = page.getByRole("row", { name: /Silla de madera/ });
  await expect(chairBalanceRow).toContainText("3.0000");
});
