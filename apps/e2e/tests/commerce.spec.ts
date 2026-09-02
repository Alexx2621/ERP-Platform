import { expect, test } from "@playwright/test";

const API_BASE = "http://127.0.0.1:3000/api/v1";

test("publishes a real product to a real storefront in the ERP admin, then a real anonymous shopper completes checkout through the public Commerce API", async ({ page, request }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Commerce E2E ${runId}`;
  const tenantSlug = `commerce-e2e-${runId}`;
  const storefrontCode = `store-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Commerce E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("CommerceE2E9!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/register"));
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("CMORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Commerce E2E");
  await page.getByLabel("Código de empresa").fill("CMCO");
  const provisioningResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/tenants"));
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // --- A real sellable product from Catálogo ---
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
  await productDialog.getByLabel("Código").fill("CUP-01");
  await productDialog.getByLabel("Nombre").fill("Taza en línea");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Precio base").fill("15.0000");
  const createProductResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
  );
  await productDialog.getByRole("button", { name: "Crear" }).click();
  const productBody = (await (await createProductResponse).json()) as { id: string };
  expect(productBody.id).toBeTruthy();

  // --- A real warehouse + real stock, so checkout can actually confirm the SalesOrder it creates ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Comercial" }).click();
  await page.getByRole("tab", { name: "Bodegas" }).click();
  await page.getByRole("button", { name: "Nueva bodega" }).click();
  const warehouseDialog = page.getByRole("dialog", { name: "Nueva bodega" });
  await warehouseDialog.getByLabel("Código").fill("WH-01");
  await warehouseDialog.getByLabel("Nombre").fill("Bodega en línea");
  const createWarehouseResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/warehouses") && response.request().method() === "POST",
  );
  await warehouseDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createWarehouseResponse).status()).toBe(201);

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  const receiptDialog = page.getByRole("dialog", { name: "Registrar movimiento" });
  await receiptDialog.getByLabel("Bodega").selectOption({ label: "Bodega en línea (WH-01)" });
  await receiptDialog.getByLabel("Producto").selectOption({ label: "Taza en línea (CUP-01)" });
  await receiptDialog.getByLabel("Cantidad").fill("10.0000");
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/inventory/movements/receipt") && response.request().method() === "POST",
  );
  await receiptDialog.getByRole("button", { name: "Registrar" }).click();
  expect((await receiptResponse).status()).toBe(201);

  // --- Comercio: create a real storefront with that warehouse as the default, then publish the product ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Comercio" }).click();
  await expect(page).toHaveURL(/\/commerce$/);
  await expect(page.getByRole("heading", { name: "Comercio", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Nueva tienda" }).click();
  const storefrontDialog = page.getByRole("dialog", { name: "Nueva tienda" });
  await storefrontDialog.getByLabel(/Handle público/).fill(storefrontCode);
  await storefrontDialog.getByLabel("Nombre").fill("Tienda E2E");
  await storefrontDialog.getByLabel("Bodega por defecto (opcional)").selectOption({ label: "Bodega en línea (WH-01)" });
  const createStorefrontResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/commerce/storefronts") && response.request().method() === "POST",
  );
  await storefrontDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createStorefrontResponse).status()).toBe(201);

  await page.getByRole("button", { name: "Catálogo" }).click();
  const catalogDialog = page.getByRole("dialog", { name: /Catálogo publicado/ });
  await catalogDialog.getByLabel("Producto").selectOption({ label: "Taza en línea (CUP-01)" });
  const publishResponse = page.waitForResponse(
    (response) => /\/api\/v1\/commerce\/storefronts\/[^/]+\/products$/.test(response.url()) && response.request().method() === "POST",
  );
  await catalogDialog.getByRole("button", { name: "Publicar" }).click();
  expect((await publishResponse).status()).toBe(201);
  // Scoped to the table row, not a bare getByText — the same product name
  // also appears (hidden) inside the <select>'s own <option>, which a plain
  // getByText would match first (same collision family already documented
  // in this project's other E2E specs, e.g. Purchasing/Sales).
  await expect(catalogDialog.getByRole("row", { name: /Taza en línea \(CUP-01\)/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // --- A real anonymous shopper, through the same public, unauthenticated Commerce API the Next.js storefront calls — no session, no tenant headers at all ---
  const publicProducts = await request.get(`${API_BASE}/storefront/${storefrontCode}/products`);
  expect(publicProducts.ok()).toBe(true);
  const products = (await publicProducts.json()) as Array<{ productId: string; code: string; basePrice: string | null }>;
  const published = products.find((p) => p.code === "CUP-01");
  expect(published?.basePrice).toBe("15.0000");

  const createCartResponse = await request.post(`${API_BASE}/storefront/${storefrontCode}/carts`, { data: {} });
  expect(createCartResponse.status()).toBe(201);
  const cart = (await createCartResponse.json()) as { id: string; currency: string };
  expect(cart.currency).toBe("USD");

  const addLineResponse = await request.post(`${API_BASE}/storefront/${storefrontCode}/carts/${cart.id}/lines`, {
    data: { productId: published!.productId, quantity: "2.0000" },
  });
  expect(addLineResponse.status()).toBe(201);
  const cartWithLine = (await addLineResponse.json()) as { subtotal: string; lines: Array<{ unitPrice: string }> };
  expect(cartWithLine.lines[0]?.unitPrice).toBe("15.0000");
  expect(cartWithLine.subtotal).toBe("30.0000"); // 2 * 15.0000, a real Postgres decimal round-trip through the public API

  // No accessToken, no X-Tenant-Slug, no X-Company-Id anywhere in this checkout call — the storefront resolves everything from its own code.
  const checkoutResponse = await request.post(`${API_BASE}/storefront/${storefrontCode}/checkout`, {
    data: { cartId: cart.id, guestName: "Comprador Anónimo", guestEmail: `shopper-${runId}@example.com` },
  });
  expect(checkoutResponse.status()).toBe(201);
  const order = (await checkoutResponse.json()) as { id: string; total: string; paymentId: string | null };
  expect(order.total).toBe("30.0000");
  expect(order.paymentId).toBeNull(); // no paymentReference was given — real order placed unpaid, awaiting staff confirmation

  // Retrying the exact same cart's checkout (e.g. a lost-response retry) converges on the same real order, never a duplicate.
  const retryResponse = await request.post(`${API_BASE}/storefront/${storefrontCode}/checkout`, {
    data: { cartId: cart.id, guestName: "Comprador Anónimo", guestEmail: `shopper-${runId}@example.com` },
  });
  expect(retryResponse.status()).toBe(201);
  const retryOrder = (await retryResponse.json()) as { id: string };
  expect(retryOrder.id).toBe(order.id);

  const orderConfirmation = await request.get(`${API_BASE}/storefront/${storefrontCode}/orders/${order.id}`);
  expect(orderConfirmation.ok()).toBe(true);

  // --- Back in the ERP admin: the real checkout shows up as a real, unpaid order ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Comercio" }).click();
  await page.getByRole("tab", { name: "Pedidos" }).click();
  await expect(page.getByText(`shopper-${runId}@example.com`)).toBeVisible();
  // exact: true — the panel's own description paragraph contains the plain
  // word "pendiente" too ("...el pago (si sigue pendiente)..."), which a
  // non-exact getByText would also match (same collision family already
  // documented in this project's other E2E specs).
  await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();

  // --- Real inventory was actually reserved by the real SalesOrder the checkout created: 10 - 2 = 8 available ---
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Inventario" }).click();
  const balanceRow = page.getByRole("row", { name: /Bodega en línea/ });
  await expect(balanceRow).toContainText("10.0000"); // on-hand unchanged — never fulfilled/issued by checkout itself
  await expect(balanceRow).toContainText("2.0000"); // reserved
});
