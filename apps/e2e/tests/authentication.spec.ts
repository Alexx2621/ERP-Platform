import { expect, test } from "@playwright/test";

test("rejects invalid credentials without exposing account existence", async ({
  page,
  request,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const email = `auth-e2e-${runId}@example.com`;
  const password = "PlatformE2E9!";
  const registration = await request.post("/api/v1/auth/register", {
    data: {
      displayName: "Valid Auth User",
      email,
      password,
    },
  });
  expect(registration.status()).toBe(201);

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("IncorrectE2E9!");

  const knownAccountResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ingresar" }).click();
  const knownAccountResponse = await knownAccountResponsePromise;
  expect(knownAccountResponse.status()).toBe(401);
  const knownAccountError = (await knownAccountResponse.json()) as {
    statusCode: number;
    code: string;
    message: string;
    correlationId: string;
  };
  expect(knownAccountError).toMatchObject({
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
  });
  expect(knownAccountError.correlationId).not.toBe("");
  await expect(page.getByRole("alert")).toHaveText("El correo o la contraseña no son correctos.");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Correo electrónico").fill(`unknown-${runId}@example.com`);
  const unknownAccountResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ingresar" }).click();
  const unknownAccountResponse = await unknownAccountResponsePromise;
  expect(unknownAccountResponse.status()).toBe(401);
  const unknownAccountError = (await unknownAccountResponse.json()) as {
    statusCode: number;
    code: string;
    message: string;
  };
  expect(unknownAccountError).toMatchObject({
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: knownAccountError.message,
  });
  await expect(page.getByRole("alert")).toHaveText("El correo o la contraseña no son correctos.");

  await page.goto("/roles");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo." })).toBeVisible();
});
