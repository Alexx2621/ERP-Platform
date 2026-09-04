import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductShell } from "./product-shell";

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

function setPath(path: string) {
  window.history.pushState(null, "", path);
}

describe("ProductShell", () => {
  afterEach(() => {
    appearanceContext.navigationLayout = "sidebar";
    setPath("/");
  });

  it("shows the grouped sidebar and highlights the active module by default", () => {
    setPath("/sales");
    render(
      <ProductShell title="Ventas" navigate={vi.fn()}>
        <p>Contenido</p>
      </ProductShell>,
    );

    const nav = screen.getByRole("navigation", { name: "Módulos" });
    expect(nav).toBeInTheDocument();
    const activeLink = screen.getByRole("button", { name: "Ventas" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("replaces the sidebar with grouped category dropdowns in navbar layout", async () => {
    appearanceContext.navigationLayout = "navbar";
    const user = userEvent.setup();
    const navigate = vi.fn();
    setPath("/purchasing");

    render(
      <ProductShell title="Compras" navigate={navigate}>
        <p>Contenido</p>
      </ProductShell>,
    );

    // Unlike the sidebar (a flat, always-visible list), navbar mode keeps
    // every module collapsed inside its category dropdown until opened.
    expect(screen.queryByRole("button", { name: "Contactos" })).not.toBeInTheDocument();

    const purchasingCategory = screen.getByRole("button", { name: /Compras e inventario/ });
    await user.click(purchasingCategory);
    await user.click(screen.getByRole("menuitem", { name: "Inventario" }));

    expect(navigate).toHaveBeenCalledWith("/inventory");
  });

  it("still opens the mobile drawer with the full grouped list in navbar layout", async () => {
    appearanceContext.navigationLayout = "navbar";
    const user = userEvent.setup();
    setPath("/purchasing");

    render(
      <ProductShell title="Compras" navigate={vi.fn()}>
        <p>Contenido</p>
      </ProductShell>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("button", { name: "Ventas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manufactura" })).toBeInTheDocument();
  });

  it("hides all module navigation on routes without tenant context", () => {
    setPath("/tenants");
    render(
      <ProductShell title="Tus espacios" navigate={vi.fn()}>
        <p>Contenido</p>
      </ProductShell>,
    );

    expect(screen.queryByRole("navigation", { name: "Módulos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir menú" })).not.toBeInTheDocument();
  });
});
