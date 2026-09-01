import { ListDashes, Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CreatePurchaseReturnLineInput,
  ProductResponse,
  PurchaseOrderLineResponse,
  PurchaseOrderResponse,
  PurchaseReturnLineResponse,
  PurchaseReturnResponse,
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { isAbortError, productLabel, type WorkspaceSelection } from "./purchasing-shared";

interface PurchaseReturnsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  active: boolean;
}

interface LinesModalProps {
  purchaseReturn: PurchaseReturnResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  onOpenChange: (open: boolean) => void;
}

function ReturnLinesModal({ purchaseReturn, selection, companyId, products, onOpenChange }: LinesModalProps) {
  const { getAccessToken } = useAuth();
  const [lines, setLines] = useState<PurchaseReturnLineResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [orderLines, setOrderLines] = useState<PurchaseOrderLineResponse[]>([]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!purchaseReturn) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [returnLines, purchaseOrderLines] = await Promise.all([
          apiClient.listPurchaseReturnLines(accessToken, selection.slug, companyId, purchaseReturn.id, signal),
          apiClient.listPurchaseOrderLines(accessToken, selection.slug, companyId, purchaseReturn.purchaseOrderId, signal),
        ]);
        setLines(returnLines);
        setOrderLines(purchaseOrderLines);
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, purchaseReturn, selection.slug],
  );

  useEffect(() => {
    if (!purchaseReturn) {
      setLines(null);
      return;
    }
    void load();
  }, [load, purchaseReturn]);

  const orderLineProductId = (purchaseOrderLineId: string): string =>
    orderLines.find((line) => line.id === purchaseOrderLineId)?.productId ?? purchaseOrderLineId;

  return (
    <Modal
      open={Boolean(purchaseReturn)}
      onOpenChange={onOpenChange}
      title={purchaseReturn ? `Devolución${purchaseReturn.reason ? ` · ${purchaseReturn.reason}` : ""}` : "Devolución"}
      description="Cantidades devueltas al proveedor contra cada línea de la orden."
    >
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <Table aria-busy={lines === null}>
          <TableCaption>Líneas devueltas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Producto</TableHead>
              <TableHead scope="col">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines === null ? (
              <LoadingRows columns={2} />
            ) : lines.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={2} title="Todavía no hay líneas" />
              </TableRow>
            ) : (
              lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="text-[12px] font-semibold">
                    {productLabel(products, orderLineProductId(line.purchaseOrderLineId))}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{line.quantity}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Modal>
  );
}

interface DraftLine extends CreatePurchaseReturnLineInput {
  productLabel: string;
}

export function PurchaseReturnsPanel({ selection, companyId, products, active }: PurchaseReturnsPanelProps) {
  const { getAccessToken } = useAuth();
  const [returns, setReturns] = useState<PurchaseReturnResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailReturn, setDetailReturn] = useState<PurchaseReturnResponse | null>(null);

  const [receivableOrders, setReceivableOrders] = useState<PurchaseOrderResponse[]>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [orderLines, setOrderLines] = useState<PurchaseOrderLineResponse[]>([]);
  const [selectedOrderLineId, setSelectedOrderLineId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setReturns(await apiClient.listPurchaseReturns(accessToken, selection.slug, companyId, {}, signal));
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

  const openModal = async () => {
    setModalOpen(true);
    setPurchaseOrderId("");
    setOrderLines([]);
    setSelectedOrderLineId("");
    setLineQuantity("");
    setReason("");
    setDraftLines([]);
    setFormError(undefined);
    try {
      const accessToken = await getAccessToken();
      // A return only makes sense once goods physically arrived — CONFIRMED
      // (still receiving) or CLOSED (fully processed) orders may have
      // receipts; DRAFT/CANCELLED orders never do.
      const [confirmed, closed] = await Promise.all([
        apiClient.listPurchaseOrders(accessToken, selection.slug, companyId, { status: "CONFIRMED" }),
        apiClient.listPurchaseOrders(accessToken, selection.slug, companyId, { status: "CLOSED" }),
      ]);
      setReceivableOrders([...confirmed, ...closed]);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    }
  };

  const selectOrder = async (id: string) => {
    setPurchaseOrderId(id);
    setOrderLines([]);
    setSelectedOrderLineId("");
    setDraftLines([]);
    if (!id) return;
    try {
      const accessToken = await getAccessToken();
      setOrderLines(await apiClient.listPurchaseOrderLines(accessToken, selection.slug, companyId, id));
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    }
  };

  const addDraftLine = () => {
    if (!selectedOrderLineId || !lineQuantity) return;
    const orderLine = orderLines.find((line) => line.id === selectedOrderLineId);
    setDraftLines((current) => [
      ...current,
      {
        purchaseOrderLineId: selectedOrderLineId,
        quantity: lineQuantity,
        productLabel: orderLine ? productLabel(products, orderLine.productId) : selectedOrderLineId,
      },
    ]);
    setSelectedOrderLineId("");
    setLineQuantity("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftLines.length === 0) {
      setFormError("Agrega al menos una línea antes de registrar la devolución.");
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createPurchaseReturn(accessToken, selection.slug, companyId, {
        purchaseOrderId,
        reason: reason || undefined,
        lines: draftLines.map(({ purchaseOrderLineId, quantity }) => ({ purchaseOrderLineId, quantity })),
      });
      setReturns((current) => [...(current ?? []), created]);
      setModalOpen(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Devoluciones registradas contra órdenes con recepciones.</p>
        <Button type="button" onClick={() => void openModal()}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva devolución
        </Button>
      </div>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={returns === null}>
          <TableCaption>Devoluciones</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Orden</TableHead>
              <TableHead scope="col">Motivo</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns === null ? (
              <LoadingRows columns={3} />
            ) : returns.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={3} title="Todavía no hay devoluciones" />
              </TableRow>
            ) : (
              returns.map((purchaseReturn) => (
                <TableRow key={purchaseReturn.id}>
                  <TableCell className="font-mono text-[11px]">{purchaseReturn.purchaseOrderId}</TableCell>
                  <TableCell className="text-[12px]">{purchaseReturn.reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setDetailReturn(purchaseReturn)}>
                      <ListDashes size={16} weight="bold" aria-hidden="true" />
                      Ver
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
        title="Nueva devolución"
        description="Selecciona una orden con recepciones, agrega una o más líneas y registra la devolución al proveedor."
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="purchase-return-form" busy={busy} disabled={draftLines.length === 0}>
              Registrar devolución
            </Button>
          </>
        }
      >
        <form
          id="purchase-return-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          {receivableOrders.length === 0 ? (
            <ErrorNotice message="No hay órdenes confirmadas o cerradas todavía. Una orden debe confirmarse antes de poder devolverse." />
          ) : (
            <Select
              name="purchase-return-purchaseOrderId"
              label="Orden de compra"
              value={purchaseOrderId}
              required
              onChange={(event) => void selectOrder(event.target.value)}
            >
              <option value="">Selecciona una orden</option>
              {receivableOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id} ({order.currency})
                </option>
              ))}
            </Select>
          )}

          {purchaseOrderId ? (
            <div className="grid gap-4 border-t border-[var(--line)] pt-5">
              <p className="text-[12px] font-extrabold text-[var(--ink)]">Agregar línea a devolver</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="purchase-return-orderLineId"
                  label="Línea de la orden"
                  value={selectedOrderLineId}
                  onChange={(event) => setSelectedOrderLineId(event.target.value)}
                >
                  <option value="">Selecciona una línea</option>
                  {orderLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {productLabel(products, line.productId)} · {line.quantity}
                    </option>
                  ))}
                </Select>
                <FormField
                  name="purchase-return-quantity"
                  label="Cantidad a devolver"
                  value={lineQuantity}
                  placeholder="1.0000"
                  onChange={(event) => setLineQuantity(event.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" className="w-fit" onClick={addDraftLine} disabled={!selectedOrderLineId || !lineQuantity}>
                <Plus size={16} weight="bold" aria-hidden="true" />
                Agregar a la lista
              </Button>

              {draftLines.length > 0 ? (
                <ul className="grid gap-2">
                  {draftLines.map((line, index) => (
                    <li
                      key={`${line.purchaseOrderLineId}-${index}`}
                      className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--ink)]"
                    >
                      <span>
                        {line.productLabel} · {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="text-[var(--muted-strong)] hover:text-[var(--danger)]"
                        onClick={() => setDraftLines((current) => current.filter((_, i) => i !== index))}
                        aria-label="Quitar línea"
                      >
                        <Trash size={16} weight="bold" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <FormField name="purchase-return-reason" label="Motivo (opcional)" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          ) : null}
        </form>
      </Modal>

      <ReturnLinesModal
        purchaseReturn={detailReturn}
        selection={selection}
        companyId={companyId}
        products={products}
        onOpenChange={(open) => !open && setDetailReturn(null)}
      />
    </section>
  );
}
