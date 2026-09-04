import { expect, test } from "@playwright/test";

test("navigates the real workspace via the Ctrl+K command palette", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Buscador E2E ${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Buscador E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("PaletteE2E9!");
  const registrationResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/register"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("PALORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Buscador E2E");
  await page.getByLabel("Código de empresa").fill("PALCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  // Ctrl+K opens the palette from anywhere in the workspace, with no prior
  // click needed on a visible trigger — the global keyboard listener itself.
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Buscar en la plataforma" });
  await expect(dialog).toBeVisible();

  // With no query typed, every real module is listed (not just the first
  // handful) — the exact bug found and fixed while writing this feature's
  // own unit tests.
  await expect(dialog.getByRole("option", { name: /Ventas/ })).toBeVisible();
  await expect(dialog.getByRole("option", { name: /Manufactura/ })).toBeVisible();
  await expect(dialog.getByRole("option", { name: /Cambiar espacio/ })).toBeVisible();

  // Typing a keyword alias ("productos") surfaces Catálogo, which owns
  // products, even though the module's own label never contains that word.
  await dialog.getByRole("combobox").fill("productos");
  await expect(dialog.getByRole("option", { name: /Catálogo/ })).toBeVisible();
  await expect(dialog.getByRole("option", { name: /Ventas/ })).not.toBeVisible();
  await dialog.getByRole("option", { name: /Catálogo/ }).click();

  await expect(page).toHaveURL(/\/catalog$/);
  await expect(dialog).not.toBeVisible();

  // Reopen via the visible floating trigger (not the shortcut), then drive
  // selection purely by keyboard: type, arrow to the target, Enter.
  await page.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("ventas");
  // "Ventas" matches on its own label; "Punto de venta" only matches via a
  // deliberate keyword alias — the label match must rank first, so typing
  // Enter with no arrow presses selects Ventas, not the alias.
  await expect(dialog.getByRole("option", { selected: true })).toHaveAccessibleName(/^Ventas/);
  await page.keyboard.press("ArrowDown");
  await expect(dialog.getByRole("option", { selected: true })).toHaveAccessibleName(/Punto de venta/);
  await page.keyboard.press("ArrowUp");
  await expect(dialog.getByRole("option", { selected: true })).toHaveAccessibleName(/^Ventas/);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/sales$/);
  await expect(dialog).not.toBeVisible();

  // Escape closes without navigating anywhere.
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/sales$/);
});
