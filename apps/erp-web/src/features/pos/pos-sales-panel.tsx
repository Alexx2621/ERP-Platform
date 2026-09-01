import { ArrowUUpLeft, Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CreatePosReturnLineInput,
  PosSaleResponse,
  ProductResponse,
  SalesOrderLineResponse,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { Select } from "../../shared/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { isAbortError, newIdempotencyKey, paymentMethodLabel, productLabel, type WorkspaceSelection } from "./pos-shared";

interface PosSalesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  active: boolean;
}

interface DraftLine extends CreatePosReturnLineInput {
  label: string;
}

interface ReturnModalProps {
  sale: PosSaleResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  onOpenChange: (open: boolean) => void;
  onReturned: () => void;
}

function CreateReturnModal({ sale, selection, companyId, products, onOpenChange, onReturned }: ReturnModalProps) {
  const { getAccessToken } = useAuth();
  const [orderLines, setOrderLines] = useState<SalesOrderLineResponse[]>([]);
  const [error, setError] = useState<string>();
  const [selectedOrderLineId, setSelectedOrderLineId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState("");
  const [issueRefund, setIssueRefund] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!sale) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOrderLines(await apiClient.listSalesOrderLines(accessToken, selection.slug, companyId, sale.salesOrderId, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, sale, selection.slug],
  );

  useEffect(() => {
    if (!sale) {
      setOrderLines([]);
      return;
    }
    setSelectedOrderLineId("");
    setLineQuantity("");
    setDraftLines([]);
    setReason("");
    setIssueRefund(true);
    void load();
  }, [load, sale]);

  const addDraftLine = () => {
    if (!selectedOrderLineId || !lineQuantity) return;
    const orderLine = orderLines.find((line) => line.id === selectedOrderLineId);
    setDraftLines((current) => [
      ...current,
      { salesOrderLineId: selectedOrderLineId, quantity: lineQuantity, label: orderLine ? productLabel(products, orderLine.productId) : selectedOrderLineId },
    ]);
    setSelectedOrderLineId("");
    setLineQuantity("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sale) return;
    if (draftLines.length === 0) {
      setError("Agrega al menos una línea antes de registrar la devolución.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      await apiClient.createPosReturn(accessToken, selection.slug, companyId, {
        shiftId: sale.shiftId,
        posSaleId: sale.id,
        reason: reason || undefined,
        issueRefund,
        idempotencyKey: newIdempotencyKey("return"),
        lines: draftLines.map(({ salesOrderLineId, quantity }) => ({ salesOrderLineId, quantity })),
      });
      onReturned();
      onOpenChange(false);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(sale)}
      onOpenChange={(open) => !busy && onOpenChange(open)}
      title="Devolver venta"
      description="Selecciona las líneas y cantidades a devolver. El reembolso, si se marca, es siempre por el monto completo del pago original."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="pos-return-form" busy={busy} disabled={draftLines.length === 0}>
            Registrar devolución
          </Button>
        </>
      }
    >
      <form
        id="pos-return-form"
        className="grid gap-5"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select name="pos-return-orderLineId" label="Línea vendida" value={selectedOrderLineId} onChange={(event) => setSelectedOrderLineId(event.target.value)}>
            <option value="">Selecciona una línea</option>
            {orderLines.map((line) => (
              <option key={line.id} value={line.id}>
                {productLabel(products, line.productId)} · {line.quantity}
              </option>
            ))}
          </Select>
          <FormField name="pos-return-quantity" label="Cantidad a devolver" value={lineQuantity} placeholder="1.0000" onChange={(event) => setLineQuantity(event.target.value)} />
        </div>
        <Button type="button" variant="secondary" className="w-fit" disabled={!selectedOrderLineId || !lineQuantity} onClick={addDraftLine}>
          <Plus size={16} weight="bold" aria-hidden="true" />
          Agregar a la lista
        </Button>

        {draftLines.length > 0 ? (
          <ul className="grid gap-2">
            {draftLines.map((line, index) => (
              <li key={`${line.salesOrderLineId}-${index}`} className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--ink)]">
                <span>
                  {line.label} · {line.quantity}
                </span>
                <button type="button" className="text-[var(--muted-strong)] hover:text-[var(--danger)]" onClick={() => setDraftLines((current) => current.filter((_, i) => i !== index))} aria-label="Quitar línea">
                  <Trash size={16} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <FormField name="pos-return-reason" label="Motivo (opcional)" value={reason} onChange={(event) => setReason(event.target.value)} />
        <label className="flex items-center gap-2 text-[12px] font-semibold text-[var(--ink)]">
          <input type="checkbox" checked={issueRefund} onChange={(event) => setIssueRefund(event.target.checked)} />
          Reembolsar el pago original por completo
        </label>
      </form>
    </Modal>
  );
}

export function PosSalesPanel({ selection, companyId, products, active }: PosSalesPanelProps) {
  const { getAccessToken } = useAuth();
  const [sales, setSales] = useState<PosSaleResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [returnTarget, setReturnTarget] = useState<PosSaleResponse | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setSales(await apiClient.listPosSales(accessToken, selection.slug, companyId, {}, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [active, load]);

  return (
    <section className="grid gap-4">
      <p className="text-[12px] font-medium text-[var(--muted-strong)]">Ventas registradas en cualquier caja de la empresa activa.</p>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={sales === null}>
          <TableCaption>Ventas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Método</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Cambio</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales === null ? (
              <LoadingRows columns={4} />
            ) : sales.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="Todavía no hay ventas" />
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-[12px]">{paymentMethodLabel(sale.paymentMethod)}</TableCell>
                  <TableCell className="font-mono text-[11px] font-bold">{sale.amount}</TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--muted-strong)]">{sale.changeDue ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="quiet" className="h-9 px-3" onClick={() => setReturnTarget(sale)}>
                      <ArrowUUpLeft size={16} weight="bold" aria-hidden="true" />
                      Devolver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <CreateReturnModal
        sale={returnTarget}
        selection={selection}
        companyId={companyId}
        products={products}
        onOpenChange={(open) => !open && setReturnTarget(null)}
        onReturned={() => void load()}
      />
    </section>
  );
}
