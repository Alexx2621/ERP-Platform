import { expect, test } from "@playwright/test";

test("keeps a real session alive across a page reload via the persisted refresh token", async ({
  page,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const email = `reload-e2e-${runId}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Reload E2E");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("PlatformE2E9!");

  const registrationResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/register"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/onboarding$/);

  // A fresh access token was just issued, so reloading must trigger a real
  // rotation via the refresh token that was persisted to sessionStorage —
  // never a full logout. This is the exact behavior a user reported as
  // "reloading kicks me out of the session" against a build where the
  // session lived in React state alone and reset on every mount.
  const refreshResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/refresh") && response.request().method() === "POST",
  );
  await page.reload();
  const refreshResponse = await refreshResponsePromise;
  expect(refreshResponse.status()).toBe(200);

  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Nombre del espacio")).toBeVisible();

  // Without a stored refresh token (the pre-fix behavior, or a genuinely
  // expired/revoked one), a reload must still fall back to the login
  // screen — persistence is real, not a bypass of authentication.
  await page.evaluate(() => window.sessionStorage.removeItem("erp.refreshToken"));
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});
