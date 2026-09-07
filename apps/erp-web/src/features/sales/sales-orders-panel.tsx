import { ListDashes, Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CustomerResponse, SalesOrderResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { formatDate } from "../../shared/format/date";
import { formatMoney } from "../../shared/format/money";
import { Button } from "../../shared/ui/button";
import {
  DataTableFilter,
  DataTableToolbar,
  PaginationFooter,
  SortableHead,
  useWorkTable,
} from "../../shared/ui/data-table";
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
import {
  channelLabel,
  customerLabel,
  isAbortError,
  salesOrderStatusLabel,
  salesOrderStatusTone,
  type WorkspaceSelection,
} from "./sales-shared";

/**
 * Sales-order work list. Creating and editing an order happens in
 * `SalesOrderEditor` (a full page), not in a modal chain — this panel is now
 * purely the list: search, status filter, sortable columns, pagination, and
 * the number/date/total columns the previous version had no way to show.
 */
interface SalesOrdersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  customers: CustomerResponse[];
  active: boolean;
  /** `null` opens a blank editor; an id opens that order. */
  onOpenEditor: (orderId: string | null) => void;
  /** Bumped after the editor changes an order, so the list refreshes in place. */
  reloadToken: number;
}

export function SalesOrdersPanel({
  selection,
  companyId,
  customers,
  active,
  onOpenEditor,
  reloadToken,
}: SalesOrdersPanelProps) {
  const { getAccessToken } = useAuth();
  const [orders, setOrders] = useState<SalesOrderResponse[] | null>(null);
  const [error, setError] = useState<string>();
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOrders(
          await apiClient.listSalesOrders(accessToken, selection.slug, companyId, { limit: 200 }, signal),
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
  }, [active, load, reloadToken]);

  const rows = useMemo(() => orders ?? [], [orders]);
  const searchable = useCallback(
    (order: SalesOrderResponse) =>
      `${order.number} ${customerLabel(customers, order.customerId)} ${order.currency}`,
    [customers],
  );
  const sortValue = useCallback(
    (order: SalesOrderResponse, column: string): string | number => {
      switch (column) {
        case "customer":
          return customerLabel(customers, order.customerId);
        case "createdAt":
          return new Date(order.createdAt).getTime();
        case "total":
          return Number(order.total);
        case "status":
          return order.status;
        default:
          return order.number;
      }
    },
    [customers],
  );
  const filter = useCallback(
    (order: SalesOrderResponse) => statusFilter === "" || order.status === statusFilter,
    [statusFilter],
  );
  const table = useWorkTable<SalesOrderResponse>({
    rows,
    searchable,
    sortValue,
    filter,
    initialSort: { column: "createdAt", direction: "desc" },
  });

  if (error) {
    return (
      <div className="grid gap-3">
        <ErrorNotice message={error} />
        <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <section>
      <DataTableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Buscar por número o cliente…"
        filters={
          <DataTableFilter
            label="Estado"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "Todos los estados" },
              { value: "DRAFT", label: "Borrador" },
              { value: "CONFIRMED", label: "Confirmado" },
              { value: "FULFILLED", label: "Despachado" },
              { value: "CANCELLED", label: "Cancelado" },
            ]}
          />
        }
        action={
          <Button type="button" onClick={() => onOpenEditor(null)}>
            <Plus size={17} weight="bold" aria-hidden="true" />
            Nuevo pedido
          </Button>
        }
      />
      <Table aria-busy={orders === null}>
        <TableCaption>Pedidos</TableCaption>
        <TableHeader>
          <TableRow>
            <SortableHead scope="col" column="number" sort={table.sort} onSortChange={table.setSort}>
              Número
            </SortableHead>
            <SortableHead scope="col" column="createdAt" sort={table.sort} onSortChange={table.setSort}>
              Fecha
            </SortableHead>
            <SortableHead scope="col" column="customer" sort={table.sort} onSortChange={table.setSort}>
              Cliente
            </SortableHead>
            <TableHead scope="col">Canal</TableHead>
            <SortableHead
              scope="col"
              column="total"
              sort={table.sort}
              onSortChange={table.setSort}
              className="text-right"
            >
              Total
            </SortableHead>
            <TableHead scope="col">Estado</TableHead>
            <TableHead scope="col" className="text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders === null ? (
            <LoadingRows columns={7} />
          ) : table.visible.length === 0 ? (
            <TableRow>
              <TableEmpty
                colSpan={7}
                title={orders.length === 0 ? "Todavía no hay pedidos" : "Ningún resultado"}
                description={
                  orders.length === 0
                    ? undefined
                    : "Ajusta la búsqueda o el filtro de estado para ver más registros."
                }
              />
            </TableRow>
          ) : (
            table.visible.map((order) => (
              <TableRow key={order.id} className="cursor-pointer" onClick={() => onOpenEditor(order.id)}>
                <TableCell className="whitespace-nowrap font-mono text-[12px]">{order.number}</TableCell>
                <TableCell className="whitespace-nowrap text-[12px] font-medium text-[var(--muted-strong)]">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className="text-[12px] font-semibold">
                  {customerLabel(customers, order.customerId)}
                </TableCell>
                <TableCell className="text-[12px]">{channelLabel(order.channel)}</TableCell>
                <TableCell className="whitespace-nowrap text-right font-mono text-[12px]">
                  {formatMoney(order.total, order.currency)}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={salesOrderStatusTone(order.status)}>
                    {salesOrderStatusLabel(order.status)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-3"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenEditor(order.id);
                    }}
                  >
                    <ListDashes size={16} weight="bold" aria-hidden="true" />
                    Abrir
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <PaginationFooter
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        filtered={table.filteredCount}
        onPageChange={table.setPage}
      />
    </section>
  );
}
