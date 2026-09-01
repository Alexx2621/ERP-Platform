import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { TenantListPage } from "./tenant-list-page";

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

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

const tenant = { tenantId: "tenant-1", slug: "grupo-aurora", name: "Grupo Aurora", membershipId: "membership-1" };

describe("TenantListPage", () => {
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

  it("auto-selects the tenant's single company without prompting", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTenants").mockResolvedValue([tenant]);
    vi.spyOn(apiClient, "listPendingInvitations").mockResolvedValue([]);
    vi.spyOn(apiClient, "listCompanies").mockResolvedValue([{ id: "company-1", code: "CO1", name: "Empresa Única" }]);
    const getTenantContext = vi.spyOn(apiClient, "getTenantContext").mockResolvedValue({
      tenantId: "tenant-1",
      membershipId: "membership-1",
      companyId: "company-1",
    });
    const navigate = vi.fn();
    const onSelect = vi.fn();

    render(<TenantListPage navigate={navigate} onSelect={onSelect} />);

    await user.click(await screen.findByRole("button", { name: /Grupo Aurora/ }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ ...tenant, companyId: "company-1" }));
    expect(getTenantContext).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1");
    expect(navigate).toHaveBeenCalledWith("/workspace");
  });

  it("proceeds with no company selected when the tenant has none yet", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTenants").mockResolvedValue([tenant]);
    vi.spyOn(apiClient, "listPendingInvitations").mockResolvedValue([]);
    vi.spyOn(apiClient, "listCompanies").mockResolvedValue([]);
    const getTenantContext = vi.spyOn(apiClient, "getTenantContext");
    const navigate = vi.fn();
    const onSelect = vi.fn();

    render(<TenantListPage navigate={navigate} onSelect={onSelect} />);

    await user.click(await screen.findByRole("button", { name: /Grupo Aurora/ }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ ...tenant, companyId: undefined }));
    expect(getTenantContext).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/workspace");
  });

  it("prompts a picker when the tenant has several companies, and resolves the chosen one", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listTenants").mockResolvedValue([tenant]);
    vi.spyOn(apiClient, "listPendingInvitations").mockResolvedValue([]);
    vi.spyOn(apiClient, "listCompanies").mockResolvedValue([
      { id: "company-1", code: "CO1", name: "Empresa Norte" },
      { id: "company-2", code: "CO2", name: "Empresa Sur" },
    ]);
    const getTenantContext = vi.spyOn(apiClient, "getTenantContext").mockResolvedValue({
      tenantId: "tenant-1",
      membershipId: "membership-1",
      companyId: "company-2",
    });
    const navigate = vi.fn();
    const onSelect = vi.fn();

    render(<TenantListPage navigate={navigate} onSelect={onSelect} />);

    await user.click(await screen.findByRole("button", { name: /Grupo Aurora/ }));

    const dialog = await screen.findByRole("dialog", { name: "Elige una empresa" });
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(await within(dialog).findByRole("button", { name: /Empresa Sur/ }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ ...tenant, companyId: "company-2" }));
    expect(getTenantContext).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-2");
    expect(navigate).toHaveBeenCalledWith("/workspace");
  });
});
