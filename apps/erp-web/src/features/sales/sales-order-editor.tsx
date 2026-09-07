import { ArrowLeft, CheckCircle, Package, Plus, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CustomerResponse,
  ProductResponse,
  SalesOrderLineResponse,
  SalesOrderResponse,
  TaxResponse,
  WarehouseResponse,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { formatDate } from "../../shared/format/date";
import { formatMoney } from "../../shared/format/money";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { ErrorNotice } from "../../shared/ui/notice";
import { StatusBadge } from "../../shared/ui/status-badge";
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
import { PaymentsSection } from "./payments-section";
import {
  CustomerSelect,
  LineTargetFields,
  customerLabel,
  isAbortError,
  productLabel,
  salesOrderStatusLabel,
  salesOrderStatusTone,
  type WorkspaceSelection,
} from "./sales-shared";

/**
 * Full-page sales-order editor, replacing the previous
 * create-modal -> find-the-row -> detail-modal -> add-line-modal chain.
 *
 * The order is created as a real DRAFT as soon as its header is saved, and
 * every line is added against that real order. That is deliberate: line
 * totals (quantity x price - discount + tax) are computed server-side with
 * exact decimal arithmetic, and the document total is aggregated from the
 * stored lines. Keeping the draft purely client-side would mean duplicating
 * that money math in the browser, where it could silently disagree with the
 * server — the one thing MASTER_SPEC §30/§82 exists to prevent. A draft the
 * user abandons is a normal, cancellable DRAFT document, not corruption.
 */
interface SalesOrderEditorProps {
  selection: WorkspaceSelection;
  companyId: string;
  customers: CustomerResponse[];
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  taxes: TaxResponse[];
  /** `null` starts a new order; an id opens an existing one. */
  orderId: string | null;
  onClose: () => void;
  /** Fired whenever the order changes, so the list behind can stay in sync. */
  onOrderChanged: (order: SalesOrderResponse) => void;
}

export function SalesOrderEditor({
  selection,
  companyId,
  customers,
  products,
  warehouses,
  taxes,
  orderId,
  onClose,
  onOrderChanged,
}: SalesOrderEditorProps) {
  const { getAccessToken } = useAuth();
  const [order, setOrder] = useState<SalesOrderResponse | null>(null);
  const [lines, setLines] = useState<SalesOrderLineResponse[] | null>(null);
  const [error, setError] = useState<string>();

  // Header form (only used before the draft exists).
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [headerError, setHeaderError] = useState<string>();
  const [creating, setCreating] = useState(false);

  // Add-line form.
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [taxId, setTaxId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [lineError, setLineError] = useState<string>();
  const [addingLine, setAddingLine] = useState(false);

  const [actionBusy, setActionBusy] = useState<"confirm" | "cancel" | "fulfill">();
  const [actionError, setActionError] = useState<string>();

  const loadExisting = useCallback(
    async (id: string, signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        const [loadedOrder, loadedLines] = await Promise.all([
          apiClient.getSalesOrder(accessToken, selection.slug, companyId, id, signal),
          apiClient.listSalesOrderLines(accessToken, selection.slug, companyId, id, signal),
        ]);
        setOrder(loadedOrder);
        setLines(loadedLines);
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLines([]);
      return;
    }
    const controller = new AbortController();
    void loadExisting(orderId, controller.signal);
    return () => controller.abort();
  }, [loadExisting, orderId]);

  /** Re-reads the order so its server-computed `total` reflects the lines. */
  const refreshTotals = useCallback(
    async (id: string) => {
      const accessToken = await getAccessToken();
      const refreshed = await apiClient.getSalesOrder(accessToken, selection.slug, companyId, id);
      setOrder(refreshed);
      onOrderChanged(refreshed);
    },
    [companyId, getAccessToken, onOrderChanged, selection.slug],
  );

  const createDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHeaderError(undefined);
    setCreating(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createSalesOrder(accessToken, selection.slug, companyId, {
        customerId,
        currency,
      });
      setOrder(created);
      setLines([]);
      onOrderChanged(created);
    } catch (caught) {
      setHeaderError(getErrorMessage(caught));
    } finally {
      setCreating(false);
    }
  };

  const addLine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setLineError(undefined);
    setAddingLine(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.addSalesOrderLine(accessToken, selection.slug, companyId, order.id, {
        productId,
        productVariantId: productVariantId || undefined,
        warehouseId: warehouseId || undefined,
        taxId: taxId || undefined,
        quantity,
        unitPrice: unitPrice || undefined,
        discountAmount: discountAmount || undefined,
      });
      setLines((current) => [...(current ?? []), created]);
      setProductId("");
      setProductVariantId("");
      setWarehouseId("");
      setTaxId("");
      setQuantity("");
      setUnitPrice("");
      setDiscountAmount("");
      await refreshTotals(order.id);
    } catch (caught) {
      setLineError(getErrorMessage(caught));
    } finally {
      setAddingLine(false);
    }
  };

  const runAction = async (action: "confirm" | "cancel" | "fulfill") => {
    if (!order) return;
    setActionError(undefined);
    setActionBusy(action);
    try {
      const accessToken = await getAccessToken();
      const updated =
        action === "confirm"
          ? await apiClient.confirmSalesOrder(accessToken, selection.slug, companyId, order.id)
          : action === "cancel"
            ? await apiClient.cancelSalesOrder(accessToken, selection.slug, companyId, order.id)
            : await apiClient.fulfillSalesOrder(accessToken, selection.slug, companyId, order.id);
      setOrder(updated);
      onOrderChanged(updated);
      // Fulfilling consumes the reservation on every line, so the reservation
      // column is stale until the lines are re-read.
      if (action !== "cancel") {
        const refreshedLines = await apiClient.listSalesOrderLines(
          accessToken,
          selection.slug,
          companyId,
          order.id,
        );
        setLines(refreshedLines);
      }
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setActionBusy(undefined);
    }
  };

  if (error) {
    return (
      <div className="grid gap-3">
        <ErrorNotice message={error} />
        <Button type="button" variant="secondary" className="w-fit" onClick={onClose}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          Volver a pedidos
        </Button>
      </div>
    );
  }

  const isDraft = order?.status === "DRAFT";
  const isConfirmed = order?.status === "CONFIRMED";

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="quiet" className="h-9 px-2" onClick={onClose}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          Volver a pedidos
        </Button>
        {order ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[15px] font-bold text-[var(--ink)]">{order.number}</span>
            <StatusBadge tone={salesOrderStatusTone(order.status)}>
              {salesOrderStatusLabel(order.status)}
            </StatusBadge>
          </div>
        ) : null}
      </div>

      {/* Header: an editable form until the draft exists, then a summary. */}
      {order ? (
        <dl className="grid gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-5 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)]">Cliente</dt>
            <dd className="mt-1 text-[13px] font-semibold text-[var(--ink)]">
              {customerLabel(customers, order.customerId)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)]">Fecha</dt>
            <dd className="mt-1 text-[13px] font-semibold text-[var(--ink)]">{formatDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)]">Moneda</dt>
            <dd className="mt-1 font-mono text-[13px] font-semibold text-[var(--ink)]">{order.currency}</dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)]">Total</dt>
            <dd className="mt-1 font-mono text-[17px] font-extrabold text-[var(--ink)]">
              {formatMoney(order.total, order.currency)}
            </dd>
          </div>
        </dl>
      ) : (
        <form
          className="grid gap-5 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-5"
          onSubmit={(event) => {
            void createDraft(event);
          }}
        >
          <p className="text-[13px] font-extrabold text-[var(--ink)]">Encabezado del pedido</p>
          {headerError ? <ErrorNotice message={headerError} /> : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <CustomerSelect
              fieldPrefix="order-editor"
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
            <FormField
              name="order-editor-currency"
              label="Moneda (ISO 4217)"
              value={currency}
              required
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            />
            <div className="flex items-end">
              <Button type="submit" busy={creating}>
                Crear borrador
              </Button>
            </div>
          </div>
          <p className="text-[12px] font-medium text-[var(--muted)]">
            El pedido se guarda como borrador para poder agregarle líneas con precios y totales reales. Un
            borrador se puede cancelar en cualquier momento.
          </p>
        </form>
      )}

      {/* Lines */}
      {order ? (
        <div className="grid gap-4">
          <p className="text-[13px] font-extrabold text-[var(--ink)]">Líneas</p>
          <Table aria-busy={lines === null}>
            <TableCaption>Líneas del pedido</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col" className="text-right">
                  Cantidad
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Precio unitario
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Descuento
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Total
                </TableHead>
                <TableHead scope="col">Reserva</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines === null ? (
                <LoadingRows columns={6} />
              ) : lines.length === 0 ? (
                <TableRow>
                  <TableEmpty
                    colSpan={6}
                    title="Todavía no hay líneas"
                    description="Agrega al menos una línea antes de confirmar el pedido."
                  />
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-[12px] font-semibold">
                      {productLabel(products, line.productId)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[12px]">{line.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-[12px]">{line.unitPrice}</TableCell>
                    <TableCell className="text-right font-mono text-[12px]">{line.discountAmount}</TableCell>
                    <TableCell className="text-right font-mono text-[12px] font-bold">{line.lineTotal}</TableCell>
                    <TableCell className="text-[11px] text-[var(--muted-strong)]">
                      {line.reservationId ? "Reservada" : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {isDraft ? (
            <form
              className="grid gap-4 rounded-[12px] border border-dashed border-[var(--line-strong)] p-5"
              onSubmit={(event) => {
                void addLine(event);
              }}
            >
              {lineError ? <ErrorNotice message={lineError} /> : null}
              <LineTargetFields
                fieldPrefix="order-editor-line"
                selection={selection}
                companyId={companyId}
                products={products}
                warehouses={warehouses}
                taxes={taxes}
                productId={productId}
                onProductIdChange={setProductId}
                productVariantId={productVariantId}
                onProductVariantIdChange={setProductVariantId}
                warehouseId={warehouseId}
                onWarehouseIdChange={setWarehouseId}
                taxId={taxId}
                onTaxIdChange={setTaxId}
                requireWarehouse
              />
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField
                  name="order-editor-line-quantity"
                  label="Cantidad"
                  value={quantity}
                  required
                  onChange={(event) => setQuantity(event.target.value)}
                />
                <FormField
                  name="order-editor-line-unitPrice"
                  label="Precio unitario (opcional)"
                  hint="Si lo dejas vacío se toma de la lista de precios."
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                />
                <FormField
                  name="order-editor-line-discountAmount"
                  label="Descuento (opcional)"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                />
                <div className="flex items-end">
                  <Button type="submit" variant="secondary" busy={addingLine}>
                    <Plus size={16} weight="bold" aria-hidden="true" />
                    Agregar línea
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {/* Payments live with the document, not on a separate screen. Shown
          regardless of order status — Payments is its own aggregate with no
          status dependency on Sales (see `CapturePaymentUseCase`), and the
          previous modal-based UI never gated this either. */}
      {order ? <PaymentsSection order={order} selection={selection} companyId={companyId} /> : null}

      {/* Action bar */}
      {order ? (
        <div className="sticky bottom-0 grid gap-3 border-t border-[var(--line)] bg-[var(--paper)] py-4">
          {actionError ? <ErrorNotice message={actionError} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <Button
                type="button"
                busy={actionBusy === "confirm"}
                disabled={(lines?.length ?? 0) === 0}
                onClick={() => void runAction("confirm")}
              >
                <CheckCircle size={16} weight="bold" aria-hidden="true" />
                Confirmar pedido
              </Button>
            ) : null}
            {isConfirmed ? (
              <Button type="button" busy={actionBusy === "fulfill"} onClick={() => void runAction("fulfill")}>
                <Package size={16} weight="bold" aria-hidden="true" />
                Despachar
              </Button>
            ) : null}
            {isDraft || isConfirmed ? (
              <Button
                type="button"
                variant="quiet"
                busy={actionBusy === "cancel"}
                onClick={() => void runAction("cancel")}
              >
                <XCircle size={16} weight="bold" aria-hidden="true" />
                Cancelar pedido
              </Button>
            ) : null}
            <span className="ml-auto font-mono text-[15px] font-extrabold text-[var(--ink)]">
              {formatMoney(order.total, order.currency)}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
