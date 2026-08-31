import { expect, test } from "@playwright/test";

test("manages units of measure, categories, brands, and products with variants", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Catálogo E2E ${runId}`;
  const tenantSlug = `catalogo-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Catálogo E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("CatalogE2E9!");
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
  await page.getByLabel("Código de organización").fill("CATORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Catálogo E2E");
  await page.getByLabel("Código de empresa").fill("CATCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "Catálogo" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("heading", { name: "Catálogo", exact: true })).toBeVisible();

  // --- Units of measure ---
  await expect(page.getByText("Todavía no hay unidades de medida")).toBeVisible();
  await page.getByRole("button", { name: "Nueva unidad de medida" }).click();
  const uomDialog = page.getByRole("dialog", { name: "Nueva unidad de medida" });
  await uomDialog.getByLabel("Código").fill("UN");
  await uomDialog.getByLabel("Nombre").fill("Unidad");
  await uomDialog.getByLabel("Símbolo").fill("u");
  const createUomResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/catalog/units-of-measure") && response.request().method() === "POST",
  );
  await uomDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createUomResponse).status()).toBe(201);
  const uomRow = page.getByRole("row", { name: /^UN\s+Unidad\b/ });
  await expect(uomRow).toBeVisible();
  await expect(uomRow).toContainText("Activo");

  // Toggle status off and back on, confirming a real round trip each time.
  const deactivateUomResponse = page.waitForResponse(
    (response) => /\/api\/v1\/catalog\/units-of-measure\/.+\/status$/.test(response.url()) && response.request().method() === "PUT",
  );
  await uomRow.getByRole("button", { name: "Desactivar" }).click();
  expect((await deactivateUomResponse).status()).toBe(200);
  await expect(uomRow).toContainText("Inactivo");

  const reactivateUomResponse = page.waitForResponse(
    (response) => /\/api\/v1\/catalog\/units-of-measure\/.+\/status$/.test(response.url()) && response.request().method() === "PUT",
  );
  await uomRow.getByRole("button", { name: "Activar" }).click();
  expect((await reactivateUomResponse).status()).toBe(200);
  await expect(uomRow).toContainText("Activo");

  // --- Categories ---
  await page.getByRole("tab", { name: "Categorías" }).click();
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  const categoryDialog = page.getByRole("dialog", { name: "Nueva categoría" });
  await categoryDialog.getByLabel("Código").fill("ROPA");
  await categoryDialog.getByLabel("Nombre").fill("Ropa");
  const createCategoryResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/catalog/categories") && response.request().method() === "POST",
  );
  await categoryDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createCategoryResponse).status()).toBe(201);
  await expect(page.getByRole("row", { name: /^ROPA\s+Ropa\b/ })).toBeVisible();

  // --- Brands ---
  await page.getByRole("tab", { name: "Marcas" }).click();
  await page.getByRole("button", { name: "Nueva marca" }).click();
  const brandDialog = page.getByRole("dialog", { name: "Nueva marca" });
  await brandDialog.getByLabel("Código").fill("ACME");
  await brandDialog.getByLabel("Nombre").fill("Acme");
  const createBrandResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/catalog/brands") && response.request().method() === "POST",
  );
  await brandDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createBrandResponse).status()).toBe(201);
  await expect(page.getByRole("row", { name: /^ACME\s+Acme\b/ })).toBeVisible();

  // --- Products ---
  await page.getByRole("tab", { name: "Productos" }).click();
  await expect(page.getByText("Todavía no hay productos")).toBeVisible();

  // A sellable, non-variant product with a base price.
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  const productDialog = page.getByRole("dialog", { name: "Nuevo producto" });
  await productDialog.getByLabel("Código").fill("MUG-01");
  await productDialog.getByLabel("Nombre").fill("Taza de cerámica");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Categoría").selectOption({ label: "Ropa" });
  await productDialog.getByLabel("Marca").selectOption({ label: "Acme" });
  await productDialog.getByLabel("Precio base").fill("9.9900");
  const createProductResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
  );
  await productDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createProductResponse).status()).toBe(201);
  const mugRow = page.getByRole("row", { name: /^MUG-01\s+Taza de cerámica\b/ });
  await expect(mugRow).toBeVisible();
  await expect(mugRow).toContainText("9.9900");

  // A product with variants — no base price field, priced per variant instead.
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await productDialog.getByLabel("Código").fill("SHIRT-01");
  await productDialog.getByLabel("Nombre").fill("Camisa");
  await productDialog.getByLabel("Unidad de medida").selectOption({ label: "Unidad (u)" });
  await productDialog.getByLabel("Este producto tiene variantes (color, talla, etc.)").check();
  await expect(productDialog.getByLabel("Precio base")).toHaveCount(0);
  const createShirtResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/products") && response.request().method() === "POST",
  );
  await productDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createShirtResponse).status()).toBe(201);
  const shirtRow = page.getByRole("row", { name: /^SHIRT-01\s+Camisa\b/ });
  await expect(shirtRow).toBeVisible();
  await expect(shirtRow).toContainText("Por variante");

  // Add a real variant to the variant-tracked product.
  await shirtRow.getByRole("button", { name: "Variantes" }).click();
  const variantsDialog = page.getByRole("dialog", { name: "Variantes de Camisa" });
  await expect(variantsDialog.getByText("Todavía no hay variantes")).toBeVisible();
  await variantsDialog.getByLabel("SKU").fill("SHIRT-01-AZ-M");
  await variantsDialog.getByLabel('Atributos (JSON, ej. {"color":"Azul","talla":"M"})').fill('{"color":"Azul","talla":"M"}');
  await variantsDialog.getByLabel("Precio").fill("24.9900");
  const createVariantResponse = page.waitForResponse(
    (response) => /\/api\/v1\/products\/.+\/variants$/.test(response.url()) && response.request().method() === "POST",
  );
  await variantsDialog.getByRole("button", { name: "Agregar variante" }).click();
  expect((await createVariantResponse).status()).toBe(201);
  const variantRow = variantsDialog.getByRole("row", { name: /^SHIRT-01-AZ-M\b/ });
  await expect(variantRow).toBeVisible();
  await expect(variantRow).toContainText("color: Azul, talla: M");
  await expect(variantRow).toContainText("24.9900");
});
