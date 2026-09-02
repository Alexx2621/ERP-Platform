import { Lock, Plus } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { FiscalPeriodResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { fiscalPeriodStatusLabel, formatDate, statusToneClass, type WorkspaceSelection } from "./accounting-shared";

interface FiscalPeriodsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  periods: FiscalPeriodResponse[] | null;
  error?: string;
  onRetry: () => void;
  onPeriodsChanged: (periods: FiscalPeriodResponse[]) => void;
}

export function FiscalPeriodsPanel({ selection, companyId, periods, error, onRetry, onPeriodsChanged }: FiscalPeriodsPanelProps) {
  const { getAccessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createFiscalPeriod(accessToken, selection.slug, companyId, { code, name, startDate, endDate });
      onPeriodsChanged([...(periods ?? []), created]);
      setModalOpen(false);
      setCode("");
      setName("");
      setStartDate("");
      setEndDate("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const closePeriod = async (period: FiscalPeriodResponse) => {
    setActionError(undefined);
    setBusyId(period.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.closeFiscalPeriod(accessToken, selection.slug, companyId, period.id);
      onPeriodsChanged((periods ?? []).map((p) => (p.id === updated.id ? updated : p)));
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">
          Períodos fiscales de la empresa activa. Cerrar un período es permanente — no se puede reabrir.
        </p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo período
        </Button>
      </div>
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={periods === null}>
          <TableCaption>Períodos fiscales</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Código</TableHead>
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Desde</TableHead>
              <TableHead scope="col">Hasta</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods === null ? (
              <LoadingRows columns={6} />
            ) : periods.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay períodos fiscales" />
              </TableRow>
            ) : (
              periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-mono text-[11px]">{period.code}</TableCell>
                  <TableCell className="text-[12px] font-semibold">{period.name}</TableCell>
                  <TableCell className="font-mono text-[11px]">{formatDate(period.startDate)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{formatDate(period.endDate)}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(period.status === "OPEN")}`}>
                      {fiscalPeriodStatusLabel(period.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {period.status === "OPEN" ? (
                      <Button type="button" variant="secondary" className="h-9 px-3" busy={busyId === period.id} onClick={() => void closePeriod(period)}>
                        <Lock size={16} weight="bold" aria-hidden="true" />
                        Cerrar
                      </Button>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
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
        title="Nuevo período fiscal"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="fiscal-period-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="fiscal-period-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <FormField name="period-code" label="Código" value={code} required placeholder="2026-01" onChange={(event) => setCode(event.target.value)} />
          <FormField name="period-name" label="Nombre" value={name} required placeholder="Enero 2026" onChange={(event) => setName(event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="period-start" label="Desde" type="date" value={startDate} required onChange={(event) => setStartDate(event.target.value)} />
            <FormField name="period-end" label="Hasta" type="date" value={endDate} required onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </form>
      </Modal>
    </section>
  );
}
