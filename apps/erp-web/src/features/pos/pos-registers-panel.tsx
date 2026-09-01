import { Plus } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { PosRegisterResponse, WarehouseResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { registerStatusLabel, statusToneClass, type WorkspaceSelection } from "./pos-shared";

interface PosRegistersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  registers: PosRegisterResponse[];
  onRegistersChange: (registers: PosRegisterResponse[]) => void;
}

/**
 * Registers are loaded once, at the page level (`PosPage`) — the Terminal
 * tab needs the same list before the user ever visits this tab, so this
 * panel receives `registers` as a prop instead of fetching its own copy
 * (unlike every other tab-scoped panel in this feature, which loads lazily
 * on activation).
 */
export function PosRegistersPanel({ selection, companyId, warehouses, registers, onRegistersChange }: PosRegistersPanelProps) {
  const { getAccessToken } = useAuth();
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createPosRegister(accessToken, selection.slug, companyId, { warehouseId, code, name });
      onRegistersChange([...registers, created]);
      setModalOpen(false);
      setWarehouseId("");
      setCode("");
      setName("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (register: PosRegisterResponse) => {
    setPendingId(register.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.setPosRegisterStatus(accessToken, selection.slug, companyId, register.id, {
        status: register.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      onRegistersChange(registers.map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Cajas/terminales de la empresa activa, cada una atada a una bodega.</p>
        {warehouses.length > 0 ? (
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus size={17} weight="bold" aria-hidden="true" />
            Nueva caja
          </Button>
        ) : null}
      </div>
      {warehouses.length === 0 ? (
        <ErrorNotice message="Todavía no hay bodegas en esta empresa. Crea al menos una en Comercial antes de crear una caja." />
      ) : error ? (
        <ErrorNotice message={error} />
      ) : (
        <Table>
          <TableCaption>Cajas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Bodega</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registers.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay cajas" />
              </TableRow>
            ) : (
              registers.map((register) => (
                <TableRow key={register.id}>
                  <TableCell className="font-mono text-[11px]">{register.code}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{register.name}</TableCell>
                  <TableCell className="text-[12px]">{warehouses.find((w) => w.id === register.warehouseId)?.name ?? register.warehouseId}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(register.status === "ACTIVE")}`}>
                      {registerStatusLabel(register.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="quiet" className="h-9 px-3" busy={pendingId === register.id} onClick={() => void toggleStatus(register)}>
                      {register.status === "ACTIVE" ? "Desactivar" : "Activar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => !busy && setModalOpen(open)}
        title="Nueva caja"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="pos-register-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="pos-register-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <Select name="pos-register-warehouseId" label="Bodega" value={warehouseId} required onChange={(event) => setWarehouseId(event.target.value)}>
            <option value="">Selecciona una bodega</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </Select>
          <FormField name="pos-register-code" label="Código" value={code} required placeholder="REG-1" onChange={(event) => setCode(event.target.value)} />
          <FormField name="pos-register-name" label="Nombre" value={name} required placeholder="Caja principal" onChange={(event) => setName(event.target.value)} />
        </form>
      </Modal>
    </section>
  );
}
