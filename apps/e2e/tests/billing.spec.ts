import { expect, test } from "@playwright/test";

/**
 * Regresses a real bug: NestJS sends a plain 200 with a genuinely empty
 * body for `BillingController.getSubscription()` when a tenant has never
 * subscribed — not the JSON text "null" — and the frontend SDK's
 * `request()` used to call `response.json()` on that unconditionally,
 * throwing an uncaught `SyntaxError` the UI could not map to a friendly
 * message. A freshly provisioned tenant (this test's own tenant) has no
 * subscription row by construction, so it exercises the exact real-world
 * scenario a user hit.
 */
test("shows the honest no-subscription state on Facturación for a freshly provisioned tenant, with no unexpected-error banner", async ({
  page,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Facturación E2E ${runId}`;
  const tenantSlug = `facturacion-e2e-${runId}`;

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Facturación E2E");
  await page.getByLabel("Correo electrónico").fill(`billing-owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("PlatformE2E9!");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("BILLE2E");
  await page.getByLabel("Nombre comercial").fill("Empresa Facturación E2E");
  await page.getByLabel("Código de empresa").fill("BILLCO");

  await page.getByRole("button", { name: "Crear espacio" }).click();
  await expect(page).toHaveURL(/\/workspace$/);

  const subscriptionResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/billing/subscription"),
  );
  await page.locator("nav").getByRole("button", { name: "Facturación", exact: true }).click();
  await expect(page).toHaveURL(/\/billing$/);

  // The real, exact bug: this response is a plain 200 with zero bytes —
  // asserted directly against the real backend, not assumed.
  const response = await subscriptionResponse;
  expect(response.status()).toBe(200);
  expect(await response.body()).toHaveLength(0);

  await expect(page.getByRole("heading", { name: "Facturación" })).toBeVisible();
  await expect(page.getByText("Ocurrió un error inesperado")).toHaveCount(0);
  await expect(page.getByText("Sin suscripción activa")).toBeVisible();
  await expect(page.getByText("Planes disponibles", { exact: true })).toBeVisible();
  await expect(page.getByText("Starter", { exact: true })).toBeVisible();
  await expect(page.getByText("Todavía no hay movimientos registrados.")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
