import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { CommandPalette } from "./command-palette";

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

const selection = { slug: "grupo-aurora", companyId: "company-1" };

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

describe("CommandPalette", () => {
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

  it("opens via the visible trigger and lists every module with no query typed", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<CommandPalette selection={selection} navigate={navigate} isPlatformAdmin={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));

    expect(await screen.findByRole("option", { name: /Workspace/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Ventas/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Manufactura/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Plataforma/ })).not.toBeInTheDocument();
  });

  it("opens on Ctrl+K and navigates to the module selected", async () => {
    const navigate = vi.fn();
    render(<CommandPalette selection={selection} navigate={navigate} isPlatformAdmin={false} />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const salesOption = await screen.findByRole("option", { name: /Ventas/ });
    fireEvent.click(salesOption);

    expect(navigate).toHaveBeenCalledWith("/sales");
    expect(closeModalMock).toHaveBeenCalled();
  });

  it("includes Plataforma only for a platform admin", async () => {
    const user = userEvent.setup();
    render(<CommandPalette selection={selection} navigate={vi.fn()} isPlatformAdmin />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));

    expect(await screen.findByRole("option", { name: /Plataforma/ })).toBeInTheDocument();
  });

  it("surfaces a module via a keyword alias, not just its own label", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
    render(<CommandPalette selection={selection} navigate={vi.fn()} isPlatformAdmin={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));
    await user.type(screen.getByRole("combobox"), "productos");

    expect(await screen.findByRole("option", { name: /Catálogo/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Ventas/ })).not.toBeInTheDocument();
  });

  it("does not fetch products/customers until the user actually types a query", async () => {
    const user = userEvent.setup();
    const listProducts = vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    const listCustomers = vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
    render(<CommandPalette selection={selection} navigate={vi.fn()} isPlatformAdmin={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));
    await screen.findByRole("option", { name: /Workspace/ });

    expect(listProducts).not.toHaveBeenCalled();
    expect(listCustomers).not.toHaveBeenCalled();
  });

  it("searches real products and customers by name once the user types, and navigates to their module", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([
      {
        id: "product-1",
        categoryId: null,
        brandId: null,
        unitOfMeasureId: "unit-1",
        code: "SKU-001",
        name: "Camisa Azul",
        description: null,
        type: "PHYSICAL_GOOD",
        trackInventory: true,
        sellable: true,
        purchasable: true,
        hasVariants: false,
        publishOnline: false,
        barcode: null,
        basePrice: "10.0000",
        baseCost: null,
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([
      {
        id: "customer-1",
        code: "CUST-001",
        name: "Comercial Azul S.A.",
        legalName: null,
        taxId: null,
        email: null,
        phone: null,
        addressLine: null,
        city: null,
        country: null,
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    render(<CommandPalette selection={selection} navigate={navigate} isPlatformAdmin={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));
    await user.type(screen.getByRole("combobox"), "azu");

    await waitFor(() =>
      expect(apiClient.listProducts).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1"),
    );

    const productOption = await screen.findByRole("option", { name: /Camisa Azul/ });
    expect(productOption).toHaveTextContent("Producto");
    const customerOption = screen.getByRole("option", { name: /Comercial Azul/ });
    expect(customerOption).toHaveTextContent("Cliente");

    await user.click(customerOption);
    expect(navigate).toHaveBeenCalledWith("/contacts");
  });

  it("supports arrow-key navigation and Enter to select the active result", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<CommandPalette selection={selection} navigate={navigate} isPlatformAdmin={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));
    await screen.findByRole("option", { name: /Workspace/ });

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without navigating", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<CommandPalette selection={selection} navigate={navigate} isPlatformAdmin={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir buscador (Ctrl+K)" }));
    const dialog = await screen.findByRole("option", { name: /Workspace/ }).then(() =>
      document.querySelector("dialog"),
    );

    fireEvent(dialog as Element, new Event("cancel", { cancelable: true }));

    expect(closeModalMock).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
