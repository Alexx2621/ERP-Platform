import { Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { InventoryBalanceResponse, ProductResponse, WarehouseResponse } from "@erp/api-client";
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
import { isAbortError, ProductAndVariantFields, WarehouseSelect, type WorkspaceSelection } from "./inventory-shared";

interface BalancesPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  active: boolean;
}

type MovementKind = "RECEIPT" | "ISSUE" | "ADJUSTMENT";

function productLabel(products: ProductResponse[], productId: string, productVariantId: string | null): string {
  const product = products.find((p) => p.id === productId);
  const base = product ? `${product.name} (${product.code})` : productId;
  return productVariantId ? `${base} · variante` : base;
}

function warehouseLabel(warehouses: WarehouseResponse[], warehouseId: string): string {
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  return warehouse ? `${warehouse.name} (${warehouse.code})` : warehouseId;
}

interface MovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  onPosted: () => void;
}

function MovementModal({ open, onOpenChange, selection, companyId, warehouses, products, onPosted }: MovementModalProps) {
  const { getAccessToken } = useAuth();
  const [kind, setKind] = useState<MovementKind>("RECEIPT");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("RECEIPT");
    setWarehouseId("");
    setProductId("");
    setProductVariantId("");
    setQuantity("");
    setDirection("INCREASE");
    setReason("");
    setFormError(undefined);
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      const base = {
        warehouseId,
        productId,
        productVariantId: productVariantId || undefined,
        quantity,
      };
      if (kind === "RECEIPT") {
        await apiClient.recordInventoryReceipt(accessToken, selection.slug, companyId, {
          ...base,
          reason: reason || undefined,
        });
      } else if (kind === "ISSUE") {
        await apiClient.recordInventoryIssue(accessToken, selection.slug, companyId, {
          ...base,
          reason: reason || undefined,
        });
      } else {
        await apiClient.adjustInventory(accessToken, selection.slug, companyId, {
          ...base,
          direction,
          reason,
        });
      }
      onPosted();
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
      title="Registrar movimiento"
      description="Recepción, salida o ajuste manual de inventario."
      footer={
        <>
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="movement-form" busy={busy}>
            Registrar
          </Button>
        </>
      }
    >
      <form
        id="movement-form"
        className="grid gap-5"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {formError ? <ErrorNotice message={formError} /> : null}
        <Select
          name="movement-kind"
          label="Tipo de movimiento"
          value={kind}
          onChange={(event) => setKind(event.target.value as MovementKind)}
        >
          <option value="RECEIPT">Recepción (entra stock)</option>
          <option value="ISSUE">Salida (sale stock)</option>
          <option value="ADJUSTMENT">Ajuste manual</option>
        </Select>
        <WarehouseSelect fieldPrefix="movement" label="Bodega" warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} required />
        <ProductAndVariantFields
          fieldPrefix="movement"
          selection={selection}
          companyId={companyId}
          products={products}
          productId={productId}
          onProductIdChange={setProductId}
          productVariantId={productVariantId}
          onProductVariantIdChange={setProductVariantId}
        />
        {kind === "ADJUSTMENT" ? (
          <Select
            name="movement-direction"
            label="Dirección del ajuste"
            value={direction}
            onChange={(event) => setDirection(event.target.value as "INCREASE" | "DECREASE")}
          >
            <option value="INCREASE">Aumentar existencias</option>
            <option value="DECREASE">Disminuir existencias</option>
          </Select>
        ) : null}
        <FormField
          name="movement-quantity"
          label="Cantidad"
          value={quantity}
          required
          placeholder="10.0000"
          onChange={(event) => setQuantity(event.target.value)}
        />
        <FormField
          name="movement-reason"
          label={kind === "ADJUSTMENT" ? "Motivo (obligatorio)" : "Motivo (opcional)"}
          value={reason}
          required={kind === "ADJUSTMENT"}
          placeholder="Conteo físico, mercancía dañada, etc."
          onChange={(event) => setReason(event.target.value)}
        />
      </form>
    </Modal>
  );
}

export function BalancesPanel({ selection, companyId, warehouses, products, active }: BalancesPanelProps) {
  const { getAccessToken } = useAuth();
  const [balances, setBalances] = useState<InventoryBalanceResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setBalances(
          await apiClient.listInventoryBalances(
            accessToken,
            selection.slug,
            companyId,
            { warehouseId: filterWarehouseId || undefined, productId: filterProductId || undefined },
            signal,
          ),
        );
      } catch (caught) {
        if (!isAbortError(caught)) setError(getErrorMessage(caught));
      }
    },
    [companyId, filterProductId, filterWarehouseId, getAccessToken, selection.slug],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [active, load]);

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <WarehouseSelect fieldPrefix="balances-filter" label="Bodega" warehouses={warehouses} value={filterWarehouseId} onChange={setFilterWarehouseId} />
          <Select
            name="balances-filter-productId"
            label="Producto"
            value={filterProductId}
            onChange={(event) => setFilterProductId(event.target.value)}
          >
            <option value="">Todos los productos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Registrar movimiento
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
        <Table aria-busy={balances === null}>
          <TableCaption>Existencias</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Bodega</TableHead>
              <TableHead scope="col">Producto</TableHead>
              <TableHead scope="col">En bodega</TableHead>
              <TableHead scope="col">Reservado</TableHead>
              <TableHead scope="col">Disponible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances === null ? (
              <LoadingRows columns={5} />
            ) : balances.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5} title="Todavía no hay existencias registradas" />
              </TableRow>
            ) : (
              balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell className="text-[12px] font-semibold">{warehouseLabel(warehouses, balance.warehouseId)}</TableCell>
                  <TableCell className="text-[12px] font-semibold">
                    {productLabel(products, balance.productId, balance.productVariantId)}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{balance.onHandQuantity}</TableCell>
                  <TableCell className="font-mono text-[11px]">{balance.reservedQuantity}</TableCell>
                  <TableCell className="font-mono text-[11px] font-bold text-[var(--accent)]">{balance.availableQuantity}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <MovementModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selection={selection}
        companyId={companyId}
        warehouses={warehouses}
        products={products}
        onPosted={() => void load()}
      />
    </section>
  );
}
