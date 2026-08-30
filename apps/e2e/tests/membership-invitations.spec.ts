import { expect, test } from "@playwright/test";

test("invites an existing user, who accepts and joins the tenant", async ({ page, browser, request }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Invitación E2E ${runId}`;
  const tenantSlug = `invitacion-e2e-${runId}`;
  const inviteeEmail = `invitee-${runId}@example.com`;

  // The invitee needs an existing account before any invitation can target
  // them (MASTER_SPEC §90 — no passwordless account creation), so register
  // them directly against the real API rather than through the UI.
  const inviteeRegistration = await request.post("/api/v1/auth/register", {
    data: {
      email: inviteeEmail,
      password: "InviteeE2E9!",
      displayName: "Invitada E2E",
    },
  });
  expect(inviteeRegistration.status()).toBe(201);

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Invitación E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("OwnerInviteE2E9!");
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
  await page.getByLabel("Código de organización").fill("INVORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Invitación E2E");
  await page.getByLabel("Código de empresa").fill("INVCO");
  const provisioningResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/tenants"),
  );
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "Roles y permisos" }).click();
  await expect(page).toHaveURL(/\/roles$/);
  await page.getByRole("tab", { name: "Miembros" }).click();
  await expect(page.getByRole("heading", { name: "Miembros", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Invitar miembro" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Invitar miembro" });
  await inviteDialog.getByLabel("Correo electrónico").fill(inviteeEmail);
  const inviteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/tenants/memberships") &&
      response.request().method() === "POST",
  );
  await inviteDialog.getByRole("button", { name: "Enviar invitación" }).click();
  const inviteResponse = await inviteResponsePromise;
  expect(inviteResponse.status()).toBe(201);
  await expect(inviteResponse.json()).resolves.toMatchObject({
    status: "INVITED",
    email: inviteeEmail,
  });

  const memberRow = page.getByRole("row").filter({ hasText: inviteeEmail });
  await expect(memberRow).toContainText("INVITED");

  // A second isolated browser context — the invitee's own session, never
  // sharing in-memory tokens with the owner's page.
  const inviteeContext = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto("/login");
  await inviteePage.getByLabel("Correo electrónico").fill(inviteeEmail);
  await inviteePage.getByLabel("Contraseña").fill("InviteeE2E9!");
  const pendingInvitationsResponsePromise = inviteePage.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/tenants/memberships/pending") &&
      response.request().method() === "GET",
  );
  await inviteePage.getByRole("button", { name: "Ingresar" }).click();
  expect((await pendingInvitationsResponsePromise).status()).toBe(200);

  await expect(inviteePage).toHaveURL(/\/tenants$/);
  await expect(inviteePage.getByText("Invitaciones pendientes")).toBeVisible();
  const invitationCard = inviteePage.getByRole("listitem").filter({ hasText: tenantName });
  await expect(invitationCard).toBeVisible();

  const acceptResponsePromise = inviteePage.waitForResponse(
    (response) =>
      /\/api\/v1\/tenants\/memberships\/.+\/accept$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await invitationCard.getByRole("button", { name: "Aceptar" }).click();
  const acceptResponse = await acceptResponsePromise;
  expect(acceptResponse.status()).toBe(201);
  await expect(acceptResponse.json()).resolves.toMatchObject({ status: "ACTIVE" });

  // Accepting removes the card and the tenant now shows up in "Tus espacios".
  await expect(inviteePage.getByText("Invitaciones pendientes")).toHaveCount(0);
  await expect(inviteePage.getByRole("button", { name: new RegExp(tenantName) })).toBeVisible();

  await inviteeContext.close();
});

test("revokes a pending invitation from the UI, then reissuing it produces a real, acceptable invitation", async ({
  page,
  browser,
  request,
}) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Revocación E2E ${runId}`;
  const tenantSlug = `revocacion-e2e-${runId}`;
  const inviteeEmail = `invitee-revoke-${runId}@example.com`;

  const inviteeRegistration = await request.post("/api/v1/auth/register", {
    data: { email: inviteeEmail, password: "InviteeRevokeE2E9!", displayName: "Invitada Revocación E2E" },
  });
  expect(inviteeRegistration.status()).toBe(201);

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Revocación E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-revoke-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("OwnerRevokeE2E9!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/register"));
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("REVORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Revocación E2E");
  await page.getByLabel("Código de empresa").fill("REVCO");
  const provisioningResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/tenants"));
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "Roles y permisos" }).click();
  await page.getByRole("tab", { name: "Miembros" }).click();

  await page.getByRole("button", { name: "Invitar miembro" }).click();
  await page.getByRole("dialog", { name: "Invitar miembro" }).getByLabel("Correo electrónico").fill(inviteeEmail);
  const firstInviteResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/tenants/memberships") && response.request().method() === "POST",
  );
  await page.getByRole("dialog", { name: "Invitar miembro" }).getByRole("button", { name: "Enviar invitación" }).click();
  expect((await firstInviteResponse).status()).toBe(201);

  const memberRow = page.getByRole("row").filter({ hasText: inviteeEmail });
  await expect(memberRow).toContainText("INVITED");
  await expect(memberRow.getByText(/^Expira el /)).toBeVisible();

  await memberRow.getByRole("button", { name: `Revocar invitación de Invitada Revocación E2E` }).click();
  const revokeDialog = page.getByRole("dialog", { name: "Revocar invitación de Invitada Revocación E2E" });
  const revokeResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/v1\/tenants\/memberships\/.+$/.test(response.url()) && response.request().method() === "DELETE",
  );
  await revokeDialog.getByRole("button", { name: "Revocar invitación" }).click();
  expect((await revokeResponsePromise).status()).toBe(204);
  await expect(memberRow).toContainText("REVOKED");
  await expect(memberRow.getByRole("button", { name: /^Revocar invitación/ })).toHaveCount(0);

  // A fresh invite reopens the exact same row instead of staying blocked.
  await page.getByRole("button", { name: "Invitar miembro" }).click();
  await page.getByRole("dialog", { name: "Invitar miembro" }).getByLabel("Correo electrónico").fill(inviteeEmail);
  const secondInviteResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/tenants/memberships") && response.request().method() === "POST",
  );
  await page.getByRole("dialog", { name: "Invitar miembro" }).getByRole("button", { name: "Enviar invitación" }).click();
  const secondInvite = await secondInviteResponse;
  expect(secondInvite.status()).toBe(201);
  await expect(secondInvite.json()).resolves.toMatchObject({ status: "INVITED" });
  await expect(memberRow).toContainText("INVITED");

  // The reissued invitation is genuinely acceptable — not just cosmetically INVITED.
  const inviteeContext = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto("/login");
  await inviteePage.getByLabel("Correo electrónico").fill(inviteeEmail);
  await inviteePage.getByLabel("Contraseña").fill("InviteeRevokeE2E9!");
  await inviteePage.getByRole("button", { name: "Ingresar" }).click();
  await expect(inviteePage).toHaveURL(/\/tenants$/);
  const invitationCard = inviteePage.getByRole("listitem").filter({ hasText: tenantName });
  await expect(invitationCard).toBeVisible();
  const acceptResponsePromise = inviteePage.waitForResponse(
    (response) => /\/api\/v1\/tenants\/memberships\/.+\/accept$/.test(response.url()) && response.request().method() === "POST",
  );
  await invitationCard.getByRole("button", { name: "Aceptar" }).click();
  expect((await acceptResponsePromise).status()).toBe(201);
  await expect(inviteePage.getByRole("button", { name: new RegExp(tenantName) })).toBeVisible();

  await inviteeContext.close();
});
