import { CheckCircle, CreditCard, ListDashes, Package, Plus, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CustomerResponse,
  PaymentResponse,
  ProductResponse,
  SalesOrderLineResponse,
  SalesOrderResponse,
  TaxResponse,
  WarehouseResponse,
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
import {
  CustomerSelect,
  LineTargetFields,
  channelLabel,
  customerLabel,
  isAbortError,
  paymentMethodLabel,
  paymentStatusLabel,
  productLabel,
  salesOrderStatusLabel,
  statusToneClass,
  type WorkspaceSelection,
} from "./sales-shared";

interface SalesOrdersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  customers: CustomerResponse[];
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  taxes: TaxResponse[];
  active: boolean;
  focusOrder: SalesOrderResponse | null;
  onFocusOrderConsumed: () => void;
}

function newIdempotencyKey(): string {
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface PaymentsSectionProps {
  order: SalesOrderResponse;
  selection: WorkspaceSelection;
  companyId: string;
}

function PaymentsSection({ order, selection, companyId }: PaymentsSectionProps) {
  const { getAccessToken } = useAuth();
  const [payments, setPayments] = useState<PaymentResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setPayments(await apiClient.listPayments(accessToken, selection.slug, companyId, { salesOrderId: order.id }, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, order.id, selection.slug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const capture = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.capturePayment(accessToken, selection.slug, companyId, {
        salesOrderId: order.id,
        method,
        amount,
        currency: order.currency,
        idempotencyKey: newIdempotencyKey(),
        reference: method === "BANK_TRANSFER" ? reference || undefined : undefined,
      });
      setPayments((current) => [created, ...(current ?? [])]);
      setAmount("");
      setReference("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const refund = async (payment: PaymentResponse) => {
    setPendingId(payment.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.refundPayment(accessToken, selection.slug, companyId, payment.id);
      setPayments((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <div className="grid gap-4 border-t border-[var(--line)] pt-5">
      <p className="text-[12px] font-extrabold text-[var(--ink)]">Pagos</p>
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <Table aria-busy={payments === null}>
          <TableCaption>Pagos del pedido</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Método</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col">Detalle</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments === null ? (
              <LoadingRows columns={5} />
            ) : payments.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay pagos" />
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-[12px]">{paymentMethodLabel(payment.method)}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {payment.amount} {payment.currency}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${payment.status === "CAPTURED" ? "text-[var(--accent)]" : payment.status === "FAILED" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
                    >
                      {paymentStatusLabel(payment.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] text-[var(--muted-strong)]">
                    {payment.failureReason ?? payment.gatewayReference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "CAPTURED" ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === payment.id}
                        onClick={() => void refund(payment)}
                      >
                        Reembolsar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void capture(event);
        }}
      >
        {formError ? <ErrorNotice message={formError} /> : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            name="payment-method"
            label="Método"
            value={method}
            onChange={(event) => setMethod(event.target.value as "CASH" | "BANK_TRANSFER")}
          >
            <option value="CASH">Efectivo</option>
            <option value="BANK_TRANSFER">Transferencia</option>
          </Select>
          <FormField
            name="payment-amount"
            label={`Monto (${order.currency})`}
            value={amount}
            required
            placeholder="150.0000"
            onChange={(event) => setAmount(event.target.value)}
          />
          {method === "BANK_TRANSFER" ? (
            <FormField
              name="payment-reference"
              label="Número de transferencia"
              value={reference}
              required
              onChange={(event) => setReference(event.target.value)}
            />
          ) : null}
        </div>
        <Button type="submit" busy={busy} className="w-fit">
          <CreditCard size={16} weight="bold" aria-hidden="true" />
          Cobrar
        </Button>
      </form>
    </div>
  );
}

interface DetailModalProps {
  order: SalesOrderResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  taxes: TaxResponse[];
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: (order: SalesOrderResponse) => void;
}

function SalesOrderDetailModal({ order, selection, companyId, products, warehouses, taxes, onOpenChange, onOrderUpdated }: DetailModalProps) {
  const { getAccessToken } = useAuth();
  const [lines, setLines] = useState<SalesOrderLineResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [taxId, setTaxId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<"confirm" | "cancel" | "fulfill">();
  const [actionError, setActionError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!order) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setLines(await apiClient.listSalesOrderLines(accessToken, selection.slug, companyId, order.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, order, selection.slug],
  );

  useEffect(() => {
    if (!order) {
      setLines(null);
      return;
    }
    setProductId("");
    setProductVariantId("");
    setWarehouseId("");
    setTaxId("");
    setQuantity("");
    setDiscountAmount("");
    setUnitPrice("");
    setFormError(undefined);
    setActionError(undefined);
    void load();
  }, [load, order]);

  const isDraft = order?.status === "DRAFT";
  const isConfirmed = order?.status === "CONFIRMED";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setFormError(undefined);
    setBusy(true);
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
      setDiscountAmount("");
      setUnitPrice("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
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
      onOrderUpdated(updated);
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setActionBusy(undefined);
    }
  };

  return (
    <Modal
      open={Boolean(order)}
      onOpenChange={(open) => !busy && !actionBusy && onOpenChange(open)}
      title={order ? `Pedido ${order.currency} · ${salesOrderStatusLabel(order.status)}` : "Pedido"}
      description="Confirmar reserva inventario por línea; despachar libera la reserva y descuenta existencias reales."
    >
      <div className="grid gap-6">
        {actionError ? <ErrorNotice message={actionError} /> : null}
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={lines === null}>
            <TableCaption>Líneas del pedido</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Cantidad</TableHead>
                <TableHead scope="col">Total</TableHead>
                <TableHead scope="col">Reserva</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines === null ? (
                <LoadingRows columns={4} />
              ) : lines.length === 0 ? (
                <TableRow>
                  <TableEmpty colSpan={4} title="Todavía no hay líneas" />
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-[12px] font-semibold">{productLabel(products, line.productId)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{line.quantity}</TableCell>
                    <TableCell className="font-mono text-[11px] font-bold">{line.lineTotal}</TableCell>
                    <TableCell className="text-[11px] text-[var(--muted-strong)]">{line.reservationId ? "Reservada" : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {isDraft ? (
          <form
            className="grid gap-4 border-t border-[var(--line)] pt-5"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <p className="text-[12px] font-extrabold text-[var(--ink)]">Agregar línea</p>
            {formError ? <ErrorNotice message={formError} /> : null}
            <LineTargetFields
              fieldPrefix="order-line"
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
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                name="order-line-quantity"
                label="Cantidad"
                value={quantity}
                required
                placeholder="2.0000"
                onChange={(event) => setQuantity(event.target.value)}
              />
              <FormField
                name="order-line-unitPrice"
                label="Precio unitario (opcional)"
                value={unitPrice}
                placeholder="Usa el precio del producto"
                onChange={(event) => setUnitPrice(event.target.value)}
              />
              <FormField
                name="order-line-discountAmount"
                label="Descuento (opcional)"
                value={discountAmount}
                placeholder="0.0000"
                onChange={(event) => setDiscountAmount(event.target.value)}
              />
            </div>
            <Button type="submit" busy={busy} className="w-fit">
              <Plus size={16} weight="bold" aria-hidden="true" />
              Agregar línea
            </Button>
          </form>
        ) : null}

        {isDraft || isConfirmed ? (
          <div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-5">
            {isDraft ? (
              <Button type="button" busy={actionBusy === "confirm"} onClick={() => void runAction("confirm")}>
                <CheckCircle size={16} weight="bold" aria-hidden="true" />
                Confirmar (reserva inventario)
              </Button>
            ) : null}
            {isConfirmed ? (
              <Button type="button" busy={actionBusy === "fulfill"} onClick={() => void runAction("fulfill")}>
                <Package size={16} weight="bold" aria-hidden="true" />
                Despachar
              </Button>
            ) : null}
            <Button type="button" variant="quiet" busy={actionBusy === "cancel"} onClick={() => void runAction("cancel")}>
              <XCircle size={16} weight="bold" aria-hidden="true" />
              Cancelar pedido
            </Button>
          </div>
        ) : null}

        {order ? <PaymentsSection order={order} selection={selection} companyId={companyId} /> : null}
      </div>
    </Modal>
  );
}

export function SalesOrdersPanel({
  selection,
  companyId,
  customers,
  products,
  warehouses,
  taxes,
  active,
  focusOrder,
  onFocusOrderConsumed,
}: SalesOrdersPanelProps) {
  const { getAccessToken } = useAuth();
  const [orders, setOrders] = useState<SalesOrderResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<SalesOrderResponse | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOrders(await apiClient.listSalesOrders(accessToken, selection.slug, companyId, {}, signal));
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

  useEffect(() => {
    if (!focusOrder) return;
    setOrders((current) => {
      const existing = current ?? [];
      return existing.some((o) => o.id === focusOrder.id) ? existing : [...existing, focusOrder];
    });
    setDetailOrder(focusOrder);
    onFocusOrderConsumed();
  }, [focusOrder, onFocusOrderConsumed]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createSalesOrder(accessToken, selection.slug, companyId, { customerId, currency });
      setOrders((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setCustomerId("");
      setCurrency("USD");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Pedidos de venta de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo pedido
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
        <Table aria-busy={orders === null}>
          <TableCaption>Pedidos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Cliente</TableHead>
              <TableHead scope="col">Canal</TableHead>
              <TableHead scope="col">Moneda</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders === null ? (
              <LoadingRows columns={5} />
            ) : orders.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay pedidos" />
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-[12px] font-semibold">{customerLabel(customers, order.customerId)}</TableCell>
                  <TableCell className="text-[12px]">{channelLabel(order.channel)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{order.currency}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(order.status === "DRAFT" || order.status === "CONFIRMED")}`}>
                      {salesOrderStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setDetailOrder(order)}>
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
        title="Nuevo pedido"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="sales-order-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="sales-order-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          {customers.length === 0 ? (
            <ErrorNotice message="Todavía no hay clientes en esta empresa. Crea al menos uno en Contactos." />
          ) : (
            <CustomerSelect fieldPrefix="sales-order" customers={customers} value={customerId} onChange={setCustomerId} />
          )}
          <FormField
            name="sales-order-currency"
            label="Moneda (ISO 4217)"
            value={currency}
            required
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
        </form>
      </Modal>

      <SalesOrderDetailModal
        order={detailOrder}
        selection={selection}
        companyId={companyId}
        products={products}
        warehouses={warehouses}
        taxes={taxes}
        onOpenChange={(open) => !open && setDetailOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
          setDetailOrder(updated);
        }}
      />
    </section>
  );
}
