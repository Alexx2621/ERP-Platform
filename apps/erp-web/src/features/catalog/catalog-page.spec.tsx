import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { CatalogPage } from "./catalog-page";

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

describe("CatalogPage", () => {
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
    render(<CatalogPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(
      screen.getByText("Selecciona una empresa desde el selector de tenant para administrar el catálogo."),
    ).toBeInTheDocument();
  });

  it("lists units of measure and creates a new one", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listUnitsOfMeasure").mockResolvedValue([]);
    vi.spyOn(apiClient, "listCategories").mockResolvedValue([]);
    vi.spyOn(apiClient, "listBrands").mockResolvedValue([]);
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([]);
    const createUnitOfMeasure = vi.spyOn(apiClient, "createUnitOfMeasure").mockResolvedValue({
      id: "u1",
      code: "UN",
      name: "Unidad",
      symbol: "u",
      status: "ACTIVE",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    render(<CatalogPage selection={selection} navigate={navigate} />);

    await screen.findByText("Todavía no hay unidades de medida");
    await user.click(screen.getByRole("button", { name: "Nueva unidad de medida" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nueva unidad de medida" }));
    await user.type(dialog.getByLabelText("Código"), "UN");
    await user.type(dialog.getByLabelText("Nombre"), "Unidad");
    await user.type(dialog.getByLabelText("Símbolo"), "u");
    await user.click(dialog.getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createUnitOfMeasure).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        code: "UN",
        name: "Unidad",
        symbol: "u",
      }),
    );
    expect(await screen.findByText("Unidad")).toBeInTheDocument();
  });
});
