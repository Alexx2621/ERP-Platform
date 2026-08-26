import { expect, test } from "@playwright/test";

test("registers an owner and provisions the initial workspace", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Operación E2E ${runId}`;
  const tenantSlug = `operacion-e2e-${runId}`;

  await page.goto("/register");

  await page.getByLabel("Nombre completo").fill("Propietaria E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("PlatformE2E9!");

  const registrationResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/auth/register"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("E2EORG");
  await page.getByLabel("Nombre comercial").fill("Empresa E2E");
  await page.getByLabel("Código de empresa").fill("E2ECO");

  const provisioningResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  const provisioned = await provisioningResponse;
  expect(provisioned.status()).toBe(201);
  await expect(provisioned.json()).resolves.toMatchObject({
    tenant: { slug: tenantSlug, name: tenantName },
    organization: { code: "E2EORG" },
    company: { code: "E2ECO" },
  });

  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("heading", { name: tenantName, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preparado para los módulos ERP" })).toBeVisible();
  await expect(page.getByText("Contexto activo")).toBeVisible();
  await expect(page.getByText(tenantSlug, { exact: false })).toBeVisible();
});
