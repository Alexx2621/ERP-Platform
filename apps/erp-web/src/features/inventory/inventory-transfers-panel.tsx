import { Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { InventoryTransferResponse, ProductResponse, WarehouseResponse } from "@erp/api-client";
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
import { isAbortError, ProductAndVariantFields, WarehouseSelect, type WorkspaceSelection } from "./inventory-shared";

interface TransfersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  active: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  IN_TRANSIT: "En tránsito",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

function warehouseLabel(warehouses: WarehouseResponse[], warehouseId: string): string {
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  return warehouse ? `${warehouse.name} (${warehouse.code})` : warehouseId;
}

interface CreateTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  onCreated: (transfer: InventoryTransferResponse) => void;
}

function CreateTransferModal({ open, onOpenChange, selection, companyId, warehouses, products, onCreated }: CreateTransferModalProps) {
  const { getAccessToken } = useAuth();
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSourceWarehouseId("");
    setDestinationWarehouseId("");
    setProductId("");
    setProductVariantId("");
    setQuantity("");
    setFormError(undefined);
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sourceWarehouseId && sourceWarehouseId === destinationWarehouseId) {
      setFormError("La bodega de origen y destino deben ser diferentes.");
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createInventoryTransfer(accessToken, selection.slug, companyId, {
        productId,
        productVariantId: productVariantId || undefined,
        sourceWarehouseId,
        destinationWarehouseId,
        quantity,
      });
      onCreated(created);
      onOpenChange(false);
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title="Nueva transferencia"
      description="La cantidad sale de inmediato de la bodega de origen; complétala al llegar a destino."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="transfer-form" busy={busy}>
            Crear transferencia
          </Button>
        </>
      }
    >
      <form
        id="transfer-form"
        className="grid gap-5"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {formError ? <ErrorNotice message={formError} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <WarehouseSelect fieldPrefix="transfer-source" label="Bodega de origen" warehouses={warehouses} value={sourceWarehouseId} onChange={setSourceWarehouseId} required />
          <WarehouseSelect fieldPrefix="transfer-destination" label="Bodega de destino" warehouses={warehouses} value={destinationWarehouseId} onChange={setDestinationWarehouseId} required />
        </div>
        <ProductAndVariantFields
          fieldPrefix="transfer"
          selection={selection}
          companyId={companyId}
          products={products}
          productId={productId}
          onProductIdChange={setProductId}
          productVariantId={productVariantId}
          onProductVariantIdChange={setProductVariantId}
        />
        <FormField
          name="transfer-quantity"
          label="Cantidad"
          value={quantity}
          required
          placeholder="10.0000"
          onChange={(event) => setQuantity(event.target.value)}
        />
      </form>
    </Modal>
  );
}

export function TransfersPanel({ selection, companyId, warehouses, products, active }: TransfersPanelProps) {
  const { getAccessToken } = useAuth();
  const [transfers, setTransfers] = useState<InventoryTransferResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setTransfers(await apiClient.listInventoryTransfers(accessToken, selection.slug, companyId, { limit: 100 }, signal));
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

  const complete = async (transfer: InventoryTransferResponse) => {
    setPendingId(transfer.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.completeInventoryTransfer(accessToken, selection.slug, companyId, transfer.id);
      setTransfers((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  const cancel = async (transfer: InventoryTransferResponse) => {
    setPendingId(transfer.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.cancelInventoryTransfer(accessToken, selection.slug, companyId, transfer.id);
      setTransfers((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Transferencias entre bodegas de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva transferencia
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
        <Table aria-busy={transfers === null}>
          <TableCaption>Transferencias</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Producto</TableHead>
              <TableHead scope="col">Origen</TableHead>
              <TableHead scope="col">Destino</TableHead>
              <TableHead scope="col">Cantidad</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers === null ? (
              <LoadingRows columns={6} />
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay transferencias" />
              </TableRow>
            ) : (
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="text-[12px]">{productLabel(products, transfer.productId)}</TableCell>
                  <TableCell className="text-[12px]">{warehouseLabel(warehouses, transfer.sourceWarehouseId)}</TableCell>
                  <TableCell className="text-[12px]">{warehouseLabel(warehouses, transfer.destinationWarehouseId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{transfer.quantity}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${
                        transfer.status === "IN_TRANSIT"
                          ? "text-[var(--accent)]"
                          : transfer.status === "COMPLETED"
                            ? "text-[var(--ink)]"
                            : "text-[var(--muted)]"
                      }`}
                    >
                      {STATUS_LABELS[transfer.status] ?? transfer.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {transfer.status === "IN_TRANSIT" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          busy={pendingId === transfer.id}
                          onClick={() => void complete(transfer)}
                        >
                          Completar
                        </Button>
                        <Button
                          type="button"
                          variant="quiet"
                          className="h-9 px-3"
                          busy={pendingId === transfer.id}
                          onClick={() => void cancel(transfer)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <CreateTransferModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selection={selection}
        companyId={companyId}
        warehouses={warehouses}
        products={products}
        onCreated={(created) => setTransfers((current) => [...(current ?? []), created])}
      />
    </section>
  );
}
