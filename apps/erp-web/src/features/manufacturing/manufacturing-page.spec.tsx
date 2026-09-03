import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { ManufacturingPage } from "./manufacturing-page";

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

function buildProduct(id: string, code: string, name: string) {
  return {
    id,
    companyId: "company-1",
    categoryId: null,
    brandId: null,
    unitOfMeasureId: "unit-1",
    code,
    name,
    description: null,
    type: "PHYSICAL_GOOD" as const,
    trackInventory: true,
    sellable: false,
    purchasable: false,
    hasVariants: false,
    publishOnline: false,
    barcode: null,
    basePrice: null,
    baseCost: null,
    status: "ACTIVE" as const,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  };
}

const finishedGood = buildProduct("product-chair", "SKU-CHAIR", "Silla de madera");
const component = buildProduct("product-wood", "SKU-WOOD", "Tabla de madera");

const warehouse = {
  id: "warehouse-1",
  companyId: "company-1",
  code: "WH-1",
  name: "Bodega 1",
  addressLine: null,
  city: null,
  country: null,
  status: "ACTIVE" as const,
  version: 1,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

const bom = {
  id: "bom-1",
  productId: "product-chair",
  code: "BOM-CHAIR",
  name: "Silla de madera",
  version: 1,
  status: "ACTIVE" as const,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

const order = {
  id: "order-1",
  billOfMaterialId: "bom-1",
  productId: "product-chair",
  warehouseId: "warehouse-1",
  quantityPlanned: "10.0000",
  quantityCompleted: "0.0000",
  status: "DRAFT" as const,
  version: 1,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
  confirmedAt: null,
  closedAt: null,
  cancelledAt: null,
};

const material = {
  id: "material-1",
  productionOrderId: "order-1",
  componentProductId: "product-wood",
  componentVariantId: null,
  quantityRequired: "20.0000",
  quantityIssuedNet: "0.0000",
  createdAt: "2026-09-03T00:00:00.000Z",
};

describe("ManufacturingPage", () => {
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
    render(<ManufacturingPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(screen.getByText("Selecciona una empresa desde el selector de tenant para administrar manufactura.")).toBeInTheDocument();
  });

  it("creates a bill of material with a component, then a production order, confirms it, issues material, and records finished goods", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listBillsOfMaterial").mockResolvedValueOnce([]).mockResolvedValue([bom]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([finishedGood, component]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([warehouse]);
    const createBillOfMaterial = vi.spyOn(apiClient, "createBillOfMaterial").mockResolvedValue(bom);
    vi.spyOn(apiClient, "listProductionOrders").mockResolvedValue([]);
    const createProductionOrder = vi.spyOn(apiClient, "createProductionOrder").mockResolvedValue(order);
    vi.spyOn(apiClient, "listProductionOrderMaterials").mockResolvedValue([material]);
    vi.spyOn(apiClient, "listProductionOrderOperations").mockResolvedValue([]);
    const confirmProductionOrder = vi.spyOn(apiClient, "confirmProductionOrder").mockResolvedValue({ ...order, status: "CONFIRMED" });
    const issueProductionOrderMaterial = vi.spyOn(apiClient, "issueProductionOrderMaterial").mockResolvedValue({
      id: "movement-1",
      productionOrderMaterialId: "material-1",
      type: "ISSUE",
      quantity: "4.0000",
      createdAt: "2026-09-03T00:00:00.000Z",
    });
    vi.spyOn(apiClient, "listProductionOrderFinishedGoodsReceipts").mockResolvedValue([]);
    const recordFinishedGoods = vi.spyOn(apiClient, "recordFinishedGoods").mockResolvedValue({
      id: "receipt-1",
      productionOrderId: "order-1",
      quantity: "3.0000",
      createdAt: "2026-09-03T00:00:00.000Z",
    });
    vi.spyOn(apiClient, "getProductionOrder").mockResolvedValue({ ...order, status: "CONFIRMED", quantityCompleted: "3.0000" });
    vi.spyOn(apiClient, "listProductVariants").mockResolvedValue([]);

    render(<ManufacturingPage selection={selection} navigate={navigate} />);

    // --- Listas de materiales: create a BOM with one component ---
    await user.click(await screen.findByRole("button", { name: /Nueva lista de materiales/i }));
    const bomModal = await screen.findByRole("dialog", { name: "Nueva lista de materiales" });
    await user.type(within(bomModal).getByLabelText("Código"), "BOM-CHAIR");
    await user.type(within(bomModal).getByLabelText("Nombre"), "Silla de madera");
    await user.selectOptions(within(bomModal).getByLabelText("Producto terminado"), "product-chair");
    await user.selectOptions(within(bomModal).getByLabelText("Componente"), "product-wood");
    await user.type(within(bomModal).getByLabelText("Cantidad por unidad"), "2.0000");
    await user.click(within(bomModal).getByRole("button", { name: "Agregar componente" }));
    await user.click(within(bomModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createBillOfMaterial).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        productId: "product-chair",
        code: "BOM-CHAIR",
        name: "Silla de madera",
        components: [{ componentProductId: "product-wood", componentVariantId: undefined, quantityPerUnit: "2.0000" }],
      }),
    );

    // --- Órdenes de producción: create an order against the (now real) BOM ---
    await user.click(screen.getByRole("tab", { name: /Órdenes de producción/i }));
    await user.click(await screen.findByRole("button", { name: /Nueva orden/i }));
    const orderModal = await screen.findByRole("dialog", { name: "Nueva orden de producción" });
    await user.selectOptions(within(orderModal).getByLabelText("Lista de materiales"), "bom-1");
    await user.selectOptions(within(orderModal).getByLabelText("Bodega"), "warehouse-1");
    await user.type(within(orderModal).getByLabelText("Cantidad a producir"), "10.0000");
    await user.click(within(orderModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createProductionOrder).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        billOfMaterialId: "bom-1",
        warehouseId: "warehouse-1",
        quantityPlanned: "10.0000",
      }),
    );

    // --- Detail: confirm the order ---
    await user.click(await screen.findByRole("button", { name: "Ver" }));
    const detailModal = await screen.findByRole("dialog", { name: /Orden de producción/i });
    await user.click(within(detailModal).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(confirmProductionOrder).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "order-1"));

    // --- Issue material against the now-CONFIRMED order ---
    await user.selectOptions(within(detailModal).getByLabelText("Material"), "material-1");
    await user.type(within(detailModal).getByLabelText("Cantidad"), "4.0000");
    await user.click(within(detailModal).getByRole("button", { name: "Emitir" }));
    await waitFor(() =>
      expect(issueProductionOrderMaterial).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "order-1", {
        productionOrderMaterialId: "material-1",
        quantity: "4.0000",
      }),
    );

    // --- Record a partial finished-goods receipt ---
    await user.type(within(detailModal).getByLabelText("Cantidad recibida"), "3.0000");
    await user.click(within(detailModal).getByRole("button", { name: "Registrar recepción" }));
    await waitFor(() =>
      expect(recordFinishedGoods).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "order-1", { quantity: "3.0000" }),
    );
  }, 20_000);
});
