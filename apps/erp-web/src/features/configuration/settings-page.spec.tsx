import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, type SettingDefinitionResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { SettingsPage } from "./settings-page";

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

const definitions: SettingDefinitionResponse[] = [
  {
    key: "localization.locale",
    dataType: "STRING" as const,
    description: "BCP 47 language tag.",
    defaultValue: "en",
    allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
  },
];

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

describe("SettingsPage", () => {
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

  it("loads the catalog and effective values, then writes a company override", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listSettingDefinitions").mockResolvedValue([...definitions]);
    vi.spyOn(apiClient, "listEffectiveSettings")
      .mockResolvedValueOnce([{ key: "localization.locale", value: "en", source: "DEFAULT" }])
      .mockResolvedValueOnce([{ key: "localization.locale", value: "es-GT", source: "COMPANY" }]);
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setSetting = vi.spyOn(apiClient, "setSettingValue").mockResolvedValue({
      key: "localization.locale",
      scopeType: "COMPANY",
      companyId: "company-1",
      value: "es-GT",
      updatedAt: "2026-08-27T12:00:00.000Z",
    });

    render(<SettingsPage selection={selection} navigate={vi.fn()} />);

    expect(await screen.findByRole("cell", { name: /localization\.locale/ })).toBeVisible();
    expect(apiClient.listSettingDefinitions).toHaveBeenCalledWith(
      "access-token",
      "grupo-aurora",
      expect.any(AbortSignal),
    );
    expect(apiClient.listEffectiveSettings).toHaveBeenCalledWith(
      "access-token",
      "grupo-aurora",
      "company-1",
      expect.any(AbortSignal),
    );

    await user.click(screen.getByRole("button", { name: "Editar ajuste localization.locale" }));
    const dialog = screen.getByRole("dialog", { name: "Editar localization.locale" });
    expect(within(dialog).getByRole("combobox", { name: "Alcance" })).toHaveValue("COMPANY");
    expect(within(dialog).getByRole("textbox", { name: /ID de empresa/ })).toHaveValue("company-1");
    await user.clear(within(dialog).getByRole("textbox", { name: /Valor/ }));
    await user.type(within(dialog).getByRole("textbox", { name: /Valor/ }), "es-GT");
    await user.click(within(dialog).getByRole("button", { name: "Guardar ajuste" }));

    expect(setSetting).toHaveBeenCalledWith("access-token", "grupo-aurora", "localization.locale", {
      scopeType: "COMPANY",
      companyId: "company-1",
      value: "es-GT",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "El ajuste localization.locale fue guardado para COMPANY.",
    );
    await waitFor(() => expect(apiClient.listEffectiveSettings).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Empresa")).toBeVisible();
  }, 10_000);

  it("keeps personal preferences usable when tenant settings permission is denied", async () => {
    const user = userEvent.setup();
    const denied = new ApiError({
      statusCode: 403,
      code: "PERMISSION_DENIED",
      message: "Permission denied",
    });
    vi.spyOn(apiClient, "listSettingDefinitions").mockRejectedValue(denied);
    vi.spyOn(apiClient, "listEffectiveSettings").mockRejectedValue(denied);
    vi.spyOn(apiClient, "listUserPreferences").mockResolvedValue([]);
    const setPreference = vi.spyOn(apiClient, "setUserPreference").mockResolvedValue({
      key: "ui.density",
      value: { compact: true },
      updatedAt: "2026-08-27T12:00:00.000Z",
    });

    render(<SettingsPage selection={selection} navigate={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tienes permiso para realizar esta acción.",
    );
    await user.click(screen.getByRole("tab", { name: /Preferencias/ }));
    await user.click(screen.getByRole("button", { name: "Nueva preferencia" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva preferencia" });
    await user.type(within(dialog).getByRole("textbox", { name: /Clave/ }), "ui.density");
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Tipo de valor" }),
      "JSON",
    );
    await user.click(within(dialog).getByRole("textbox", { name: /Valor/ }));
    await user.paste('{"compact":true}');
    await user.click(within(dialog).getByRole("button", { name: "Guardar preferencia" }));

    expect(setPreference).toHaveBeenCalledWith("access-token", "ui.density", {
      compact: true,
    });
    expect(await screen.findByRole("cell", { name: /ui\.density/ })).toBeVisible();
  }, 10_000);
});
