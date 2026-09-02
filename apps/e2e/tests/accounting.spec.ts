import { expect, test } from "@playwright/test";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

test("runs the full Account -> FiscalPeriod -> Post -> TrialBalance -> Reverse lifecycle against the real backend", async ({ page }) => {
  const runId = `${Date.now()}-${process.pid}`;
  const tenantName = `Accounting E2E ${runId}`;
  const tenantSlug = `accounting-e2e-${runId}`;

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Propietaria Contabilidad E2E");
  await page.getByLabel("Correo electrónico").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("AccountingE2E9!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/register"));
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationResponse).status()).toBe(201);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre del espacio").fill(tenantName);
  await page.getByLabel("Razón social").click();
  await expect(page.getByLabel("Identificador del espacio")).toHaveValue(tenantSlug);
  await page.getByLabel("Razón social").fill(`${tenantName}, S.A.`);
  await page.getByLabel("Código de organización").fill("ACCTORG");
  await page.getByLabel("Nombre comercial").fill("Empresa Contabilidad E2E");
  await page.getByLabel("Código de empresa").fill("ACCTCO");
  const provisioningResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/tenants"));
  await page.getByRole("button", { name: "Crear espacio" }).click();
  expect((await provisioningResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workspace$/);

  await page.getByRole("button", { name: "Contabilidad" }).click();
  await expect(page).toHaveURL(/\/accounting$/);
  await expect(page.getByRole("heading", { name: "Contabilidad", exact: true })).toBeVisible();

  // --- Cuentas: a minimal real Chart of Accounts ---
  async function createAccount(code: string, name: string, type: string) {
    await page.getByRole("button", { name: "Nueva cuenta" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva cuenta" });
    await dialog.getByLabel("Código").fill(code);
    await dialog.getByLabel("Nombre").fill(name);
    await dialog.getByLabel("Tipo").selectOption(type);
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/accounting/accounts") && r.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Crear" }).click();
    expect((await response).status()).toBe(201);
    await expect(page.getByRole("row", { name: new RegExp(`^${code}\\s+${name}\\b`) })).toBeVisible();
  }

  await createAccount("1000", "Caja", "ASSET");
  await createAccount("4000", "Ingresos por ventas", "REVENUE");

  // --- Períodos: a real fiscal period that genuinely covers today ---
  await page.getByRole("tab", { name: "Períodos" }).click();
  await page.getByRole("button", { name: "Nuevo período" }).click();
  const periodDialog = page.getByRole("dialog", { name: "Nuevo período fiscal" });
  const start = new Date();
  start.setDate(1);
  const end = new Date(start.getFullYear(), start.getMonth() + 2, 0);
  await periodDialog.getByLabel("Código").fill(`E2E-${runId}`);
  await periodDialog.getByLabel("Nombre").fill("Período E2E");
  await periodDialog.getByLabel("Desde").fill(isoDate(start));
  await periodDialog.getByLabel("Hasta").fill(isoDate(end));
  const periodResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/accounting/fiscal-periods") && r.request().method() === "POST",
  );
  await periodDialog.getByRole("button", { name: "Crear" }).click();
  expect((await periodResponse).status()).toBe(201);
  await expect(page.getByRole("row", { name: new RegExp(`E2E-${runId}`) })).toBeVisible();

  // --- Asientos: post a real, balanced two-line journal entry ---
  await page.getByRole("tab", { name: "Asientos" }).click();
  await page.getByRole("button", { name: "Nuevo asiento" }).click();
  const entryDialog = page.getByRole("dialog", { name: "Nuevo asiento contable" });
  const today = isoDate(new Date());
  await entryDialog.getByLabel("Fecha").fill(today);
  await entryDialog.getByLabel("Descripción").fill("Venta en efectivo E2E");

  await entryDialog.getByLabel("Cuenta").selectOption({ label: "1000 · Caja" });
  await entryDialog.getByLabel("Débito").fill("150.0000");
  await entryDialog.getByRole("button", { name: "Agregar línea" }).click();

  await entryDialog.getByLabel("Cuenta").selectOption({ label: "4000 · Ingresos por ventas" });
  await entryDialog.getByLabel("Crédito").fill("150.0000");
  await entryDialog.getByRole("button", { name: "Agregar línea" }).click();

  await expect(entryDialog.getByText(/Balanceado/)).toBeVisible();
  const createEntryResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/accounting/journal-entries") && r.request().method() === "POST",
  );
  await entryDialog.getByRole("button", { name: "Contabilizar" }).click();
  expect((await createEntryResponse).status()).toBe(201);
  await expect(entryDialog).not.toBeVisible();

  // Scoped to exclude "Reversal of: ..." — that row also contains this
  // description as a substring once the entry below is reversed, and a
  // plain regex `name` match would otherwise resolve to both rows.
  const entryRow = page.getByRole("row").filter({ hasText: "Venta en efectivo E2E" }).filter({ hasNotText: "Reversal of:" });
  await expect(entryRow).toBeVisible();
  await expect(entryRow).toContainText("Contabilizado");

  // --- Balance de comprobación: confirm it balances, real ledger sums ---
  await page.getByRole("tab", { name: "Balance de comprobación" }).click();
  const trialBalanceResponse = page.waitForResponse(
    (r) => r.url().includes("/api/v1/accounting/reports/trial-balance") && r.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Consultar" }).click();
  expect((await trialBalanceResponse).status()).toBe(200);
  await expect(page.getByText(/Total débito: 150\.0000 · Total crédito: 150\.0000 · Balanceado/)).toBeVisible();
  await expect(page.getByRole("row", { name: /^1000\s+Caja\b/ })).toContainText("150.0000");

  // --- Reversar: posts a brand-new balanced entry, never edits the original ---
  await page.getByRole("tab", { name: "Asientos" }).click();
  await entryRow.getByRole("button", { name: "Ver" }).click();
  const detailDialog = page.getByRole("dialog", { name: /Asiento/ });
  const reverseResponse = page.waitForResponse(
    (r) => /\/api\/v1\/accounting\/journal-entries\/[^/]+\/reverse$/.test(r.url()) && r.request().method() === "POST",
  );
  await detailDialog.getByRole("button", { name: "Reversar asiento" }).click();
  expect((await reverseResponse).status()).toBe(201);
  await expect(detailDialog).not.toBeVisible();
  await expect(entryRow).toContainText("Reversado");
  await expect(page.getByRole("row", { name: /Reversal of: Venta en efectivo E2E/ })).toBeVisible();

  // Real, fresh trial balance nets the original and its reversal to zero.
  await page.getByRole("tab", { name: "Balance de comprobación" }).click();
  const trialBalanceAfterReversalResponse = page.waitForResponse(
    (r) => r.url().includes("/api/v1/accounting/reports/trial-balance") && r.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Consultar" }).click();
  expect((await trialBalanceAfterReversalResponse).status()).toBe(200);
  await expect(page.getByRole("row", { name: /^1000\s+Caja\b/ })).toContainText("0.0000");
});
