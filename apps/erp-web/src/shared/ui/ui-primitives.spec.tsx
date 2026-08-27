import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "./form-field";
import { Modal } from "./modal";
import { Select } from "./select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Tabs } from "./tabs";

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

describe("shared UI primitives", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      writable: true,
      value: showModalMock,
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  });

  it("renders an accessible table and its empty state", () => {
    const { rerender } = render(
      <Table>
        <TableCaption>Roles del tenant</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Rol</TableHead>
            <TableHead scope="col">Permisos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Administrador</TableCell>
            <TableCell>12</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("table", { name: "Roles del tenant" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tabla desplazable" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("cell", { name: "Administrador" })).toBeInTheDocument();

    rerender(
      <Table>
        <TableCaption>Roles del tenant</TableCaption>
        <TableBody>
          <TableRow>
            <TableEmpty colSpan={2} title="No hay roles" description="Crea el primer rol." />
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("No hay roles")).toBeInTheDocument();
    expect(screen.getByText("Crea el primer rol.")).toBeInTheDocument();
  });

  it("generates stable field ids and announces hints together with validation errors", () => {
    render(
      <FormField
        label="Nombre visible"
        hint="Se mostrará en el encabezado."
        error="El nombre es obligatorio."
      />,
    );

    const input = screen.getByRole("textbox", { name: "Nombre visible" });
    expect(input).toHaveAccessibleDescription(
      "Se mostrará en el encabezado. El nombre es obligatorio.",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("associates select labels, hints and validation errors", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <Select name="scope" label="Alcance" hint="Define dónde aplica." onChange={onChange}>
        <option value="tenant">Tenant</option>
        <option value="company">Empresa</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Alcance" });
    expect(select).toHaveAccessibleDescription("Define dónde aplica.");
    await user.selectOptions(select, "company");
    expect(onChange).toHaveBeenCalled();

    rerender(
      <Select name="scope" label="Alcance" error="Selecciona un alcance.">
        <option value="">Seleccionar</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Alcance" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona un alcance.");
  });

  it("reports modal dismiss actions and exposes its labelled dialog", async () => {
    const onOpenChange = vi.fn();

    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        title="Editar rol"
        description="Actualiza los permisos asignados."
      >
        Contenido del formulario
      </Modal>,
    );

    expect(showModalMock).toHaveBeenCalledOnce();
    const dialog = screen.getByRole("dialog", { name: "Editar rol" });
    expect(dialog).toHaveAccessibleDescription("Actualiza los permisos asignados.");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar modal" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("supports automatic tab activation and skips disabled tabs", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        ariaLabel="Administración de acceso"
        items={[
          { id: "roles", label: "Roles", panel: "Panel de roles" },
          { id: "members", label: "Miembros", panel: "Panel de miembros", disabled: true },
          { id: "audit", label: "Actividad", panel: "Panel de actividad" },
        ]}
      />,
    );

    const rolesTab = screen.getByRole("tab", { name: "Roles" });
    rolesTab.focus();
    expect(rolesTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel de roles");

    await user.keyboard("{ArrowRight}");
    const activityTab = screen.getByRole("tab", { name: "Actividad" });
    expect(activityTab).toHaveFocus();
    expect(activityTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel de actividad");

    await user.keyboard("{Home}");
    expect(rolesTab).toHaveFocus();
    expect(rolesTab).toHaveAttribute("aria-selected", "true");
  });
});
