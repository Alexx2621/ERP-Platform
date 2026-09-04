import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePage } from "./appearance-page";

const authContext = vi.hoisted(() => ({
  session: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshExpiresAt: "2099-01-02T00:00:00.000Z",
    user: { id: "user-1", email: "ana@example.com", displayName: "Ana", isPlatformAdmin: false },
  },
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isBootstrapping: false,
}));

vi.mock("../../shared/auth/auth-context", () => ({
  useAuth: () => authContext,
}));

const appearanceContext = vi.hoisted(() => ({
  accentColor: "#0070f2",
  navigationLayout: "sidebar" as "sidebar" | "navbar",
  isReady: true,
  saveError: null as string | null,
  setAccentColor: vi.fn(),
  setNavigationLayout: vi.fn(),
}));

vi.mock("../../shared/appearance/appearance-context", () => ({
  useAppearance: () => appearanceContext,
}));

const navigate = vi.fn();
const selection = {
  tenantId: "tenant-1",
  slug: "grupo-aurora",
  name: "Grupo Aurora",
  membershipId: "membership-1",
  companyId: "company-1",
};

describe("AppearancePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    appearanceContext.accentColor = "#0070f2";
    appearanceContext.navigationLayout = "sidebar";
    appearanceContext.isReady = true;
    appearanceContext.saveError = null;
    appearanceContext.setAccentColor.mockClear();
    appearanceContext.setNavigationLayout.mockClear();
  });

  it("shows the current accent color and marks the active layout option", () => {
    render(<AppearancePage selection={selection} navigate={navigate} />);

    expect(screen.getByLabelText("Código hexadecimal")).toHaveValue("#0070f2");
    const sidebarOption = screen.getByRole("button", { name: /Barra lateral/ });
    expect(sidebarOption).toHaveAttribute("aria-pressed", "true");
    const navbarOption = screen.getByRole("button", { name: /Barra superior/ });
    expect(navbarOption).toHaveAttribute("aria-pressed", "false");
  });

  it("applies a preset color when clicked", async () => {
    const user = userEvent.setup();
    render(<AppearancePage selection={selection} navigate={navigate} />);

    await user.click(screen.getByRole("button", { name: "Usar color Verde" }));
    expect(appearanceContext.setAccentColor).toHaveBeenCalledWith("#0f8a5f");
  });

  it("commits a manually typed hex value on blur", async () => {
    const user = userEvent.setup();
    render(<AppearancePage selection={selection} navigate={navigate} />);

    const hexInput = screen.getByLabelText("Código hexadecimal");
    await user.clear(hexInput);
    await user.type(hexInput, "#7c3aed");
    await user.tab();

    expect(appearanceContext.setAccentColor).toHaveBeenCalledWith("#7c3aed");
  });

  it("rejects an invalid hex value instead of applying it", async () => {
    const user = userEvent.setup();
    render(<AppearancePage selection={selection} navigate={navigate} />);

    const hexInput = screen.getByLabelText("Código hexadecimal");
    await user.clear(hexInput);
    await user.type(hexInput, "not-a-color");
    await user.tab();

    expect(appearanceContext.setAccentColor).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/color hexadecimal válido/);
  });

  it("switches the navigation layout when the navbar option is selected", async () => {
    const user = userEvent.setup();
    render(<AppearancePage selection={selection} navigate={navigate} />);

    await user.click(screen.getByRole("button", { name: /Barra superior/ }));
    expect(appearanceContext.setNavigationLayout).toHaveBeenCalledWith("navbar");
  });

  it("surfaces a save error from the appearance context", () => {
    appearanceContext.saveError = "No se pudo guardar la preferencia. Se aplicó solo para esta sesión.";
    render(<AppearancePage selection={selection} navigate={navigate} />);

    expect(
      screen.getByText("No se pudo guardar la preferencia. Se aplicó solo para esta sesión."),
    ).toBeInTheDocument();
  });
});
