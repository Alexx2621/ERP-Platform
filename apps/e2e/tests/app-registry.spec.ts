import { expect, test } from "@playwright/test";

/**
 * docs/DECISIONS.md ADR-015: the app catalog now holds the 15 real
 * business modules (`FOUNDATION_APPS`), a new tenant auto-enables all of
 * them at provisioning (preserving the platform's pre-ADR-015 behavior),
 * and — for the first time — disabling one for real blocks its own
 * controllers' routes via `AppEnablementGuard`, not just the "Apps" screen
 * itself. This test proves that end-to-end against the real backend: every
 * app starts enabled, disabling one with active dependents is rejected by
 * the real dependency graph, and disabling "sales" for real makes the
 * "Ventas" screen itself fail with a real 403 — re-enabling it restores it.
 */
test("every catalog app starts enabled for a new tenant, and disabling one for real blocks its own module", async ({
  page,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Apps E2E ${runId}`;
  const tenantSlug = `apps-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Apps E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("AppsRegistryE2E9!");
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
  await page.getByLabel("Código de organización").fill("APPSORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Apps E2E");
  await page.getByLabel("Código de empresa").fill("APPSCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // A real customer — Ventas' own screen shows a page-level "no customers"
  // notice before ever mounting its Cotizaciones/Pedidos/Devoluciones tabs
  // (and therefore before ever calling /sales/quotes at all), so this is
  // required for the later real-403 check to have a request to observe.
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

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Apps" }).click();
  await expect(page).toHaveURL(/\/apps$/);
  await expect(page.getByRole("heading", { name: "Apps", exact: true })).toBeVisible();

  // Real provisioning auto-enabled all 15 real business modules — no manual
  // enablement needed before this test even starts.
  const salesRow = page.getByRole("row", { name: /^Ventas\s+sales\b/ });
  const paymentsRow = page.getByRole("row", { name: /^Pagos\s+payments\b/ });
  const posRow = page.getByRole("row", { name: /^Punto de venta\s+pos\b/ });
  const commerceRow = page.getByRole("row", { name: /^Comercio\s+commerce\b/ });
  for (const row of [salesRow, paymentsRow, posRow, commerceRow]) {
    await expect(row).toContainText("Habilitada");
  }

  // Disabling "sales" while payments/pos/commerce still depend on it (and are
  // still enabled) is rejected by the real dependents check.
  const rejectedDisableResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/sales/disable") && response.request().method() === "POST",
  );
  await salesRow.getByRole("button", { name: "Deshabilitar Ventas" }).click();
  expect((await rejectedDisableResponse).status()).toBe(409);
  await expect(salesRow).toContainText("Habilitada");

  // Disable sales' real dependents first, in the order their own dependents allow.
  for (const [row, key, label] of [
    [commerceRow, "commerce", "Comercio"],
    [posRow, "pos", "Punto de venta"],
    [paymentsRow, "payments", "Pagos"],
  ] as const) {
    const disableResponse = page.waitForResponse(
      (response) => response.url().endsWith(`/api/v1/apps/${key}/disable`) && response.request().method() === "POST",
    );
    await row.getByRole("button", { name: `Deshabilitar ${label}` }).click();
    expect((await disableResponse).status()).toBe(201);
    await expect(row).toContainText("Deshabilitada");
  }

  // Now disabling "sales" itself succeeds for real.
  const disableSalesResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/sales/disable") && response.request().method() === "POST",
  );
  await salesRow.getByRole("button", { name: "Deshabilitar Ventas" }).click();
  expect((await disableSalesResponse).status()).toBe(201);
  await expect(salesRow).toContainText("Deshabilitada");

  // The real proof of ADR-015: Ventas' own screen now fails with a real 403
  // from AppEnablementGuard, not just the Apps screen showing it disabled.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  const blockedQuotesResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/sales/quotes") && response.request().method() === "GET",
  );
  // exact: true — the home dashboard's own "Ventas POS de hoy" widget button
  // would otherwise substring-match "Ventas" too (Playwright's default name
  // matching is substring-based).
  await page.getByRole("button", { name: "Ventas", exact: true }).click();
  expect((await blockedQuotesResponse).status()).toBe(403);
  await expect(page.getByText('App "sales" is not enabled for this tenant.').first()).toBeVisible();

  // Enabling a dependent (payments) before its own dependency (sales, still
  // disabled) is rejected by the real dependency check.
  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await page.getByRole("button", { name: "Apps" }).click();
  const rejectedEnableResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/payments/enable") && response.request().method() === "POST",
  );
  await paymentsRow.getByRole("button", { name: "Habilitar Pagos" }).click();
  expect((await rejectedEnableResponse).status()).toBe(409);
  await expect(paymentsRow).toContainText("Deshabilitada");

  // Re-enabling sales restores the real module immediately.
  const enableSalesResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/sales/enable") && response.request().method() === "POST",
  );
  await salesRow.getByRole("button", { name: "Habilitar Ventas" }).click();
  expect((await enableSalesResponse).status()).toBe(201);
  await expect(salesRow).toContainText("Habilitada");

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  const restoredQuotesResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/sales/quotes") && response.request().method() === "GET",
  );
  // exact: true — the home dashboard's own "Ventas POS de hoy" widget button
  // would otherwise substring-match "Ventas" too (Playwright's default name
  // matching is substring-based).
  await page.getByRole("button", { name: "Ventas", exact: true }).click();
  expect((await restoredQuotesResponse).status()).toBe(200);
  await expect(page.getByText("Todavía no hay cotizaciones", { exact: false })).toBeVisible();
});
