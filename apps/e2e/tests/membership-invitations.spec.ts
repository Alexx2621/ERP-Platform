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
