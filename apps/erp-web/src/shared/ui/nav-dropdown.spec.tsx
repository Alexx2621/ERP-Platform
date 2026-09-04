import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavDropdown } from "./nav-dropdown";

describe("NavDropdown", () => {
  it("opens the menu on click and closes it after selecting an item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <NavDropdown
        label="Ventas y clientes"
        items={[
          { key: "/sales", label: "Ventas", onSelect },
          { key: "/pos", label: "Punto de venta", onSelect: vi.fn() },
        ]}
      />,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Ventas y clientes/ }));
    expect(screen.getByRole("menu", { name: "Ventas y clientes" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Ventas" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <NavDropdown
        label="Compras e inventario"
        items={[{ key: "/purchasing", label: "Compras", onSelect: vi.fn() }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Compras e inventario/ }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the dropdown", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <NavDropdown
          label="Producción y finanzas"
          items={[{ key: "/accounting", label: "Contabilidad", onSelect: vi.fn() }]}
        />
        <button type="button">Fuera del menú</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /Producción y finanzas/ }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fuera del menú" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("marks the active item and reflects it on the trigger", async () => {
    const user = userEvent.setup();
    render(
      <NavDropdown
        label="Administración"
        items={[
          { key: "/apps", label: "Apps", onSelect: vi.fn() },
          { key: "/roles", label: "Roles y permisos", onSelect: vi.fn(), active: true },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Administración/ }));
    const activeItem = screen.getByRole("menuitem", { name: "Roles y permisos" });
    expect(activeItem).toHaveClass("bg-[var(--accent)]");
    expect(activeItem).toHaveClass("text-[var(--accent-contrast)]");
  });
});
