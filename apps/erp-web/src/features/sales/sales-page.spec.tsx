import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { SalesPage } from "./sales-page";

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

const customer = {
  id: "customer-1",
  code: "CUST-1",
  name: "Cliente 1",
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  addressLine: null,
  city: null,
  country: null,
  status: "ACTIVE" as const,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const product = {
  id: "product-1",
  companyId: "company-1",
  categoryId: null,
  brandId: null,
  unitOfMeasureId: "unit-1",
  code: "SKU-1",
  name: "Producto 1",
  description: null,
  type: "PHYSICAL_GOOD" as const,
  trackInventory: false,
  sellable: true,
  purchasable: true,
  hasVariants: false,
  publishOnline: false,
  barcode: null,
  basePrice: "19.9900",
  baseCost: null,
  status: "ACTIVE" as const,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const quote = {
  id: "quote-1",
  customerId: "customer-1",
  channel: "ERP" as const,
  status: "DRAFT" as const,
  currency: "USD",
  notes: null,
  version: 1,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
  convertedAt: null,
  cancelledAt: null,
};

describe("SalesPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      writable: true,
      value: showModalMock,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      writable: true,
      value: closeModalMock,
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks the user to select a company when none is active", () => {
    render(<SalesPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar ventas."),
    ).toBeInTheDocument();
  });

  it("asks for at least one customer before showing the sales tabs", async () => {
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);

    render(<SalesPage selection={selection} navigate={navigate} />);

    await waitFor(() =>
      expect(
        screen.getByText("Todavía no hay clientes en esta empresa. Crea al menos uno en Contactos antes de vender."),
      ).toBeInTheDocument(),
    );
  });

  it("creates a quote, adds a line, and converts it into a sales order", async () => {
    const user = userEvent.setup();
    // A longer-than-default timeout: this test drives four sequential
    // modal/form interactions (create → open detail → add line → convert),
    // each awaiting a real state update, which the default 5s budget can
    // miss under concurrent test-suite load even though every step itself
    // is fast in isolation.
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([customer]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([product]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listQuotes").mockResolvedValue([]);
    const createQuote = vi.spyOn(apiClient, "createQuote").mockResolvedValue(quote);
    vi.spyOn(apiClient, "listQuoteLines").mockResolvedValue([]);
    const addQuoteLine = vi.spyOn(apiClient, "addQuoteLine").mockResolvedValue({
      id: "quote-line-1",
      quoteId: "quote-1",
      productId: "product-1",
      productVariantId: null,
      taxId: null,
      quantity: "2.0000",
      unitPrice: "19.9900",
      discountAmount: "0.0000",
      taxRate: "0.0000",
      lineTotal: "39.9800",
      createdAt: "2026-08-31T00:00:00.000Z",
    });
    const convertQuote = vi.spyOn(apiClient, "convertQuoteToSalesOrder").mockResolvedValue({
      id: "order-1",
      customerId: "customer-1",
      quoteId: "quote-1",
      channel: "ERP",
      status: "DRAFT",
      currency: "USD",
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
      confirmedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    });
    vi.spyOn(apiClient, "listSalesOrders").mockResolvedValue([]);
    vi.spyOn(apiClient, "listSalesOrderLines").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPayments").mockResolvedValue([]);

    render(<SalesPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("button", { name: /Nueva cotización/i }));
    const createModal = await screen.findByRole("dialog", { name: /Nueva cotización/i });
    await user.selectOptions(within(createModal).getByLabelText("Cliente"), "customer-1");
    await user.click(within(createModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createQuote).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        customerId: "customer-1",
        currency: "USD",
        notes: undefined,
      }),
    );

    // Opening the quote's detail view and adding a line.
    await user.click(await screen.findByRole("button", { name: "Ver" }));
    const detailModal = await screen.findByRole("dialog", { name: /Cotización/i });
    await user.selectOptions(within(detailModal).getByLabelText("Producto"), "product-1");
    await user.type(within(detailModal).getByLabelText("Cantidad"), "2.0000");
    await user.click(within(detailModal).getByRole("button", { name: "Agregar línea" }));

    await waitFor(() =>
      expect(addQuoteLine).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "quote-1", {
        productId: "product-1",
        productVariantId: undefined,
        taxId: undefined,
        quantity: "2.0000",
        unitPrice: undefined,
        discountAmount: undefined,
      }),
    );

    await user.click(within(detailModal).getByRole("button", { name: /Convertir a pedido/i }));

    await waitFor(() =>
      expect(convertQuote).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "quote-1", {
        warehouseId: undefined,
      }),
    );

    // Converting switches to the "Pedidos" tab and opens the new order's detail.
    await waitFor(() => expect(screen.getByRole("dialog", { name: /Pedido/i })).toBeInTheDocument());
  }, 15_000);

  it("captures a CASH payment against a sales order", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([customer]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([product]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listQuotes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listSalesOrders").mockResolvedValue([
      {
        id: "order-1",
        customerId: "customer-1",
        quoteId: null,
        channel: "ERP",
        status: "DRAFT",
        currency: "USD",
        version: 1,
        createdAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z",
        confirmedAt: null,
        fulfilledAt: null,
        cancelledAt: null,
      },
    ]);
    vi.spyOn(apiClient, "listSalesOrderLines").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPayments").mockResolvedValue([]);
    const capturePayment = vi.spyOn(apiClient, "capturePayment").mockResolvedValue({
      id: "payment-1",
      salesOrderId: "order-1",
      method: "CASH",
      status: "CAPTURED",
      amount: "50.0000",
      currency: "USD",
      gatewayReference: null,
      failureReason: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      capturedAt: "2026-08-31T00:00:00.000Z",
      refundedAt: null,
    });

    render(<SalesPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("tab", { name: /Pedidos/i }));
    await user.click(await screen.findByRole("button", { name: "Ver" }));
    const detailModal = await screen.findByRole("dialog", { name: /Pedido/i });

    await user.type(within(detailModal).getByLabelText(/Monto/i), "50.0000");
    await user.click(within(detailModal).getByRole("button", { name: "Cobrar" }));

    await waitFor(() =>
      expect(capturePayment).toHaveBeenCalledWith(
        "access-token",
        "grupo-aurora",
        "company-1",
        expect.objectContaining({
          salesOrderId: "order-1",
          method: "CASH",
          amount: "50.0000",
          currency: "USD",
        }),
      ),
    );
  });
});
