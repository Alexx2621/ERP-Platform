import { expect, test } from "@playwright/test";

test("runs the full Lead -> Convert -> Pipeline -> Opportunity -> Activity lifecycle against the real backend", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `CRM E2E ${runId}`;
  const tenantSlug = `crm-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria CRM E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("CrmE2ePassword9!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/register"));
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("CRMORG");
  await page.getByLabel("Nombre comercial").fill("Empresa CRM E2E");
  await page.getByLabel("Código de empresa").fill("CRMCO");
  const provisioningResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/tenants"));
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "CRM" }).click();
  await expect(page).toHaveURL(/\/crm$/);
  await expect(page.getByRole("heading", { name: "CRM", exact: true })).toBeVisible();

  // --- Prospectos: a real lead ---
  await page.getByRole("button", { name: "Nuevo prospecto" }).click();
  const leadDialog = page.getByRole("dialog", { name: "Nuevo prospecto" });
  await leadDialog.getByLabel("Nombre").fill("Grace Hopper");
  await leadDialog.getByLabel("Empresa").fill("Hopper Analytics");
  await leadDialog.getByLabel("Correo").fill(`grace-${runId}@hopper.dev`);
  const createLeadResponse = page.waitForResponse((r) => r.url().endsWith("/api/v1/crm/leads") && r.request().method() === "POST");
  await leadDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createLeadResponse).status()).toBe(201);
  await expect(leadDialog).not.toBeVisible();
  await expect(page.getByRole("row", { name: /Grace Hopper/ })).toBeVisible();

  // --- Convertir: real conversion into a real Customer via the public Customers contract ---
  const convertResponse = page.waitForResponse((r) => /\/api\/v1\/crm\/leads\/[^/]+\/convert$/.test(r.url()) && r.request().method() === "POST");
  await page.getByRole("button", { name: "Convertir" }).click();
  const convertBody = (await (await convertResponse).json()) as { customerId: string };
  expect(convertBody.customerId).toBeTruthy();
  await expect(page.getByText(/Cliente nuevo creado/)).toBeVisible();
  await expect(page.getByRole("row", { name: /Grace Hopper/ })).toContainText("Convertido");

  // --- Pipelines: a real pipeline with two real stages ---
  await page.getByRole("tab", { name: "Pipelines" }).click();
  await page.getByRole("button", { name: "Nuevo pipeline" }).click();
  const pipelineDialog = page.getByRole("dialog", { name: "Nuevo pipeline" });
  await pipelineDialog.getByLabel("Código").fill(`SALES-${runId}`);
  await pipelineDialog.getByLabel("Nombre").fill("Embudo E2E");
  const createPipelineResponse = page.waitForResponse((r) => r.url().endsWith("/api/v1/crm/pipelines") && r.request().method() === "POST");
  await pipelineDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createPipelineResponse).status()).toBe(201);
  await expect(page.getByRole("row", { name: /Embudo E2E/ })).toBeVisible();

  await page.getByRole("row", { name: /Embudo E2E/ }).getByRole("button", { name: "Etapas" }).click();
  const stagesDialog = page.getByRole("dialog", { name: "Etapas · Embudo E2E" });

  async function addStage(name: string, options: { isWon?: boolean } = {}) {
    await stagesDialog.getByLabel("Nombre").fill(name);
    if (options.isWon) await stagesDialog.getByLabel("Gana").check();
    const response = page.waitForResponse((r) => /\/api\/v1\/crm\/pipelines\/[^/]+\/stages$/.test(r.url()) && r.request().method() === "POST");
    await stagesDialog.getByRole("button", { name: "Agregar" }).click();
    expect((await response).status()).toBe(201);
    await expect(stagesDialog.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  }

  await addStage("Calificación");
  await addStage("Ganada", { isWon: true });
  await stagesDialog.getByRole("button", { name: "Cerrar modal" }).click();
  await expect(stagesDialog).not.toBeVisible();

  // --- Oportunidades: a real opportunity linked to the pipeline and the converted lead ---
  await page.getByRole("tab", { name: "Oportunidades" }).click();
  await page.getByRole("button", { name: "Nueva oportunidad" }).click();
  const opportunityDialog = page.getByRole("dialog", { name: "Nueva oportunidad" });
  await opportunityDialog.getByLabel("Nombre").fill("Trato Hopper Analytics");
  const stagesFetchResponse = page.waitForResponse((r) => /\/api\/v1\/crm\/pipelines\/[^/]+\/stages$/.test(r.url()) && r.request().method() === "GET");
  await opportunityDialog.getByLabel("Pipeline").selectOption({ label: "Embudo E2E" });
  await stagesFetchResponse;
  await opportunityDialog.getByLabel("Etapa inicial").selectOption({ label: "Calificación" });
  await opportunityDialog.getByLabel("Prospecto de origen (opcional)").selectOption({ label: "Grace Hopper" });
  await opportunityDialog.getByLabel("Monto").fill("12345.6789");
  await opportunityDialog.getByLabel("Moneda").fill("USD");
  const createOpportunityResponse = page.waitForResponse((r) => r.url().endsWith("/api/v1/crm/opportunities") && r.request().method() === "POST");
  await opportunityDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createOpportunityResponse).status()).toBe(201);
  await expect(opportunityDialog).not.toBeVisible();
  const opportunityRow = page.getByRole("row", { name: /Trato Hopper Analytics/ });
  await expect(opportunityRow).toBeVisible();
  await expect(opportunityRow).toContainText("12345.6789");
  await expect(opportunityRow).toContainText("Abierta");

  // --- Mover a la etapa que gana: real state transition, OPEN -> WON ---
  const moveStagesFetchResponse = page.waitForResponse((r) => /\/api\/v1\/crm\/pipelines\/[^/]+\/stages$/.test(r.url()) && r.request().method() === "GET");
  await opportunityRow.getByRole("button", { name: "Mover" }).click();
  await moveStagesFetchResponse;
  const moveDialog = page.getByRole("dialog", { name: /Mover etapa/ });
  await moveDialog.getByLabel("Nueva etapa").selectOption({ label: "Ganada (gana)" });
  const moveResponse = page.waitForResponse((r) => /\/api\/v1\/crm\/opportunities\/[^/]+\/stage$/.test(r.url()) && r.request().method() === "PUT");
  await moveDialog.getByRole("button", { name: "Mover" }).click();
  expect((await moveResponse).status()).toBe(200);
  await expect(moveDialog).not.toBeVisible();
  await expect(opportunityRow).toContainText("Ganada");

  // --- Actividades: a real activity related to the converted lead, then completed ---
  await page.getByRole("tab", { name: "Actividades" }).click();
  await page.getByRole("button", { name: "Nueva actividad" }).click();
  const activityDialog = page.getByRole("dialog", { name: "Nueva actividad" });
  await activityDialog.getByLabel("Asunto").fill("Llamada de seguimiento");
  await activityDialog.getByLabel("Relacionar con").selectOption("lead");
  await activityDialog.getByLabel("Prospecto", { exact: true }).selectOption({ label: "Grace Hopper" });
  const createActivityResponse = page.waitForResponse((r) => r.url().endsWith("/api/v1/crm/activities") && r.request().method() === "POST");
  await activityDialog.getByRole("button", { name: "Crear" }).click();
  expect((await createActivityResponse).status()).toBe(201);
  await expect(activityDialog).not.toBeVisible();
  const activityRow = page.getByRole("row", { name: /Llamada de seguimiento/ });
  await expect(activityRow).toBeVisible();
  await expect(activityRow).toContainText("Pendiente");

  const completeResponse = page.waitForResponse((r) => /\/api\/v1\/crm\/activities\/[^/]+\/complete$/.test(r.url()) && r.request().method() === "POST");
  await activityRow.getByRole("button", { name: "Completar" }).click();
  expect((await completeResponse).status()).toBe(201);
  await expect(activityRow).toContainText("Completada");
});
