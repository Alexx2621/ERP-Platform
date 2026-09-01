import { CheckCircle, Lock, ListDashes, Plus, Trash, Truck, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CreatePurchaseReceiptLineInput,
  ProductResponse,
  PurchaseOrderLineResponse,
  PurchaseOrderResponse,
  PurchaseReceiptResponse,
  SupplierResponse,
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
  LineTargetFields,
  SupplierSelect,
  isAbortError,
  productLabel,
  purchaseOrderStatusLabel,
  statusToneClass,
  supplierLabel,
  type WorkspaceSelection,
} from "./purchasing-shared";

interface PurchaseOrdersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  suppliers: SupplierResponse[];
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  active: boolean;
}

interface DraftReceiptLine extends CreatePurchaseReceiptLineInput {
  productLabel: string;
}

interface ReceivingSectionProps {
  order: PurchaseOrderResponse;
  lines: PurchaseOrderLineResponse[];
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
}

function ReceivingSection({ order, lines, selection, companyId, products }: ReceivingSectionProps) {
  const { getAccessToken } = useAuth();
  const [receipts, setReceipts] = useState<PurchaseReceiptResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [selectedLineId, setSelectedLineId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("");
  const [draftLines, setDraftLines] = useState<DraftReceiptLine[]>([]);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setReceipts(await apiClient.listPurchaseReceipts(accessToken, selection.slug, companyId, { purchaseOrderId: order.id }, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, order.id, selection.slug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const addDraftLine = () => {
    if (!selectedLineId || !lineQuantity) return;
    const orderLine = lines.find((line) => line.id === selectedLineId);
    setDraftLines((current) => [
      ...current,
      {
        purchaseOrderLineId: selectedLineId,
        quantity: lineQuantity,
        productLabel: orderLine ? productLabel(products, orderLine.productId) : selectedLineId,
      },
    ]);
    setSelectedLineId("");
    setLineQuantity("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftLines.length === 0) {
      setFormError("Agrega al menos una línea antes de registrar la recepción.");
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createPurchaseReceipt(accessToken, selection.slug, companyId, {
        purchaseOrderId: order.id,
        lines: draftLines.map(({ purchaseOrderLineId, quantity }) => ({ purchaseOrderLineId, quantity })),
      });
      setReceipts((current) => [created, ...(current ?? [])]);
      setDraftLines([]);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 border-t border-[var(--line)] pt-5">
      <p className="text-[12px] font-extrabold text-[var(--ink)]">Recepciones</p>
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <Table aria-busy={receipts === null}>
          <TableCaption>Recepciones registradas contra esta orden</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Fecha</TableHead>
              <TableHead scope="col">Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts === null ? (
              <LoadingRows columns={2} />
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={2} title="Todavía no hay recepciones" />
              </TableRow>
            ) : (
              receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-mono text-[11px]">{new Date(receipt.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-[12px]">{receipt.notes ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {formError ? <ErrorNotice message={formError} /> : null}
        <p className="text-[11px] font-bold text-[var(--muted-strong)]">Registrar recepción (parcial o total)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[12px] font-bold text-[var(--muted-strong)]">
            Línea de la orden
            <select
              className="h-10 rounded-[8px] border border-[var(--line)] bg-[var(--field)] px-3 text-[13px] font-medium text-[var(--ink)]"
              value={selectedLineId}
              onChange={(event) => setSelectedLineId(event.target.value)}
            >
              <option value="">Selecciona una línea</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {productLabel(products, line.productId)} · {line.quantity}
                </option>
              ))}
            </select>
          </label>
          <FormField
            name="receipt-line-quantity"
            label="Cantidad recibida"
            value={lineQuantity}
            placeholder="5.0000"
            onChange={(event) => setLineQuantity(event.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" className="w-fit" onClick={addDraftLine} disabled={!selectedLineId || !lineQuantity}>
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

        <Button type="submit" busy={busy} className="w-fit" disabled={draftLines.length === 0}>
          <Truck size={16} weight="bold" aria-hidden="true" />
          Registrar recepción
        </Button>
      </form>
    </div>
  );
}

interface DetailModalProps {
  order: PurchaseOrderResponse | null;
  selection: WorkspaceSelection;
  companyId: string;
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: (order: PurchaseOrderResponse) => void;
}

function PurchaseOrderDetailModal({ order, selection, companyId, products, warehouses, onOpenChange, onOrderUpdated }: DetailModalProps) {
  const { getAccessToken } = useAuth();
  const [lines, setLines] = useState<PurchaseOrderLineResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<"confirm" | "close" | "cancel">();
  const [actionError, setActionError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!order) return;
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setLines(await apiClient.listPurchaseOrderLines(accessToken, selection.slug, companyId, order.id, signal));
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
    setQuantity("");
    setUnitCost("");
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
      const created = await apiClient.addPurchaseOrderLine(accessToken, selection.slug, companyId, order.id, {
        productId,
        productVariantId: productVariantId || undefined,
        warehouseId: warehouseId || undefined,
        quantity,
        unitCost: unitCost || undefined,
      });
      setLines((current) => [...(current ?? []), created]);
      setProductId("");
      setProductVariantId("");
      setWarehouseId("");
      setQuantity("");
      setUnitCost("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: "confirm" | "close" | "cancel") => {
    if (!order) return;
    setActionError(undefined);
    setActionBusy(action);
    try {
      const accessToken = await getAccessToken();
      const updated =
        action === "confirm"
          ? await apiClient.confirmPurchaseOrder(accessToken, selection.slug, companyId, order.id)
          : action === "close"
            ? await apiClient.closePurchaseOrder(accessToken, selection.slug, companyId, order.id)
            : await apiClient.cancelPurchaseOrder(accessToken, selection.slug, companyId, order.id);
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
      title={order ? `Orden de compra ${order.currency} · ${purchaseOrderStatusLabel(order.status)}` : "Orden de compra"}
      description="Confirmar requiere el permiso de aprobación (purchasing.orders.approve), distinto de administrar la orden."
    >
      <div className="grid gap-6">
        {actionError ? <ErrorNotice message={actionError} /> : null}
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <Table aria-busy={lines === null}>
            <TableCaption>Líneas de la orden</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Cantidad</TableHead>
                <TableHead scope="col">Costo unit.</TableHead>
                <TableHead scope="col">Total</TableHead>
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
                    <TableCell className="font-mono text-[11px]">{line.unitCost}</TableCell>
                    <TableCell className="font-mono text-[11px] font-bold">{line.lineTotal}</TableCell>
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
              fieldPrefix="po-line"
              selection={selection}
              companyId={companyId}
              products={products}
              warehouses={warehouses}
              productId={productId}
              onProductIdChange={setProductId}
              productVariantId={productVariantId}
              onProductVariantIdChange={setProductVariantId}
              warehouseId={warehouseId}
              onWarehouseIdChange={setWarehouseId}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                name="po-line-quantity"
                label="Cantidad"
                value={quantity}
                required
                placeholder="10.0000"
                onChange={(event) => setQuantity(event.target.value)}
              />
              <FormField
                name="po-line-unitCost"
                label="Costo unitario (opcional)"
                value={unitCost}
                placeholder="Usa el costo del producto"
                onChange={(event) => setUnitCost(event.target.value)}
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
                Confirmar (aprobar)
              </Button>
            ) : null}
            {isConfirmed ? (
              <Button type="button" busy={actionBusy === "close"} onClick={() => void runAction("close")}>
                <Lock size={16} weight="bold" aria-hidden="true" />
                Cerrar orden
              </Button>
            ) : null}
            <Button type="button" variant="quiet" busy={actionBusy === "cancel"} onClick={() => void runAction("cancel")}>
              <XCircle size={16} weight="bold" aria-hidden="true" />
              Cancelar orden
            </Button>
          </div>
        ) : null}

        {order && isConfirmed && lines ? (
          <ReceivingSection order={order} lines={lines} selection={selection} companyId={companyId} products={products} />
        ) : null}
      </div>
    </Modal>
  );
}

export function PurchaseOrdersPanel({ selection, companyId, suppliers, products, warehouses, active }: PurchaseOrdersPanelProps) {
  const { getAccessToken } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrderResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrderResponse | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOrders(await apiClient.listPurchaseOrders(accessToken, selection.slug, companyId, {}, signal));
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createPurchaseOrder(accessToken, selection.slug, companyId, { supplierId, currency });
      setOrders((current) => [...(current ?? []), created]);
      setModalOpen(false);
      setSupplierId("");
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
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Órdenes de compra a proveedores de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva orden
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
          <TableCaption>Órdenes de compra</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Proveedor</TableHead>
              <TableHead scope="col">Moneda</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders === null ? (
              <LoadingRows columns={4} />
            ) : orders.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="Todavía no hay órdenes de compra" />
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-[12px] font-semibold">{supplierLabel(suppliers, order.supplierId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{order.currency}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(order.status === "DRAFT" || order.status === "CONFIRMED")}`}>
                      {purchaseOrderStatusLabel(order.status)}
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
        title="Nueva orden de compra"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="purchase-order-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="purchase-order-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          {suppliers.length === 0 ? (
            <ErrorNotice message="Todavía no hay proveedores en esta empresa. Crea al menos uno en Contactos." />
          ) : (
            <SupplierSelect fieldPrefix="purchase-order" suppliers={suppliers} value={supplierId} onChange={setSupplierId} />
          )}
          <FormField
            name="purchase-order-currency"
            label="Moneda (ISO 4217)"
            value={currency}
            required
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
        </form>
      </Modal>

      <PurchaseOrderDetailModal
        order={detailOrder}
        selection={selection}
        companyId={companyId}
        products={products}
        warehouses={warehouses}
        onOpenChange={(open) => !open && setDetailOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
          setDetailOrder(updated);
        }}
      />
    </section>
  );
}
