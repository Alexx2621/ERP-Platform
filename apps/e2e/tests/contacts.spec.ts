import { expect, test } from "@playwright/test";

test("manages customers and suppliers, including editing and status toggling", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Contactos E2E ${runId}`;
  const tenantSlug = `contactos-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Contactos E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("ContactsE2E9!");
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
  await page.getByLabel("Código de organización").fill("CONTORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Contactos E2E");
  await page.getByLabel("Código de empresa").fill("CONTCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "Contactos" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByRole("heading", { name: "Contactos", exact: true })).toBeVisible();

  // --- Customers ---
  await expect(page.getByText("Todavía no hay clientes")).toBeVisible();
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const customerDialog = page.getByRole("dialog", { name: "Nuevo cliente" });
  await customerDialog.getByLabel("Código").fill("CUST-01");
  await customerDialog.getByLabel("Nombre").fill("Acme Corp");
  await customerDialog.getByLabel("Identificación fiscal").fill("TAX-100");
  await customerDialog.getByLabel("Correo").fill("billing@acme.test");
  const createCustomerResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/customers") && response.request().method() === "POST",
  );
  await customerDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createCustomerResponse).status()).toBe(201);
  const customerRow = page.getByRole("row", { name: /^CUST-01\s+Acme Corp\b/ });
  await expect(customerRow).toBeVisible();
  await expect(customerRow).toContainText("TAX-100");
  await expect(customerRow).toContainText("Activo");

  // Edit: change name, clear the tax id via the empty-string-clears contract.
  await customerRow.getByRole("button", { name: "Editar" }).click();
  const editCustomerDialog = page.getByRole("dialog", { name: "Editar cliente" });
  await expect(editCustomerDialog.getByLabel("Código")).toBeDisabled();
  await editCustomerDialog.getByLabel("Nombre").fill("Acme Corporation");
  await editCustomerDialog.getByLabel("Identificación fiscal").fill("");
  const updateCustomerResponse = page.waitForResponse(
    (response) => /\/api\/v1\/customers\/[^/]+$/.test(response.url()) && response.request().method() === "PUT",
  );
  await editCustomerDialog.getByRole("button", { name: "Guardar" }).click();
  expect((await updateCustomerResponse).status()).toBe(200);
  const renamedCustomerRow = page.getByRole("row", { name: /^CUST-01\s+Acme Corporation\b/ });
  await expect(renamedCustomerRow).toBeVisible();
  await expect(renamedCustomerRow.getByRole("cell").nth(2)).toHaveText("—");

  // Toggle status off and back on.
  const deactivateResponse = page.waitForResponse(
    (response) => /\/api\/v1\/customers\/[^/]+\/status$/.test(response.url()) && response.request().method() === "PUT",
  );
  await renamedCustomerRow.getByRole("button", { name: "Desactivar" }).click();
  expect((await deactivateResponse).status()).toBe(200);
  await expect(renamedCustomerRow).toContainText("Inactivo");

  // --- Suppliers ---
  await page.getByRole("tab", { name: "Proveedores" }).click();
  await expect(page.getByText("Todavía no hay proveedores")).toBeVisible();
  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const supplierDialog = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await supplierDialog.getByLabel("Código").fill("SUPP-01");
  await supplierDialog.getByLabel("Nombre").fill("Textiles del Norte");
  const createSupplierResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/suppliers") && response.request().method() === "POST",
  );
  await supplierDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createSupplierResponse).status()).toBe(201);
  const supplierRow = page.getByRole("row", { name: /^SUPP-01\s+Textiles del Norte\b/ });
  await expect(supplierRow).toBeVisible();
  await expect(supplierRow).toContainText("Activo");
});
