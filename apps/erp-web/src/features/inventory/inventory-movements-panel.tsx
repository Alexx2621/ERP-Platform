import { useCallback, useEffect, useState } from "react";
import type { InventoryMovementResponse, ProductResponse, WarehouseResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { LoadingRows } from "../../shared/ui/loading-rows";
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
import { isAbortError, WarehouseSelect, type WorkspaceSelection } from "./inventory-shared";

interface MovementsPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  warehouses: WarehouseResponse[];
  products: ProductResponse[];
  active: boolean;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Recepción",
  ISSUE: "Salida",
  ADJUSTMENT: "Ajuste",
  TRANSFER_OUT: "Transferencia (salida)",
  TRANSFER_IN: "Transferencia (entrada)",
  TRANSFER_CANCELLED: "Transferencia cancelada",
  RESERVATION: "Reserva",
  RELEASE: "Liberación de reserva",
};

function productLabel(products: ProductResponse[], productId: string): string {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.code})` : productId;
}

function warehouseLabel(warehouses: WarehouseResponse[], warehouseId: string): string {
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  return warehouse ? `${warehouse.name} (${warehouse.code})` : warehouseId;
}

export function MovementsPanel({ selection, companyId, warehouses, products, active }: MovementsPanelProps) {
  const { getAccessToken } = useAuth();
  const [movements, setMovements] = useState<InventoryMovementResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setMovements(
          await apiClient.listInventoryMovements(
            accessToken,
            selection.slug,
            companyId,
            { warehouseId: filterWarehouseId || undefined, productId: filterProductId || undefined, limit: 100 },
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
          <WarehouseSelect fieldPrefix="movements-filter" label="Bodega" warehouses={warehouses} value={filterWarehouseId} onChange={setFilterWarehouseId} />
          <Select
            name="movements-filter-productId"
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
      </div>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={movements === null}>
          <TableCaption>Movimientos (ledger, solo lectura — cada fila es permanente)</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Fecha</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Bodega</TableHead>
              <TableHead scope="col">Producto</TableHead>
              <TableHead scope="col">Cantidad</TableHead>
              <TableHead scope="col">Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements === null ? (
              <LoadingRows columns={6} />
            ) : movements.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6} title="Todavía no hay movimientos" />
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-[11px] text-[var(--muted-strong)]">
                    {new Date(movement.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold">
                    {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                  </TableCell>
                  <TableCell className="text-[12px]">{warehouseLabel(warehouses, movement.warehouseId)}</TableCell>
                  <TableCell className="text-[12px]">{productLabel(products, movement.productId)}</TableCell>
                  <TableCell
                    className={`font-mono text-[11px] font-bold ${movement.quantity.startsWith("-") ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}
                  >
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="text-[11px] text-[var(--muted-strong)]">{movement.reason ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
