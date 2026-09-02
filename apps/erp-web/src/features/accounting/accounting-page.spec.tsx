import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { AccountingPage } from "./accounting-page";

const authContext = vi.hoisted(() => ({
  session: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshExpiresAt: "2099-01-02T00:00:00.000Z",
    user: { id: "user-1", email: "owner@example.com", displayName: "Propietaria" },
  },
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../../shared/auth/auth-context", () => ({
  useAuth: () => authContext,
}));

const navigate = vi.fn();

const selectionWithoutCompany = {
  tenantId: "tenant-1",
  slug: "grupo-aurora",
  name: "Grupo Aurora",
  membershipId: "membership-1",
};

const selection = { ...selectionWithoutCompany, companyId: "company-1" };

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

const cash = {
  id: "account-cash",
  parentAccountId: null,
  code: "1000",
  name: "Caja",
  type: "ASSET" as const,
  normalBalance: "DEBIT" as const,
  status: "ACTIVE" as const,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const revenue = {
  id: "account-revenue",
  parentAccountId: null,
  code: "4000",
  name: "Ingresos por ventas",
  type: "REVENUE" as const,
  normalBalance: "CREDIT" as const,
  status: "ACTIVE" as const,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("AccountingPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: showModalMock });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, writable: true, value: closeModalMock });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks the user to select a company when none is active", () => {
    render(<AccountingPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar la contabilidad."),
    ).toBeInTheDocument();
  });

  it("creates an account, opens a fiscal period, and posts a balanced journal entry", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listAccounts").mockResolvedValue([cash, revenue]);
    vi.spyOn(apiClient, "listFiscalPeriods").mockResolvedValue([]);
    vi.spyOn(apiClient, "listJournalEntries").mockResolvedValue([]);
    const createAccount = vi.spyOn(apiClient, "createAccount").mockResolvedValue({
      id: "account-expense",
      parentAccountId: null,
      code: "5000",
      name: "Gastos operativos",
      type: "EXPENSE",
      normalBalance: "DEBIT",
      status: "ACTIVE",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    const createFiscalPeriod = vi.spyOn(apiClient, "createFiscalPeriod").mockResolvedValue({
      id: "period-1",
      code: "2026-01",
      name: "Enero 2026",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-01-31T00:00:00.000Z",
      status: "OPEN",
      closedAt: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    const createJournalEntry = vi.spyOn(apiClient, "createJournalEntry").mockResolvedValue({
      id: "entry-1",
      fiscalPeriodId: "period-1",
      entryDate: "2026-01-15T00:00:00.000Z",
      description: "Venta en efectivo",
      sourceType: null,
      sourceId: null,
      reversalOfEntryId: null,
      reversedByEntryId: null,
      reversedAt: null,
      createdByUserId: "user-1",
      createdAt: "2026-09-01T00:00:00.000Z",
    });

    render(<AccountingPage selection={selection} navigate={navigate} />);

    // --- Cuentas: create a new account ---
    await user.click(await screen.findByRole("button", { name: /Nueva cuenta/i }));
    const accountModal = await screen.findByRole("dialog", { name: "Nueva cuenta" });
    await user.type(within(accountModal).getByLabelText("Código"), "5000");
    await user.type(within(accountModal).getByLabelText("Nombre"), "Gastos operativos");
    await user.selectOptions(within(accountModal).getByLabelText("Tipo"), "EXPENSE");
    await user.click(within(accountModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createAccount).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        code: "5000",
        name: "Gastos operativos",
        type: "EXPENSE",
        parentAccountId: undefined,
      }),
    );

    // --- Períodos: open a fiscal period ---
    await user.click(screen.getByRole("tab", { name: /Períodos/i }));
    await user.click(await screen.findByRole("button", { name: /Nuevo período/i }));
    const periodModal = await screen.findByRole("dialog", { name: "Nuevo período fiscal" });
    await user.type(within(periodModal).getByLabelText("Código"), "2026-01");
    await user.type(within(periodModal).getByLabelText("Nombre"), "Enero 2026");
    const startInput = within(periodModal).getByLabelText("Desde");
    const endInput = within(periodModal).getByLabelText("Hasta");
    await user.type(startInput, "2026-01-01");
    await user.type(endInput, "2026-01-31");
    await user.click(within(periodModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createFiscalPeriod).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        code: "2026-01",
        name: "Enero 2026",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      }),
    );

    // --- Asientos: post a balanced two-line journal entry ---
    await user.click(screen.getByRole("tab", { name: /Asientos/i }));
    await user.click(await screen.findByRole("button", { name: /Nuevo asiento/i }));
    const entryModal = await screen.findByRole("dialog", { name: "Nuevo asiento contable" });
    await user.type(within(entryModal).getByLabelText("Fecha"), "2026-01-15");
    await user.type(within(entryModal).getByLabelText("Descripción"), "Venta en efectivo");

    await user.selectOptions(within(entryModal).getByLabelText("Cuenta"), "account-cash");
    await user.type(within(entryModal).getByLabelText("Débito"), "100.0000");
    await user.click(within(entryModal).getByRole("button", { name: "Agregar línea" }));

    await user.selectOptions(within(entryModal).getByLabelText("Cuenta"), "account-revenue");
    await user.type(within(entryModal).getByLabelText("Crédito"), "100.0000");
    await user.click(within(entryModal).getByRole("button", { name: "Agregar línea" }));

    await user.click(within(entryModal).getByRole("button", { name: "Contabilizar" }));

    await waitFor(() =>
      expect(createJournalEntry).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        entryDate: "2026-01-15",
        description: "Venta en efectivo",
        lines: [
          { accountId: "account-cash", debit: "100.0000", credit: undefined, description: undefined },
          { accountId: "account-revenue", debit: undefined, credit: "100.0000", description: undefined },
        ],
      }),
    );
  }, 20_000);

  it("queries the trial balance report", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listAccounts").mockResolvedValue([cash, revenue]);
    vi.spyOn(apiClient, "listFiscalPeriods").mockResolvedValue([]);
    const getTrialBalance = vi.spyOn(apiClient, "getTrialBalance").mockResolvedValue({
      asOfDate: "2026-01-31T00:00:00.000Z",
      rows: [],
      totalDebit: "0.0000",
      totalCredit: "0.0000",
      isBalanced: true,
    });

    render(<AccountingPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("tab", { name: /Balance de comprobación/i }));
    await user.click(await screen.findByRole("button", { name: "Consultar" }));

    await waitFor(() => expect(getTrialBalance).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", expect.any(String)));
    expect(await screen.findByText(/Balanceado/)).toBeInTheDocument();
  });
});
