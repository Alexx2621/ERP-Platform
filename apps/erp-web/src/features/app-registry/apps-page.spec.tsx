import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { AppsPage } from "./apps-page";

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

const navigate = vi.fn();

describe("AppsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an honest empty state against an empty catalog", async () => {
    vi.spyOn(apiClient, "listTenantApps").mockResolvedValue([]);

    render(<AppsPage selection={selection} navigate={navigate} />);

    expect(await screen.findByText("Todavía no hay apps en el catálogo")).toBeInTheDocument();
  });

  it("lists apps and toggles enablement using the documented endpoints", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTenantApps").mockResolvedValue([
      {
        key: "products",
        name: "Products",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: [],
        status: "DISABLED",
      },
    ]);
    const enableApp = vi.spyOn(apiClient, "enableApp").mockResolvedValue({
      key: "products",
      name: "Products",
      version: "1.0.0",
      kind: "BUSINESS_APP",
      dependsOnKeys: [],
      status: "ENABLED",
    });

    render(<AppsPage selection={selection} navigate={navigate} />);

    await screen.findByText("Products");
    expect(screen.getByText("Deshabilitada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Habilitar Products" }));

    await waitFor(() => expect(enableApp).toHaveBeenCalledWith("access-token", "grupo-aurora", "products"));
    expect(await screen.findByText("Habilitada")).toBeInTheDocument();
  });

  it("surfaces a dependency error from the backend without crashing", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTenantApps").mockResolvedValue([
      {
        key: "manufacturing",
        name: "Manufacturing",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: ["products"],
        status: "DISABLED",
      },
    ]);
    vi.spyOn(apiClient, "enableApp").mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "APP_DEPENDENCY_NOT_SATISFIED",
        message: "Missing required, enabled dependencies: products.",
      }),
    );

    render(<AppsPage selection={selection} navigate={navigate} />);

    await user.click(await screen.findByRole("button", { name: "Habilitar Manufacturing" }));

    expect(await screen.findByText("Missing required, enabled dependencies: products.")).toBeInTheDocument();
  });
});
