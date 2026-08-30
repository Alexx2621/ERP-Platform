import { expect, test } from "@playwright/test";
import pg from "pg";

const { Client } = pg;

/**
 * FOUNDATION_APPS stays empty in production (docs/WORK_QUEUE.md — no
 * business module beyond the Core exists yet to register). This test
 * proves the App Registry mechanism itself end-to-end using two
 * test-only fixture apps, inserted directly like `grantPlatformAdmin` in
 * platform-admin.spec.ts — the ephemeral Testcontainers database is
 * discarded after the run, so no cleanup is needed here.
 */
async function seedFixtureApps(): Promise<void> {
  const connectionString = process.env.E2E_DATABASE_URL;
  if (!connectionString) {
    throw new Error("E2E_DATABASE_URL was not set by global-setup.ts");
  }
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO app_definitions (id, key, name, version, kind, depends_on_keys, created_at, updated_at)
       VALUES
         (gen_random_uuid(), 'products', 'Products', '1.0.0', 'BUSINESS_APP', '{}', now(), now()),
         (gen_random_uuid(), 'manufacturing', 'Manufacturing', '1.0.0', 'BUSINESS_APP', '{products}', now(), now())
       ON CONFLICT (key) DO NOTHING`,
    );
  } finally {
    await client.end();
  }
}

test("enables and disables apps for a tenant, enforcing dependencies and dependents", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Apps E2E ${runId}`;
  const tenantSlug = `apps-e2e-${runId}`;

  await seedFixtureApps();

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

  await page.getByRole("button", { name: "Apps" }).click();
  await expect(page).toHaveURL(/\/apps$/);
  await expect(page.getByRole("heading", { name: "Apps", exact: true })).toBeVisible();

  // Plain hasText filtering is ambiguous here: "Manufacturing"'s dependency
  // column renders the text "products" (its dependsOnKeys), and Playwright's
  // hasText string filter matches case-insensitively — so a "Products"
  // filter also matches the Manufacturing row. Anchor on the row's leading
  // "name key" text (rendered as `<b>{name}</b><code>{key}</code>`) instead.
  const manufacturingRow = page.getByRole("row", { name: /^Manufacturing\s+manufacturing\b/ });
  const productsRow = page.getByRole("row", { name: /^Products\s+products\b/ });
  await expect(manufacturingRow).toContainText("Deshabilitada");
  await expect(productsRow).toContainText("Deshabilitada");

  // Enabling the dependent before its dependency is rejected by the real backend.
  const rejectedEnableResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/manufacturing/enable") && response.request().method() === "POST",
  );
  await manufacturingRow.getByRole("button", { name: "Habilitar Manufacturing" }).click();
  expect((await rejectedEnableResponse).status()).toBe(409);
  await expect(page.getByText("Missing required, enabled dependencies: products.")).toBeVisible();
  await expect(manufacturingRow).toContainText("Deshabilitada");

  // Enable products, then manufacturing — both real HTTP round trips.
  const enableProductsResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/products/enable") && response.request().method() === "POST",
  );
  await productsRow.getByRole("button", { name: "Habilitar Products" }).click();
  expect((await enableProductsResponse).status()).toBe(201);
  await expect(productsRow).toContainText("Habilitada");

  const enableManufacturingResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/manufacturing/enable") && response.request().method() === "POST",
  );
  await manufacturingRow.getByRole("button", { name: "Habilitar Manufacturing" }).click();
  expect((await enableManufacturingResponse).status()).toBe(201);
  await expect(manufacturingRow).toContainText("Habilitada");

  // Disabling products while manufacturing still depends on it is rejected.
  const rejectedDisableResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/products/disable") && response.request().method() === "POST",
  );
  await productsRow.getByRole("button", { name: "Deshabilitar Products" }).click();
  expect((await rejectedDisableResponse).status()).toBe(409);
  await expect(page.getByText("Cannot disable: still required by enabled app(s): manufacturing.")).toBeVisible();
  await expect(productsRow).toContainText("Habilitada");

  // Disable manufacturing first, then products — real dependents check satisfied.
  const disableManufacturingResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/manufacturing/disable") && response.request().method() === "POST",
  );
  await manufacturingRow.getByRole("button", { name: "Deshabilitar Manufacturing" }).click();
  expect((await disableManufacturingResponse).status()).toBe(201);
  await expect(manufacturingRow).toContainText("Deshabilitada");

  const disableProductsResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apps/products/disable") && response.request().method() === "POST",
  );
  await productsRow.getByRole("button", { name: "Deshabilitar Products" }).click();
  expect((await disableProductsResponse).status()).toBe(201);
  await expect(productsRow).toContainText("Deshabilitada");
});
