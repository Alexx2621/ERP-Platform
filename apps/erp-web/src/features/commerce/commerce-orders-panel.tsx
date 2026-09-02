import { useCallback, useEffect, useState } from "react";
import type { CommerceOrderResponse } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { Button } from "../../shared/ui/button";
import { LoadingRows } from "../../shared/ui/loading-rows";
import { ErrorNotice } from "../../shared/ui/notice";
import { Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../../shared/ui/table";
import { isAbortError, type WorkspaceSelection } from "./commerce-shared";

interface CommerceOrdersPanelProps {
  selection: WorkspaceSelection;
  companyId: string;
  active: boolean;
}

export function CommerceOrdersPanel({ selection, companyId, active }: CommerceOrdersPanelProps) {
  const { getAccessToken } = useAuth();
  const [orders, setOrders] = useState<CommerceOrderResponse[] | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(undefined);
      try {
        const accessToken = await getAccessToken();
        setOrders(await apiClient.listCommerceOrders(accessToken, selection.slug, companyId, {}, signal));
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

  return (
    <section className="grid gap-4">
      <p className="text-[12px] font-medium text-[var(--muted-strong)]">
        Pedidos completados desde la tienda en línea. El pago (si sigue pendiente) y el despacho se gestionan desde las pantallas de
        Ventas y Pagos, igual que cualquier otro canal.
      </p>
      {error ? (
        <div className="grid gap-3">
          <ErrorNotice message={error} />
          <Button type="button" variant="secondary" className="w-fit" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Table aria-busy={orders === null}>
          <TableCaption>Pedidos de comercio en línea</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Cliente</TableHead>
              <TableHead scope="col">Total</TableHead>
              <TableHead scope="col">Pago</TableHead>
              <TableHead scope="col">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders === null ? (
              <LoadingRows columns={4} />
            ) : orders.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4} title="Todavía no hay pedidos en línea" />
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-[12px] font-semibold">{order.guestEmail}</TableCell>
                  <TableCell className="font-mono text-[11px] font-bold">
                    {order.currency} {order.total}
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${order.paymentId ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                      {order.paymentId ? "Capturado" : "Pendiente"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{new Date(order.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
