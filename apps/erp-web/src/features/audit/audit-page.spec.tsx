import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, type AuditEntryResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { AuditPage } from "./audit-page";

const authContext = vi.hoisted(() => ({
  session: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshExpiresAt: "2099-01-02T00:00:00.000Z",
    user: { id: "user-1", email: "owner@example.com", displayName: "Propietaria" },
  },
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
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

const entry: AuditEntryResponse = {
  id: "audit-1",
  userId: "user-1",
  tenantId: "tenant-1",
  companyId: "company-1",
  action: "configuration.setting.changed",
  resource: "setting",
  resourceId: "localization.locale",
  previousValues: { value: "en", source: "DEFAULT" },
  newValues: { value: "es-GT", scopeType: "COMPANY" },
  ipAddress: "127.0.0.1",
  userAgent: "Vitest",
  correlationId: "correlation-1",
  createdAt: "2026-08-27T19:40:23.000Z",
};

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

describe("AuditPage", () => {
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

  afterEach(() => vi.restoreAllMocks());

  it("loads tenant activity, changes the limit and exposes complete entry details", async () => {
    const user = userEvent.setup();
    const listEntries = vi.spyOn(apiClient, "listAuditEntries").mockResolvedValue([entry]);

    render(<AuditPage selection={selection} navigate={vi.fn()} />);

    expect(await screen.findByRole("cell", { name: /Ajuste modificado/ })).toBeVisible();
    expect(listEntries).toHaveBeenCalledWith(
      "access-token",
      "grupo-aurora",
      50,
      expect.any(AbortSignal),
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Registros mostrados" }), "100");
    await waitFor(() =>
      expect(listEntries).toHaveBeenLastCalledWith(
        "access-token",
        "grupo-aurora",
        100,
        expect.any(AbortSignal),
      ),
    );

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de configuration.setting.changed" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Ajuste modificado" });
    expect(within(dialog).getByText("correlation-1")).toBeVisible();
    expect(within(dialog).getByText(/"source": "DEFAULT"/)).toBeVisible();
    expect(within(dialog).getByText(/"scopeType": "COMPANY"/)).toBeVisible();
  });

  it("shows permission errors and can retry the real tenant-scoped request", async () => {
    const user = userEvent.setup();
    const listEntries = vi
      .spyOn(apiClient, "listAuditEntries")
      .mockRejectedValueOnce(
        new ApiError({ statusCode: 403, code: "PERMISSION_DENIED", message: "Denied" }),
      )
      .mockResolvedValueOnce([]);

    render(<AuditPage selection={selection} navigate={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tienes permiso para realizar esta acción.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("No hay actividad registrada")).toBeVisible();
    expect(listEntries).toHaveBeenCalledTimes(2);
  });
});
