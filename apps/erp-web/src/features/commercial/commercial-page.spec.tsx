import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { CommercialPage } from "./commercial-page";

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

describe("CommercialPage", () => {
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
    render(<CommercialPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar impuestos, bodegas y precios."),
    ).toBeInTheDocument();
  });

  it("lists taxes and creates a new one", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPriceLists").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    const createTax = vi.spyOn(apiClient, "createTax").mockResolvedValue({
      id: "tax-1",
      code: "IVA",
      name: "IVA",
      rate: "12.0000",
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    render(<CommercialPage selection={selection} navigate={navigate} />);

    await screen.findByText("Todavía no hay impuestos");
    await user.click(screen.getByRole("button", { name: "Nuevo impuesto" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nuevo impuesto" }));
    await user.type(dialog.getByLabelText("Código"), "IVA");
    await user.type(dialog.getByLabelText("Nombre"), "IVA");
    // FormField renders its `hint` inside the same <label> as the input, so
    // the accessible name is "Tasa (%)" concatenated with the hint text —
    // an exact match on the label alone doesn't find it.
    await user.type(dialog.getByLabelText("Tasa (%)", { exact: false }), "12.0000");
    await user.click(dialog.getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createTax).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        code: "IVA",
        name: "IVA",
        rate: "12.0000",
      }),
    );
    expect(await screen.findByText("12.0000%")).toBeInTheDocument();
  });

  it("lists warehouses on the Bodegas tab", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([
      {
        id: "wh-1",
        code: "WH-01",
        name: "Bodega Central",
        addressLine: null,
        city: "Ciudad",
        country: null,
        status: "ACTIVE",
        createdAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z",
      },
    ]);
    vi.spyOn(apiClient, "listPriceLists").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);

    render(<CommercialPage selection={selection} navigate={navigate} />);

    await user.click(screen.getByRole("tab", { name: "Bodegas" }));
    await screen.findByText("Bodega Central");
    // Scoped to the row — "Ciudad" also appears as the column header and
    // (Tabs keeps every panel mounted) as the create-modal's field label.
    const row = screen.getByRole("row", { name: /Bodega Central/ });
    expect(within(row).getByText("Ciudad")).toBeInTheDocument();
  });

  it("creates a price list and adds a product's price to it", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTaxes").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listPriceLists").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([
      {
        id: "product-1",
        categoryId: null,
        brandId: null,
        unitOfMeasureId: "unit-1",
        code: "SKU-1",
        name: "Camisa",
        description: null,
        type: "PHYSICAL_GOOD",
        trackInventory: true,
        sellable: true,
        purchasable: true,
        hasVariants: false,
        publishOnline: false,
        barcode: null,
        basePrice: "19.9900",
        baseCost: null,
        status: "ACTIVE",
        createdAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z",
      },
    ]);
    const createPriceList = vi.spyOn(apiClient, "createPriceList").mockResolvedValue({
      id: "pl-1",
      code: "WHOLESALE",
      name: "Mayoreo",
      currency: "USD",
      validFrom: null,
      validUntil: null,
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
    const addPriceListItem = vi.spyOn(apiClient, "addPriceListItem").mockResolvedValue({
      id: "item-1",
      priceListId: "pl-1",
      productId: "product-1",
      price: "24.9900",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
    vi.spyOn(apiClient, "listPriceListItems").mockResolvedValue([]);

    render(<CommercialPage selection={selection} navigate={navigate} />);

    await user.click(screen.getByRole("tab", { name: "Precios" }));
    await screen.findByText("Todavía no hay listas de precios");
    await user.click(screen.getByRole("button", { name: "Nueva lista de precios" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nueva lista de precios" }));
    await user.type(dialog.getByLabelText("Código"), "WHOLESALE");
    await user.type(dialog.getByLabelText("Nombre"), "Mayoreo");
    await user.click(dialog.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(createPriceList).toHaveBeenCalled());
    const priceListRow = await screen.findByRole("row", { name: /^WHOLESALE\s+Mayoreo\b/ });

    await user.click(within(priceListRow).getByRole("button", { name: "Precios" }));
    const itemsDialog = within(screen.getByRole("dialog", { name: "Precios de Mayoreo" }));
    await screen.findByText("Todavía no hay productos en esta lista");
    await user.selectOptions(itemsDialog.getByLabelText("Producto"), "product-1");
    await user.type(itemsDialog.getByLabelText("Precio"), "24.9900");
    await user.click(itemsDialog.getByRole("button", { name: "Agregar" }));

    await waitFor(() =>
      expect(addPriceListItem).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "pl-1", {
        productId: "product-1",
        price: "24.9900",
      }),
    );
  });
});
