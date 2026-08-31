import { Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { InventoryReservationResponse, ProductResponse, WarehouseResponse } from "@erp/api-client";
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

interface ReservationsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  active: boolean;
}

function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

function warehouseLabel(warehouses: WarehouseResponse[], warehouseId: string): string {
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  return warehouse ? `${warehouse.name} (${warehouse.code})` : warehouseId;
}

interface CreateReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  onCreated: (reservation: InventoryReservationResponse) => void;
}

function CreateReservationModal({ open, onOpenChange, selection, companyId, warehouses, products, onCreated }: CreateReservationModalProps) {
  const { getAccessToken } = useAuth();
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWarehouseId("");
    setProductId("");
    setProductVariantId("");
    setQuantity("");
    setReferenceType("");
    setReferenceId("");
    setFormError(undefined);
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const created = await apiClient.createInventoryReservation(accessToken, selection.slug, companyId, {
        warehouseId,
        productId,
        productVariantId: productVariantId || undefined,
        quantity,
        referenceType: referenceType || undefined,
        referenceId: referenceId || undefined,
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
      title="Nueva reserva"
      description="Aparta existencias sin moverlas físicamente. No puede exceder lo disponible."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="reservation-form" busy={busy}>
            Reservar
          </Button>
        </>
      }
    >
      <form
        id="reservation-form"
        className="grid gap-5"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {formError ? <ErrorNotice message={formError} /> : null}
        <WarehouseSelect fieldPrefix="reservation" label="Bodega" warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} required />
        <ProductAndVariantFields
          fieldPrefix="reservation"
          selection={selection}
          companyId={companyId}
          products={products}
          productId={productId}
          onProductIdChange={setProductId}
          productVariantId={productVariantId}
          onProductVariantIdChange={setProductVariantId}
        />
        <FormField
          name="reservation-quantity"
          label="Cantidad"
          value={quantity}
          required
          placeholder="10.0000"
          onChange={(event) => setQuantity(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="reservation-referenceType"
            label="Referencia (opcional)"
            value={referenceType}
            placeholder="p. ej. pedido"
            onChange={(event) => setReferenceType(event.target.value)}
          />
          <FormField
            name="reservation-referenceId"
            label="Id de referencia (opcional)"
            value={referenceId}
            onChange={(event) => setReferenceId(event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

export function ReservationsPanel({ selection, companyId, warehouses, products, active }: ReservationsPanelProps) {
  const { getAccessToken } = useAuth();
  const [reservations, setReservations] = useState<InventoryReservationResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setReservations(
          await apiClient.listInventoryReservations(accessToken, selection.slug, companyId, { limit: 100 }, signal),
        );
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

  const release = async (reservation: InventoryReservationResponse) => {
    setPendingId(reservation.id);
    try {
      const accessToken = await getAccessToken();
      const updated = await apiClient.releaseInventoryReservation(accessToken, selection.slug, companyId, reservation.id);
      setReservations((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium text-[var(--muted-strong)]">Reservas de inventario de la empresa activa.</p>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nueva reserva
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
        <Table aria-busy={reservations === null}>
          <TableCaption>Reservas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Bodega</TableHead>
              <TableHead scope="col">Producto</TableHead>
              <TableHead scope="col">Cantidad</TableHead>
              <TableHead scope="col">Referencia</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations === null ? (
              <LoadingRows columns={6} />
            ) : reservations.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay reservas" />
              </TableRow>
            ) : (
              reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="text-[12px]">{warehouseLabel(warehouses, reservation.warehouseId)}</TableCell>
                  <TableCell className="text-[12px]">{productLabel(products, reservation.productId)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{reservation.quantity}</TableCell>
                  <TableCell className="text-[11px] text-[var(--muted-strong)]">
                    {reservation.referenceType ? `${reservation.referenceType}${reservation.referenceId ? ` · ${reservation.referenceId}` : ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${reservation.status === "ACTIVE" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                    >
                      {reservation.status === "ACTIVE" ? "Activa" : "Liberada"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {reservation.status === "ACTIVE" ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-9 px-3"
                        busy={pendingId === reservation.id}
                        onClick={() => void release(reservation)}
                      >
                        Liberar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <CreateReservationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selection={selection}
        companyId={companyId}
        warehouses={warehouses}
        products={products}
        onCreated={(created) => setReservations((current) => [...(current ?? []), created])}
      />
    </section>
  );
}
