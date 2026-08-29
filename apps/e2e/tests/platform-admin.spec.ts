import { expect, test } from "@playwright/test";
import pg from "pg";

const { Client } = pg;

/**
 * `isPlatformAdmin` has no API endpoint by design (docs/DECISIONS.md
 * ADR-007) — the only sanctioned way to grant it is a direct database
 * write, same as every manual smoke test in this project. `global-setup.ts`
 * exposes the ephemeral Testcontainers Postgres URL via `E2E_DATABASE_URL`
 * for exactly this purpose.
 */
async function grantPlatformAdmin(email: string): Promise<void> {
  const connectionString = process.env.E2E_DATABASE_URL;
  if (!connectionString) {
    throw new Error("E2E_DATABASE_URL was not set by global-setup.ts");
  }
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(
      'UPDATE users SET is_platform_admin = true WHERE email = $1 RETURNING id',
      [email],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Expected to promote exactly one user with email ${email}, affected ${result.rowCount}`);
    }
  } finally {
    await client.end();
  }
}

test("a platform admin manages users, platform settings and reviews platform activity", async ({
  page,
  request,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const adminEmail = `platform-admin-${runId}@example.com`;
  const adminPassword = "PlatformAdminE2E9!";
  const targetEmail = `platform-target-${runId}@example.com`;

  // A regular account, registered directly against the real API — the
  // target this admin will disable/re-enable from the Users tab.
  const targetRegistration = await request.post("/api/v1/auth/register", {
    data: {
      email: targetEmail,
      password: "PlatformTargetE2E9!",
      displayName: "Objetivo Plataforma E2E",
    },
  });
  expect(targetRegistration.status()).toBe(201);

  // The admin's own account, also registered via the real API, then
  // promoted with the sanctioned direct-database write.
  const adminRegistration = await request.post("/api/v1/auth/register", {
    data: {
      email: adminEmail,
      password: adminPassword,
      displayName: "Admin Plataforma E2E",
    },
  });
  expect(adminRegistration.status()).toBe(201);
  await grantPlatformAdmin(adminEmail);

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(adminEmail);
  await page.getByLabel("Contraseña").fill(adminPassword);
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ingresar" }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);
  await expect(loginResponse.json()).resolves.toMatchObject({ user: { isPlatformAdmin: true } });

  await expect(page).toHaveURL(/\/tenants$/);

  const platformLink = page.getByRole("button", { name: "Plataforma" });
  await expect(platformLink).toBeVisible();
  await platformLink.click();
  await expect(page).toHaveURL(/\/platform-admin$/);
  await expect(page.getByRole("heading", { name: "Administración de plataforma" })).toBeVisible();

  // --- Users tab -----------------------------------------------------
  await expect(page.getByRole("tab", { name: "Usuarios" })).toHaveAttribute("aria-selected", "true");
  const targetRow = page.getByRole("row").filter({ hasText: targetEmail });
  await expect(targetRow).toBeVisible();
  await expect(targetRow).toContainText("Activo");

  await targetRow.getByRole("button", { name: `Deshabilitar a Objetivo Plataforma E2E` }).click();
  const disableDialog = page.getByRole("dialog", { name: "Deshabilitar a Objetivo Plataforma E2E" });
  const statusResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/v1\/platform\/users\/.+\/status$/.test(response.url()) && response.request().method() === "PUT",
  );
  await disableDialog.getByRole("button", { name: "Deshabilitar cuenta" }).click();
  const statusResponse = await statusResponsePromise;
  expect(statusResponse.status()).toBe(200);
  await expect(statusResponse.json()).resolves.toMatchObject({ status: "DISABLED" });
  await expect(targetRow).toContainText("Deshabilitado");

  // A disabled account must be rejected at its next login attempt — the
  // whole point of this capability, verified end-to-end against the real
  // login flow, not just the platform-admin response body.
  const targetLoginRejection = await request.post("/api/v1/auth/login", {
    data: { email: targetEmail, password: "PlatformTargetE2E9!" },
  });
  expect(targetLoginRejection.status()).toBe(403);

  // Reactivate it so the account is left in a clean state.
  await targetRow.getByRole("button", { name: `Reactivar a Objetivo Plataforma E2E` }).click();
  const reenableDialog = page.getByRole("dialog", { name: "Reactivar a Objetivo Plataforma E2E" });
  const reenableResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/v1\/platform\/users\/.+\/status$/.test(response.url()) && response.request().method() === "PUT",
  );
  await reenableDialog.getByRole("button", { name: "Reactivar cuenta" }).click();
  expect((await reenableResponsePromise).status()).toBe(200);
  await expect(targetRow).toContainText("Activo");

  // --- Platform settings tab ------------------------------------------
  await page.getByRole("tab", { name: "Ajustes" }).click();
  const currencyRow = page.getByRole("row").filter({ hasText: "localization.currency" });
  await expect(currencyRow).toBeVisible();
  await expect(currencyRow).toContainText("Predeterminado");

  await currencyRow.getByRole("button", { name: "Editar ajuste de plataforma localization.currency" }).click();
  const settingDialog = page.getByRole("dialog", { name: "Editar localization.currency" });
  const valueField = settingDialog.getByLabel("Valor");
  await valueField.fill("GTQ");
  const saveSettingResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/platform/settings/localization.currency") &&
      response.request().method() === "PUT",
  );
  await settingDialog.getByRole("button", { name: "Guardar para toda la plataforma" }).click();
  const saveSettingResponse = await saveSettingResponsePromise;
  expect(saveSettingResponse.status()).toBe(200);
  await expect(saveSettingResponse.json()).resolves.toMatchObject({
    key: "localization.currency",
    value: "GTQ",
  });

  await expect(currencyRow).toContainText("GTQ");
  await expect(currencyRow).toContainText("Plataforma");

  // --- Platform audit tab ---------------------------------------------
  await page.getByRole("tab", { name: "Actividad" }).click();
  await expect(page.getByRole("heading", { name: "Actividad de la plataforma" })).toBeVisible();
  const settingChangeRow = page.getByRole("row").filter({ hasText: "Cambio de ajuste de plataforma" });
  await expect(settingChangeRow).toBeVisible();
  const statusChangeRows = page.getByRole("row").filter({ hasText: "Cambio de estado de usuario" });
  await expect(statusChangeRows.first()).toBeVisible();
});
