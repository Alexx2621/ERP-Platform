import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { PosPage } from "./pos-page";

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
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
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
  trackInventory: true,
  sellable: true,
  purchasable: false,
  hasVariants: false,
  publishOnline: false,
  barcode: null,
  basePrice: "10.0000",
  baseCost: null,
  status: "ACTIVE" as const,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const warehouse = {
  id: "wh-1",
  code: "WH-1",
  name: "Bodega 1",
  addressLine: null,
  city: null,
  country: null,
  status: "ACTIVE" as const,
  version: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const register = {
  id: "register-1",
  warehouseId: "wh-1",
  code: "REG-1",
  name: "Caja principal",
  status: "ACTIVE" as const,
  version: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const shift = {
  id: "shift-1",
  registerId: "register-1",
  status: "OPEN" as const,
  openedByUserId: "user-1",
  openedAt: "2026-09-01T08:00:00.000Z",
  openingCash: "50.0000",
  closedByUserId: null,
  closedAt: null,
  closingCashCounted: null,
  closingCashExpected: null,
  cashVariance: null,
  notes: null,
};

const sale = {
  id: "pos-sale-1",
  shiftId: "shift-1",
  salesOrderId: "order-1",
  paymentId: "payment-1",
  paymentMethod: "CASH" as const,
  amount: "30.0000",
  amountTendered: null,
  changeDue: null,
  createdAt: "2026-09-01T10:00:00.000Z",
};

describe("PosPage", () => {
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
    render(<PosPage selection={selectionWithoutCompany} navigate={navigate} />);
    expect(screen.getByText("Selecciona una empresa desde el selector de tenant para usar el punto de venta.")).toBeInTheDocument();
  });

  it("asks for at least one customer before showing the POS tabs", async () => {
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPosRegisters").mockResolvedValue([]);

    render(<PosPage selection={selection} navigate={navigate} />);

    await waitFor(() =>
      expect(screen.getByText("Todavía no hay clientes en esta empresa. Crea al menos uno en Contactos antes de vender.")).toBeInTheDocument(),
    );
  });

  it("opens a shift on the single active register, rings up a sale, and shows the change due", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([customer]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([product]);
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([warehouse]);
    vi.spyOn(apiClient, "listPosRegisters").mockResolvedValue([register]);
    vi.spyOn(apiClient, "listPosShifts").mockResolvedValue([]);
    const openShift = vi.spyOn(apiClient, "openShift").mockResolvedValue(shift);
    vi.spyOn(apiClient, "listCashMovements").mockResolvedValue([]);
    const ringUpSale = vi.spyOn(apiClient, "ringUpSale").mockResolvedValue({ ...sale, amountTendered: "50.0000", changeDue: "20.0000" });

    render(<PosPage selection={selection} navigate={navigate} />);

    // The single active register auto-selects; no OPEN shift exists yet.
    await user.type(await screen.findByLabelText("Fondo de caja inicial"), "50.0000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    await waitFor(() =>
      expect(openShift).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        registerId: "register-1",
        openingCash: "50.0000",
        notes: undefined,
      }),
    );

    // Add a line to the cart and ring up the sale.
    await user.selectOptions(await screen.findByLabelText("Producto"), "product-1");
    await user.type(screen.getByLabelText("Cantidad"), "3.0000");
    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    await user.selectOptions(screen.getByLabelText("Cliente"), "customer-1");
    await user.type(screen.getByLabelText("Efectivo recibido (opcional)"), "50.0000");
    await user.click(screen.getByRole("button", { name: "Cobrar y facturar" }));

    await waitFor(() =>
      expect(ringUpSale).toHaveBeenCalledWith(
        "access-token",
        "grupo-aurora",
        "company-1",
        expect.objectContaining({
          shiftId: "shift-1",
          customerId: "customer-1",
          currency: "USD",
          paymentMethod: "CASH",
          amountTendered: "50.0000",
          lines: [{ productId: "product-1", productVariantId: undefined, taxId: undefined, quantity: "3.0000" }],
        }),
      ),
    );

    expect(await screen.findByText(/Cambio a entregar: 20.0000/)).toBeInTheDocument();
  }, 15_000);
});
