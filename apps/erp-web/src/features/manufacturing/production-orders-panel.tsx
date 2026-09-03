import { CheckCircle, Check, Lock, ListDashes, Package, Plus, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  BillOfMaterialResponse,
  ProductionOrderFinishedGoodsReceiptResponse,
  ProductionOrderMaterialResponse,
  ProductionOrderOperationResponse,
  ProductionOrderResponse,
  ProductResponse,
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
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import {
  isAbortError,
  productLabel,
  productionOrderStatusLabel,
  statusToneClass,
  type WorkspaceSelection,
} from "./manufacturing-shared";

function billOfMaterialLabel(billsOfMaterial: BillOfMaterialResponse[], billOfMaterialId: string): string {
  const bom = billsOfMaterial.find((b) => b.id === billOfMaterialId);
  return bom ? `${bom.name} (v${bom.version})` : billOfMaterialId;
}

interface MaterialsSectionProps {
  order: ProductionOrderResponse;
  materials: ProductionOrderMaterialResponse[] | null;
  products: ProductResponse[];
  selection: WorkspaceSelection;
  companyId: string;
  onMaterialsChanged: (materials: ProductionOrderMaterialResponse[]) => void;
}

function MaterialsSection({ order, materials, products, selection, companyId, onMaterialsChanged }: MaterialsSectionProps) {
  const { getAccessToken } = useAuth();
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState<"issue" | "return">();
  const [formError, setFormError] = useState<string>();

  const refresh = useCallback(async () => {
    const accessToken = await getAccessToken();
    onMaterialsChanged(await apiClient.listProductionOrderMaterials(accessToken, selection.slug, companyId, order.id));
  }, [companyId, getAccessToken, onMaterialsChanged, order.id, selection.slug]);

  const runMovement = async (type: "issue" | "return") => {
    if (!selectedMaterialId || !quantity) return;
    setFormError(undefined);
    setBusy(type);
    try {
      const accessToken = await getAccessToken();
      if (type === "issue") {
        await apiClient.issueProductionOrderMaterial(accessToken, selection.slug, companyId, order.id, {
          productionOrderMaterialId: selectedMaterialId,
          quantity,
        });
      } else {
        await apiClient.returnProductionOrderMaterial(accessToken, selection.slug, companyId, order.id, {
          productionOrderMaterialId: selectedMaterialId,
          quantity,
        });
      }
      setQuantity("");
      await refresh();
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="grid gap-4 border-t border-[var(--line)] pt-5">
      <p className="text-[12px] font-extrabold text-[var(--ink)]">Materiales</p>
      <Table aria-busy={materials === null}>
        <TableCaption>Requerimientos de material de esta orden</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Componente</TableHead>
            <TableHead scope="col">Requerido</TableHead>
            <TableHead scope="col">Emitido neto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials === null ? (
            <LoadingRows columns={3} />
          ) : materials.length === 0 ? (
            <TableRow>
              <TableEmpty colSpan={3} title="Sin materiales" />
            </TableRow>
          ) : (
            materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="text-[12px] font-semibold">{productLabel(products, material.componentProductId)}</TableCell>
                <TableCell className="font-mono text-[11px]">{material.quantityRequired}</TableCell>
                <TableCell className="font-mono text-[11px]">{material.quantityIssuedNet}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {order.status === "CONFIRMED" ? (
        <div className="grid gap-4">
          {formError ? <ErrorNotice message={formError} /> : null}
          <p className="text-[11px] font-bold text-[var(--muted-strong)]">Emitir o devolver material (parcial o total)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="material-select" label="Material" value={selectedMaterialId} onChange={(event) => setSelectedMaterialId(event.target.value)}>
              <option value="">Selecciona un material</option>
              {(materials ?? []).map((material) => (
                <option key={material.id} value={material.id}>
                  {productLabel(products, material.componentProductId)}
                </option>
              ))}
            </Select>
            <FormField name="material-quantity" label="Cantidad" value={quantity} placeholder="2.0000" onChange={(event) => setQuantity(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" busy={busy === "issue"} disabled={!selectedMaterialId || !quantity} onClick={() => void runMovement("issue")}>
              Emitir
            </Button>
            <Button type="button" variant="secondary" busy={busy === "return"} disabled={!selectedMaterialId || !quantity} onClick={() => void runMovement("return")}>
              Devolver
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface OperationsSectionProps {
  order: ProductionOrderResponse;
  selection: WorkspaceSelection;
  companyId: string;
}

function OperationsSection({ order, selection, companyId }: OperationsSectionProps) {
  const { getAccessToken } = useAuth();
  const [operations, setOperations] = useState<ProductionOrderOperationResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [completingId, setCompletingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOperations(await apiClient.listProductionOrderOperations(accessToken, selection.slug, companyId, order.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, order.id, selection.slug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const addOperation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.addProductionOrderOperation(accessToken, selection.slug, companyId, order.id, { name });
      setOperations((current) => [...(current ?? []), created]);
      setName("");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (operation: ProductionOrderOperationResponse) => {
    setCompletingId(operation.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.completeProductionOrderOperation(accessToken, selection.slug, companyId, order.id, operation.id);
      setOperations((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setCompletingId(undefined);
    }
  };

  return (
    <div className="grid gap-4 border-t border-[var(--line)] pt-5">
      <p className="text-[12px] font-extrabold text-[var(--ink)]">Operaciones</p>
      {error ? <ErrorNotice message={error} /> : null}
      <Table aria-busy={operations === null}>
        <TableCaption>Pasos del proceso de producción</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Nombre</TableHead>
            <TableHead scope="col">Estado</TableHead>
            <TableHead scope="col" className="text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations === null ? (
            <LoadingRows columns={3} />
          ) : operations.length === 0 ? (
            <TableRow>
              <TableEmpty colSpan={3} title="Sin operaciones" />
            </TableRow>
          ) : (
            operations.map((operation) => (
              <TableRow key={operation.id}>
                <TableCell className="text-[12px] font-semibold">{operation.name}</TableCell>
                <TableCell className="text-[11px] font-bold text-[var(--muted)]">{operation.completedAt ? "Completada" : "Pendiente"}</TableCell>
                <TableCell className="text-right">
                  {!operation.completedAt && (order.status === "DRAFT" || order.status === "CONFIRMED") ? (
                    <Button type="button" variant="secondary" className="h-9 px-3" busy={completingId === operation.id} onClick={() => void complete(operation)}>
                      <Check size={16} weight="bold" aria-hidden="true" />
                      Completar
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {order.status === "DRAFT" || order.status === "CONFIRMED" ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            void addOperation(event);
          }}
        >
          <FormField name="operation-name" label="Nueva operación" value={name} placeholder="Corte" onChange={(event) => setName(event.target.value)} />
          <Button type="submit" busy={busy} disabled={!name.trim()}>
            <Plus size={16} weight="bold" aria-hidden="true" />
            Agregar
          </Button>
        </form>
      ) : null}
    </div>
  );
}

interface FinishedGoodsSectionProps {
  order: ProductionOrderResponse;
  selection: WorkspaceSelection;
  companyId: string;
  onOrderUpdated: (order: ProductionOrderResponse) => void;
}

function FinishedGoodsSection({ order, selection, companyId, onOrderUpdated }: FinishedGoodsSectionProps) {
  const { getAccessToken } = useAuth();
  const [receipts, setReceipts] = useState<ProductionOrderFinishedGoodsReceiptResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setReceipts(await apiClient.listProductionOrderFinishedGoodsReceipts(accessToken, selection.slug, companyId, order.id, signal));
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, getAccessToken, order.id, selection.slug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quantity) return;
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.recordFinishedGoods(accessToken, selection.slug, companyId, order.id, { quantity });
      setReceipts((current) => [created, ...(current ?? [])]);
      setQuantity("");
      const updatedOrder = await apiClient.getProductionOrder(accessToken, selection.slug, companyId, order.id);
      onOrderUpdated(updatedOrder);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 border-t border-[var(--line)] pt-5">
      <p className="text-[12px] font-extrabold text-[var(--ink)]">Producto terminado</p>
      {error ? <ErrorNotice message={error} /> : null}
      <Table aria-busy={receipts === null}>
        <TableCaption>Recepciones de producto terminado</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Fecha</TableHead>
            <TableHead scope="col">Cantidad</TableHead>
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
                <TableCell className="font-mono text-[11px]">{receipt.quantity}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {order.status === "CONFIRMED" ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <FormField name="finished-goods-quantity" label="Cantidad recibida" value={quantity} placeholder="5.0000" onChange={(event) => setQuantity(event.target.value)} />
          <Button type="submit" busy={busy} disabled={!quantity}>
            <Package size={16} weight="bold" aria-hidden="true" />
            Registrar recepción
          </Button>
        </form>
      ) : null}
    </div>
  );
}

interface DetailModalProps {
  order: ProductionOrderResponse | null;
  billsOfMaterial: BillOfMaterialResponse[];
  products: ProductResponse[];
  selection: WorkspaceSelection;
  companyId: string;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: (order: ProductionOrderResponse) => void;
}

function ProductionOrderDetailModal({ order, billsOfMaterial, products, selection, companyId, onOpenChange, onOrderUpdated }: DetailModalProps) {
  const { getAccessToken } = useAuth();
  const [materials, setMaterials] = useState<ProductionOrderMaterialResponse[] | null>(null);
  const [actionBusy, setActionBusy] = useState<"confirm" | "close" | "cancel">();
  const [actionError, setActionError] = useState<string>();

  const loadMaterials = useCallback(async () => {
    if (!order) return;
    const accessToken = await getAccessToken();
    setMaterials(await apiClient.listProductionOrderMaterials(accessToken, selection.slug, companyId, order.id));
  }, [companyId, getAccessToken, order, selection.slug]);

  useEffect(() => {
    if (!order) {
      setMaterials(null);
      return;
    }
    setActionError(undefined);
    void loadMaterials();
  }, [order, loadMaterials]);

  const runAction = async (action: "confirm" | "close" | "cancel") => {
    if (!order) return;
    setActionError(undefined);
    setActionBusy(action);
    try {
      const accessToken = await getAccessToken();
      const updated =
        action === "confirm"
          ? await apiClient.confirmProductionOrder(accessToken, selection.slug, companyId, order.id)
          : action === "close"
            ? await apiClient.closeProductionOrder(accessToken, selection.slug, companyId, order.id)
            : await apiClient.cancelProductionOrder(accessToken, selection.slug, companyId, order.id);
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
      onOpenChange={(open) => !actionBusy && onOpenChange(open)}
      title={order ? `Orden de producción · ${productionOrderStatusLabel(order.status)}` : "Orden de producción"}
      description={order ? `${order.quantityCompleted} de ${order.quantityPlanned} unidades completadas.` : undefined}
      size="lg"
    >
      {order ? (
        <div className="grid gap-6">
          {actionError ? <ErrorNotice message={actionError} /> : null}

          {order.status === "DRAFT" || order.status === "CONFIRMED" ? (
            <div className="flex flex-wrap gap-3">
              {order.status === "DRAFT" ? (
                <Button type="button" busy={actionBusy === "confirm"} onClick={() => void runAction("confirm")}>
                  <CheckCircle size={16} weight="bold" aria-hidden="true" />
                  Confirmar
                </Button>
              ) : null}
              {order.status === "CONFIRMED" ? (
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

          <p className="text-[12px] font-medium text-[var(--muted-strong)]">
            Lista de materiales: {billOfMaterialLabel(billsOfMaterial, order.billOfMaterialId)}
          </p>

          <MaterialsSection
            order={order}
            materials={materials}
            products={products}
            selection={selection}
            companyId={companyId}
            onMaterialsChanged={setMaterials}
          />

          <OperationsSection order={order} selection={selection} companyId={companyId} />

          {order.status === "CONFIRMED" || order.status === "CLOSED" ? (
            <FinishedGoodsSection order={order} selection={selection} companyId={companyId} onOrderUpdated={onOrderUpdated} />
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

interface ProductionOrdersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  billsOfMaterial: BillOfMaterialResponse[];
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  active: boolean;
}

export function ProductionOrdersPanel({ selection, companyId, billsOfMaterial, products, warehouses, active }: ProductionOrdersPanelProps) {
  const { getAccessToken } = useAuth();
  const [orders, setOrders] = useState<ProductionOrderResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<ProductionOrderResponse | null>(null);

  const [billOfMaterialId, setBillOfMaterialId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantityPlanned, setQuantityPlanned] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const activeBillsOfMaterial = billsOfMaterial.filter((b) => b.status === "ACTIVE");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOrders(await apiClient.listProductionOrders(accessToken, selection.slug, companyId, {}, signal));
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
      const created = await apiClient.createProductionOrder(accessToken, selection.slug, companyId, {
        billOfMaterialId,
        warehouseId,
        quantityPlanned,
      });
      setOrders((current) => [created, ...(current ?? [])]);
      setModalOpen(false);
      setBillOfMaterialId("");
      setWarehouseId("");
      setQuantityPlanned("");
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Órdenes de producción de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)} disabled={activeBillsOfMaterial.length === 0}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva orden
        </Button>
      </div>
      {activeBillsOfMaterial.length === 0 ? (
        <ErrorNotice message="Todavía no hay listas de materiales activas. Crea una en la pestaña Listas de materiales." />
      ) : null}
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={orders === null}>
          <TableCaption>Órdenes de producción</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Producto terminado</TableHead>
              <TableHead scope="col">Planificado</TableHead>
              <TableHead scope="col">Completado</TableHead>
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
                <TableEmpty colSpan={5} title="Todavía no hay órdenes de producción" />
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-[12px] font-semibold">{productLabel(products, order.productId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{order.quantityPlanned}</TableCell>
                  <TableCell className="font-mono text-[11px]">{order.quantityCompleted}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClass(order.status === "DRAFT" || order.status === "CONFIRMED")}`}>
                      {productionOrderStatusLabel(order.status)}
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
        title="Nueva orden de producción"
        footer={
          <>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="production-order-form" busy={busy}>
              Crear
            </Button>
          </>
        }
      >
        <form
          id="production-order-form"
          className="grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          {formError ? <ErrorNotice message={formError} /> : null}
          <Select name="production-order-bom" label="Lista de materiales" value={billOfMaterialId} required onChange={(event) => setBillOfMaterialId(event.target.value)}>
            <option value="">Selecciona una lista de materiales</option>
            {activeBillsOfMaterial.map((bom) => (
              <option key={bom.id} value={bom.id}>
                {bom.name} (v{bom.version}) — {productLabel(products, bom.productId)}
              </option>
            ))}
          </Select>
          <Select name="production-order-warehouse" label="Bodega" value={warehouseId} required onChange={(event) => setWarehouseId(event.target.value)}>
            <option value="">Selecciona una bodega</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </Select>
          <FormField
            name="production-order-quantity"
            label="Cantidad a producir"
            value={quantityPlanned}
            required
            placeholder="10.0000"
            onChange={(event) => setQuantityPlanned(event.target.value)}
          />
        </form>
      </Modal>

      <ProductionOrderDetailModal
        order={detailOrder}
        billsOfMaterial={billsOfMaterial}
        products={products}
        selection={selection}
        companyId={companyId}
        onOpenChange={(open) => !open && setDetailOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
          setDetailOrder(updated);
        }}
      />
    </section>
  );
}
