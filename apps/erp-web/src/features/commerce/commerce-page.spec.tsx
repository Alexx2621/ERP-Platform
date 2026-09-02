import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { CommercePage } from "./commerce-page";

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
  purchasable: true,
  hasVariants: false,
  publishOnline: false,
  barcode: null,
  basePrice: "25.0000",
  baseCost: null,
  status: "ACTIVE" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const storefront = {
  id: "storefront-1",
  code: "main-store",
  name: "Tienda principal",
  domain: null,
  currency: "USD",
  defaultWarehouseId: null,
  status: "ACTIVE" as const,
  version: 1,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("CommercePage", () => {
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
    render(<CommercePage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar el comercio en línea."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the company has no storefronts yet", async () => {
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listStorefronts").mockResolvedValue([]);

    render(<CommercePage selection={selection} navigate={navigate} />);

    await waitFor(() => expect(screen.getByText("Todavía no hay tiendas en línea")).toBeInTheDocument());
  });

  it("creates a storefront and publishes a product to it", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([product]);
    vi.spyOn(apiClient, "listWarehouses").mockResolvedValue([]);
    vi.spyOn(apiClient, "listStorefronts").mockResolvedValue([]);
    const createStorefront = vi.spyOn(apiClient, "createStorefront").mockResolvedValue(storefront);
    vi.spyOn(apiClient, "listStorefrontProducts").mockResolvedValue([]);
    const publishProduct = vi.spyOn(apiClient, "publishProduct").mockResolvedValue({
      id: "sp-1",
      productId: "product-1",
      productCode: "SKU-1",
      productName: "Producto 1",
      status: "PUBLISHED",
      publishedAt: "2026-09-02T00:00:00.000Z",
    });

    render(<CommercePage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("button", { name: "Nueva tienda" }));
    const createModal = await screen.findByRole("dialog", { name: "Nueva tienda" });
    await user.type(within(createModal).getByLabelText(/Handle público/), "main-store");
    await user.type(within(createModal).getByLabelText("Nombre"), "Tienda principal");
    await user.click(within(createModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createStorefront).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        code: "main-store",
        name: "Tienda principal",
        currency: "USD",
        defaultWarehouseId: undefined,
      }),
    );

    await user.click(await screen.findByRole("button", { name: "Catálogo" }));
    const detailModal = await screen.findByRole("dialog", { name: /Catálogo publicado/i });
    await user.selectOptions(within(detailModal).getByLabelText("Producto"), "product-1");
    await user.click(within(detailModal).getByRole("button", { name: "Publicar" }));

    await waitFor(() =>
      expect(publishProduct).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "storefront-1", { productId: "product-1" }),
    );
  }, 15_000);
});
