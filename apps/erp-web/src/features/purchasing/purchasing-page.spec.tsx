import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { PurchasingPage } from "./purchasing-page";

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

const supplier = {
  id: "supplier-1",
  code: "SUP-1",
  name: "Proveedor 1",
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
  trackInventory: false,
  sellable: false,
  purchasable: true,
  hasVariants: false,
  publishOnline: false,
  barcode: null,
  basePrice: null,
  baseCost: "4.2500",
  status: "ACTIVE" as const,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const order = {
  id: "po-1",
  supplierId: "supplier-1",
  status: "DRAFT" as const,
  currency: "USD",
  notes: null,
  version: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  confirmedAt: null,
  closedAt: null,
  cancelledAt: null,
};

describe("PurchasingPage", () => {
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
    render(<PurchasingPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar compras."),
    ).toBeInTheDocument();
  });

  it("asks for at least one supplier before showing the purchasing tabs", async () => {
    vi.spyOn(apiClient, "listSuppliers").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);

    render(<PurchasingPage selection={selection} navigate={navigate} />);

    // Only after loading finishes — the guard used to render immediately on
    // mount against an empty initial array, flashing a red error even for
    // companies with dozens of real suppliers.
    await waitFor(() => expect(screen.getByText("Primero necesitas un proveedor")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Ir a Contactos" })).toBeInTheDocument();
  });

  it("creates a purchase order, adds a line, confirms it, and records a partial receipt", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listSuppliers").mockResolvedValue([supplier]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([product]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPurchaseOrders").mockResolvedValue([]);
    const createPurchaseOrder = vi.spyOn(apiClient, "createPurchaseOrder").mockResolvedValue(order);
    const orderLine = {
      id: "po-line-1",
      purchaseOrderId: "po-1",
      warehouseId: null,
      productId: "product-1",
      productVariantId: null,
      quantity: "10.0000",
      unitCost: "4.2500",
      lineTotal: "42.5000",
      createdAt: "2026-09-01T00:00:00.000Z",
    };
    // First fetch (modal opens, DRAFT order): no lines yet. Second fetch
    // (after confirm re-triggers the effect on the new order object): the
    // line just added, since the real backend would return it too.
    vi.spyOn(apiClient, "listPurchaseOrderLines").mockResolvedValueOnce([]).mockResolvedValue([orderLine]);
    const addPurchaseOrderLine = vi.spyOn(apiClient, "addPurchaseOrderLine").mockResolvedValue(orderLine);
    const confirmPurchaseOrder = vi.spyOn(apiClient, "confirmPurchaseOrder").mockResolvedValue({ ...order, status: "CONFIRMED" });
    vi.spyOn(apiClient, "listPurchaseReceipts").mockResolvedValue([]);
    const createPurchaseReceipt = vi.spyOn(apiClient, "createPurchaseReceipt").mockResolvedValue({
      id: "receipt-1",
      purchaseOrderId: "po-1",
      notes: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    });

    render(<PurchasingPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("button", { name: /Nueva orden/i }));
    const createModal = await screen.findByRole("dialog", { name: /Nueva orden de compra/i });
    await user.selectOptions(within(createModal).getByLabelText("Proveedor"), "supplier-1");
    await user.click(within(createModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createPurchaseOrder).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        supplierId: "supplier-1",
        currency: "USD",
      }),
    );

    await user.click(await screen.findByRole("button", { name: "Ver" }));
    const detailModal = await screen.findByRole("dialog", { name: /Orden de compra/i });
    await user.selectOptions(within(detailModal).getByLabelText("Producto"), "product-1");
    await user.type(within(detailModal).getByLabelText("Cantidad"), "10.0000");
    await user.click(within(detailModal).getByRole("button", { name: "Agregar línea" }));

    await waitFor(() =>
      expect(addPurchaseOrderLine).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "po-1", {
        productId: "product-1",
        productVariantId: undefined,
        warehouseId: undefined,
        quantity: "10.0000",
        unitCost: undefined,
      }),
    );

    await user.click(within(detailModal).getByRole("button", { name: /Confirmar/i }));
    await waitFor(() =>
      expect(confirmPurchaseOrder).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "po-1"),
    );

    // Receiving a partial quantity: pick the newly-added line, enter quantity, add to the list, submit.
    await user.selectOptions(within(detailModal).getByLabelText("Línea de la orden"), "po-line-1");
    await user.type(within(detailModal).getByLabelText("Cantidad recibida"), "6.0000");
    await user.click(within(detailModal).getByRole("button", { name: "Agregar a la lista" }));
    await user.click(within(detailModal).getByRole("button", { name: "Registrar recepción" }));

    await waitFor(() =>
      expect(createPurchaseReceipt).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        purchaseOrderId: "po-1",
        lines: [{ purchaseOrderLineId: "po-line-1", quantity: "6.0000" }],
      }),
    );
  }, 15_000);
});
