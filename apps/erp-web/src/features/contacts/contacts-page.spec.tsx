import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { ContactsPage } from "./contacts-page";

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

describe("ContactsPage", () => {
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
    render(<ContactsPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar los contactos."),
    ).toBeInTheDocument();
  });

  it("lists customers and creates a new one", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
    vi.spyOn(apiClient, "listSuppliers").mockResolvedValue([]);
    const createCustomer = vi.spyOn(apiClient, "createCustomer").mockResolvedValue({
      id: "c1",
      code: "CUST-01",
      name: "Acme Corp",
      legalName: null,
      taxId: null,
      email: null,
      phone: null,
      addressLine: null,
      city: null,
      country: null,
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    render(<ContactsPage selection={selection} navigate={navigate} />);

    await screen.findByText("Todavía no hay clientes");
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nuevo cliente" }));
    await user.type(dialog.getByLabelText("Código"), "CUST-01");
    await user.type(dialog.getByLabelText("Nombre"), "Acme Corp");
    await user.click(dialog.getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createCustomer).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        code: "CUST-01",
        name: "Acme Corp",
        legalName: undefined,
        taxId: undefined,
        email: undefined,
        phone: undefined,
        addressLine: undefined,
        city: undefined,
        country: undefined,
      }),
    );
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
  });

  it("lists suppliers on the Proveedores tab", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listCustomers").mockResolvedValue([]);
    vi.spyOn(apiClient, "listSuppliers").mockResolvedValue([
      {
        id: "s1",
        code: "SUPP-01",
        name: "Textiles del Norte",
        legalName: null,
        taxId: "TAX-1",
        email: null,
        phone: null,
        addressLine: null,
        city: null,
        country: null,
        status: "ACTIVE",
        createdAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z",
      },
    ]);

    render(<ContactsPage selection={selection} navigate={navigate} />);

    await user.click(screen.getByRole("tab", { name: "Proveedores" }));
    expect(await screen.findByText("Textiles del Norte")).toBeInTheDocument();
    expect(screen.getByText("TAX-1")).toBeInTheDocument();
  });
});
