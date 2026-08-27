import { expect, test } from "@playwright/test";

test("completes onboarding, RBAC and the authenticated session lifecycle", async ({
  page,
  request,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Operación E2E ${runId}`;
  const tenantSlug = `operacion-e2e-${runId}`;

  await page.clock.install();
  await page.goto("/register");

  await page.getByLabel("Nombre completo").fill("Propietaria E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("PlatformE2E9!");

  const registrationResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/register"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const registered = await registrationResponse;
  expect(registered.status()).toBe(201);
  const initialSession = (await registered.json()) as {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
  };
  await page.clock.setSystemTime(
    new Date(new Date(initialSession.accessExpiresAt).getTime() - 29_000),
  );

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("E2EORG");
  await page.getByLabel("Nombre comercial").fill("Empresa E2E");
  await page.getByLabel("Código de empresa").fill("E2ECO");

  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  const refreshResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/refresh") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  const refreshResponse = await refreshResponsePromise;
  expect(refreshResponse.status()).toBe(200);
  const rotatedSession = (await refreshResponse.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  expect(rotatedSession.accessToken).not.toBe(initialSession.accessToken);
  expect(rotatedSession.refreshToken).not.toBe(initialSession.refreshToken);

  const replayedRefresh = await request.post("/api/v1/auth/refresh", {
    data: { refreshToken: initialSession.refreshToken },
  });
  expect(replayedRefresh.status()).toBe(401);
  await expect(replayedRefresh.json()).resolves.toMatchObject({
    statusCode: 401,
    code: "UNAUTHENTICATED",
  });

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
  await expect(page.getByRole("heading", { name: "Avance del desarrollo" })).toBeVisible();
  await expect(page.getByText("Roadmap total del producto")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Avance total estimado" })).toHaveAttribute(
    "aria-valuenow",
    "11",
  );
  await expect(page.getByText("Contexto activo")).toBeVisible();
  await expect(page.getByText(tenantSlug, { exact: false })).toBeVisible();

  const definitionsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/settings/definitions") &&
      response.request().method() === "GET",
  );
  const effectiveSettingsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/settings") && response.request().method() === "GET",
  );
  const preferencesResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/preferences") && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Ajustes" }).click();
  expect((await definitionsResponsePromise).status()).toBe(200);
  expect((await effectiveSettingsResponsePromise).status()).toBe(200);
  expect((await preferencesResponsePromise).status()).toBe(200);

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
  const localeRow = page.getByRole("row").filter({ hasText: "localization.locale" });
  await expect(localeRow).toContainText("Predeterminado");
  await localeRow.getByRole("button", { name: "Editar ajuste localization.locale" }).click();
  const settingDialog = page.getByRole("dialog", { name: "Editar localization.locale" });
  await expect(settingDialog.getByRole("combobox", { name: "Alcance" })).toHaveValue("COMPANY");
  await settingDialog.getByLabel("Valor").fill("es-GT");

  const settingUpdateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/settings/localization.locale") &&
      response.request().method() === "PUT",
  );
  const effectiveReloadResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/settings") && response.request().method() === "GET",
  );
  await settingDialog.getByRole("button", { name: "Guardar ajuste" }).click();
  const settingUpdateResponse = await settingUpdateResponsePromise;
  expect(settingUpdateResponse.status()).toBe(200);
  expect(settingUpdateResponse.request().postDataJSON()).toMatchObject({
    scopeType: "COMPANY",
    value: "es-GT",
  });
  expect((await effectiveReloadResponsePromise).status()).toBe(200);
  await expect(localeRow).toContainText("es-GT");
  await expect(localeRow).toContainText("Empresa");

  await page.getByRole("tab", { name: /Preferencias/ }).click();
  await page.getByRole("button", { name: "Nueva preferencia" }).click();
  const preferenceDialog = page.getByRole("dialog", { name: "Nueva preferencia" });
  await preferenceDialog.getByLabel("Clave").fill("ui.density");
  await preferenceDialog.getByRole("textbox", { name: "Valor", exact: true }).fill("compact");
  const preferenceUpdateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/preferences/ui.density") &&
      response.request().method() === "PUT",
  );
  await preferenceDialog.getByRole("button", { name: "Guardar preferencia" }).click();
  const preferenceUpdateResponse = await preferenceUpdateResponsePromise;
  expect(preferenceUpdateResponse.status()).toBe(200);
  expect(preferenceUpdateResponse.request().postDataJSON()).toEqual({ value: "compact" });
  await expect(page.getByRole("cell", { name: "ui.density", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Volver al workspace" }).click();
  await expect(page).toHaveURL(/\/workspace$/);

  const rolesResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/roles") && response.request().method() === "GET",
  );
  const permissionsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/permissions") && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Roles y permisos" }).click();
  expect((await rolesResponsePromise).status()).toBe(200);
  expect((await permissionsResponsePromise).status()).toBe(200);

  await expect(page).toHaveURL(/\/roles$/);
  await expect(page.getByRole("heading", { name: "Roles y permisos", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Owner", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Permisos" }).click();
  await expect(page.getByRole("table", { name: "Catálogo global de permisos" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "access.permissions.read" })).toBeVisible();

  const roleName = `Supervisor ${runId}`;
  await page.getByRole("tab", { name: "Roles" }).click();
  await page.getByRole("button", { name: "Crear rol" }).click();
  await page.getByLabel("Nombre del rol").fill(roleName);
  await page.getByRole("checkbox", { name: /access\.roles\.read/ }).check();

  const createRoleResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/roles") && response.request().method() === "POST",
  );
  await page
    .getByRole("dialog", { name: "Crear rol" })
    .getByRole("button", { name: "Crear rol" })
    .click();
  const createdRoleResponse = await createRoleResponsePromise;
  expect(createdRoleResponse.status()).toBe(201);
  const createdRole = (await createdRoleResponse.json()) as { id: string; name: string };
  expect(createdRole.name).toBe(roleName);

  const roleRow = page.getByRole("row").filter({ hasText: roleName });
  await expect(roleRow).toBeVisible();
  await roleRow.getByRole("button", { name: `Asignar rol ${roleName}` }).click();
  const membershipId = await page.getByLabel("ID de membresía").inputValue();
  expect(membershipId).not.toBe("");
  await page.getByRole("combobox", { name: "Alcance" }).selectOption("COMPANY");
  const companyId = await page.getByLabel("ID de empresa").inputValue();
  expect(companyId).not.toBe("");

  const assignmentResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/roles/${createdRole.id}/assignments`) &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("dialog", { name: `Asignar ${roleName}` })
    .getByRole("button", { name: "Asignar rol" })
    .click();
  const assignmentResponse = await assignmentResponsePromise;
  expect(assignmentResponse.status()).toBe(201);
  await expect(assignmentResponse.json()).resolves.toMatchObject({
    membershipId,
    roleId: createdRole.id,
    scopeType: "COMPANY",
    scopeId: companyId,
  });
  await expect(page.getByRole("status")).toContainText("El rol fue asignado");

  const logoutResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/logout") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.status()).toBe(204);
  const revokedAuthorization = logoutResponse.request().headers().authorization;
  expect(revokedAuthorization).toMatch(/^Bearer /);

  await expect(page).toHaveURL(/\/login$/);
  const revokedSessionResponse = await request.get("/api/v1/auth/me", {
    headers: { Authorization: revokedAuthorization as string },
  });
  expect(revokedSessionResponse.status()).toBe(401);
  await expect(revokedSessionResponse.json()).resolves.toMatchObject({
    statusCode: 401,
    code: "SESSION_REVOKED",
  });

  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
});
