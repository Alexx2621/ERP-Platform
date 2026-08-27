import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { RolesPermissionsPage } from "./roles-permissions-page";

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

const selection = {
  tenantId: "tenant-1",
  slug: "grupo-aurora",
  name: "Grupo Aurora",
  membershipId: "membership-1",
  companyId: "company-1",
};

const ownerRole = {
  id: "role-owner",
  name: "Owner",
  isSystem: true,
  permissionKeys: ["access.roles.read", "access.roles.manage", "access.permissions.read"],
};

const permissions = [
  { key: "access.roles.read", description: "List roles in the active tenant." },
  { key: "access.roles.manage", description: "Create and assign tenant roles." },
  { key: "access.permissions.read", description: "List the permission catalog." },
];

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

describe("RolesPermissionsPage", () => {
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

  it("loads both catalogs, creates a role and assigns it with the documented payload", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listRoles").mockResolvedValue([ownerRole]);
    vi.spyOn(apiClient, "listPermissions").mockResolvedValue(permissions);
    const createdRole = {
      id: "role-supervisor",
      name: "Supervisor",
      isSystem: false,
      permissionKeys: ["access.roles.read"],
    };
    const createRole = vi.spyOn(apiClient, "createRole").mockResolvedValue(createdRole);
    const assignRole = vi.spyOn(apiClient, "assignRole").mockResolvedValue({
      id: "assignment-1",
      membershipId: "membership-1",
      roleId: "role-supervisor",
      scopeType: "COMPANY",
      scopeId: "company-1",
    });

    render(<RolesPermissionsPage selection={selection} navigate={vi.fn()} />);

    expect(await screen.findByRole("cell", { name: "Owner" })).toBeInTheDocument();
    expect(apiClient.listRoles).toHaveBeenCalledWith(
      "access-token",
      "grupo-aurora",
      expect.any(AbortSignal),
    );
    expect(apiClient.listPermissions).toHaveBeenCalledWith(
      "access-token",
      "grupo-aurora",
      expect.any(AbortSignal),
    );

    await user.click(screen.getByRole("tab", { name: "Permisos" }));
    expect(screen.getByRole("table", { name: "Catálogo global de permisos" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "access.permissions.read" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Roles" }));
    const createButton = screen.getByRole("button", { name: "Crear rol" });
    await waitFor(() => expect(createButton).toBeEnabled());
    await user.click(createButton);
    expect(await screen.findByRole("dialog", { name: "Crear rol" })).toBeVisible();
    await user.type(screen.getByLabelText(/Nombre del rol/), "Supervisor");
    await user.click(screen.getByRole("checkbox", { name: /access\.roles\.read/ }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Crear rol" })).getByRole("button", {
        name: "Crear rol",
      }),
    );

    expect(createRole).toHaveBeenCalledWith("access-token", "grupo-aurora", {
      name: "Supervisor",
      permissionKeys: ["access.roles.read"],
    });
    expect(await screen.findByRole("cell", { name: "Supervisor" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("El rol Supervisor fue creado.");

    await user.click(screen.getByRole("button", { name: "Asignar rol Supervisor" }));
    expect(screen.getByLabelText(/ID de membresía/)).toHaveValue("membership-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Alcance" }), "COMPANY");
    expect(screen.getByLabelText(/ID de empresa/)).toHaveValue("company-1");
    await user.click(
      within(screen.getByRole("dialog", { name: "Asignar Supervisor" })).getByRole("button", {
        name: "Asignar rol",
      }),
    );

    expect(assignRole).toHaveBeenCalledWith("access-token", "grupo-aurora", "role-supervisor", {
      membershipId: "membership-1",
      scopeType: "COMPANY",
      scopeId: "company-1",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "El rol fue asignado a la membresía membership-1 con alcance COMPANY.",
    );
  }, 10_000);

  it("keeps readable roles available when permission catalog access is denied", async () => {
    vi.spyOn(apiClient, "listRoles").mockResolvedValue([ownerRole]);
    vi.spyOn(apiClient, "listPermissions").mockRejectedValue(
      new ApiError({
        statusCode: 403,
        code: "PERMISSION_DENIED",
        message: "Permission denied",
      }),
    );

    render(<RolesPermissionsPage selection={selection} navigate={vi.fn()} />);

    expect(await screen.findByRole("cell", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear rol" })).toBeDisabled();
    await userEvent.click(screen.getByRole("tab", { name: "Permisos" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No tienes permiso para realizar esta acción.",
    );
  });
});
