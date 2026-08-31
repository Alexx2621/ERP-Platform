import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { InventoryPage } from "./inventory-page";

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

const warehouse1 = {
  id: "wh-1",
  code: "WH-01",
  name: "Bodega Central",
  addressLine: null,
  city: null,
  country: null,
  status: "ACTIVE" as const,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const warehouse2 = { ...warehouse1, id: "wh-2", code: "WH-02", name: "Bodega Norte" };

const product = {
  id: "product-1",
  categoryId: null,
  brandId: null,
  unitOfMeasureId: "unit-1",
  code: "SKU-1",
  name: "Producto Rastreado",
  description: null,
  type: "PHYSICAL_GOOD" as const,
  trackInventory: true,
  sellable: true,
  purchasable: true,
  hasVariants: false,
  publishOnline: false,
  barcode: null,
  basePrice: "10.0000",
  baseCost: null,
  status: "ACTIVE" as const,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

function mockCommonLists() {
  vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([warehouse1, warehouse2]);
  vi.spyOn(apiClient, "listProducts").mockResolvedValue([product]);
}

describe("InventoryPage", () => {
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
    render(<InventoryPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar el inventario."),
    ).toBeInTheDocument();
  });

  it("lists balances and registers a receipt via the movement modal", async () => {
    const user = userEvent.setup();
    mockCommonLists();
    vi.spyOn(apiClient, "listInventoryBalances").mockResolvedValue([]);
    const recordInventoryReceipt = vi.spyOn(apiClient, "recordInventoryReceipt").mockResolvedValue({
      id: "mov-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      type: "RECEIPT",
      quantity: "50.0000",
      reason: null,
      referenceType: "MANUAL",
      referenceId: null,
      correlationId: "corr-1",
      createdByUserId: "user-1",
      createdAt: "2026-08-31T00:00:00.000Z",
    });

    render(<InventoryPage selection={selection} navigate={navigate} />);

    await screen.findByText("Todavía no hay existencias registradas");
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));
    const dialog = within(screen.getByRole("dialog", { name: "Registrar movimiento" }));
    await user.selectOptions(dialog.getByLabelText("Bodega"), "wh-1");
    await user.selectOptions(dialog.getByLabelText("Producto"), "product-1");
    await user.type(dialog.getByLabelText("Cantidad"), "50.0000");
    await user.click(dialog.getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(recordInventoryReceipt).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        warehouseId: "wh-1",
        productId: "product-1",
        productVariantId: undefined,
        quantity: "50.0000",
        reason: undefined,
      }),
    );
  });

  it("creates a reservation and releases it", async () => {
    const user = userEvent.setup();
    mockCommonLists();
    vi.spyOn(apiClient, "listInventoryReservations").mockResolvedValue([]);
    const createReservation = vi.spyOn(apiClient, "createInventoryReservation").mockResolvedValue({
      id: "res-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      quantity: "10.0000",
      status: "ACTIVE",
      referenceType: null,
      referenceId: null,
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      releasedAt: null,
    });
    const releaseReservation = vi.spyOn(apiClient, "releaseInventoryReservation").mockResolvedValue({
      id: "res-1",
      warehouseId: "wh-1",
      productId: "product-1",
      productVariantId: null,
      quantity: "10.0000",
      status: "RELEASED",
      referenceType: null,
      referenceId: null,
      version: 2,
      createdAt: "2026-08-31T00:00:00.000Z",
      releasedAt: "2026-08-31T01:00:00.000Z",
    });

    render(<InventoryPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("tab", { name: "Reservas" }));
    await screen.findByText("Todavía no hay reservas");
    await user.click(screen.getByRole("button", { name: "Nueva reserva" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nueva reserva" }));
    await user.selectOptions(dialog.getByLabelText("Bodega"), "wh-1");
    await user.selectOptions(dialog.getByLabelText("Producto"), "product-1");
    await user.type(dialog.getByLabelText("Cantidad"), "10.0000");
    await user.click(dialog.getByRole("button", { name: "Reservar" }));

    await waitFor(() => expect(createReservation).toHaveBeenCalled());
    const row = await screen.findByRole("row", { name: /Bodega Central/ });
    await user.click(within(row).getByRole("button", { name: "Liberar" }));

    await waitFor(() =>
      expect(releaseReservation).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "res-1"),
    );
  });

  it("creates a transfer between two warehouses and completes it", async () => {
    const user = userEvent.setup();
    mockCommonLists();
    vi.spyOn(apiClient, "listInventoryTransfers").mockResolvedValue([]);
    const createTransfer = vi.spyOn(apiClient, "createInventoryTransfer").mockResolvedValue({
      id: "transfer-1",
      productId: "product-1",
      productVariantId: null,
      sourceWarehouseId: "wh-1",
      destinationWarehouseId: "wh-2",
      quantity: "15.0000",
      status: "IN_TRANSIT",
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z",
      completedAt: null,
      cancelledAt: null,
    });
    const completeTransfer = vi.spyOn(apiClient, "completeInventoryTransfer").mockResolvedValue({
      id: "transfer-1",
      productId: "product-1",
      productVariantId: null,
      sourceWarehouseId: "wh-1",
      destinationWarehouseId: "wh-2",
      quantity: "15.0000",
      status: "COMPLETED",
      version: 2,
      createdAt: "2026-08-31T00:00:00.000Z",
      completedAt: "2026-08-31T01:00:00.000Z",
      cancelledAt: null,
    });

    render(<InventoryPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("tab", { name: "Transferencias" }));
    await screen.findByText("Todavía no hay transferencias");
    await user.click(screen.getByRole("button", { name: "Nueva transferencia" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nueva transferencia" }));
    await user.selectOptions(dialog.getByLabelText("Bodega de origen"), "wh-1");
    await user.selectOptions(dialog.getByLabelText("Bodega de destino"), "wh-2");
    await user.selectOptions(dialog.getByLabelText("Producto"), "product-1");
    await user.type(dialog.getByLabelText("Cantidad"), "15.0000");
    await user.click(dialog.getByRole("button", { name: "Crear transferencia" }));

    await waitFor(() =>
      expect(createTransfer).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        productId: "product-1",
        productVariantId: undefined,
        sourceWarehouseId: "wh-1",
        destinationWarehouseId: "wh-2",
        quantity: "15.0000",
      }),
    );
    const row = await screen.findByRole("row", { name: /Producto Rastreado/ });
    await user.click(within(row).getByRole("button", { name: "Completar" }));

    await waitFor(() =>
      expect(completeTransfer).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "transfer-1"),
    );
  });
});
