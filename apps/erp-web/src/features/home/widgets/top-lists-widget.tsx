import type { SalesOrderResponse } from "@erp/api-client";
import type { DashboardData } from "../use-dashboard-data";

function formatMoney(amount: number): string {
  return `Q ${amount.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const RANK_STYLES = [
  "bg-[var(--accent)] text-[var(--accent-contrast)]",
  "bg-[var(--field-hover)] text-[var(--muted-strong)]",
  "bg-[var(--field-hover)] text-[var(--muted-strong)]",
];

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
        RANK_STYLES[rank] ?? RANK_STYLES[2]
      }`}
    >
      {rank + 1}
    </span>
  );
}

/**
 * Same 30-day window and same "non-cancelled" filter as the sales trend
 * chart, aggregated over `salesOrders` (capped at 200 rows, the same limit
 * every list source on this dashboard already accepts). Exported for
 * direct unit testing of the ranking math.
 */
export function buildTopCustomers(
  orders: SalesOrderResponse[],
  windowDays = 30,
): Array<{ customerId: string; total: number }> {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    if (new Date(order.createdAt).getTime() < since) continue;
    totals.set(order.customerId, (totals.get(order.customerId) ?? 0) + Number.parseFloat(order.total));
  }
  return [...totals.entries()]
    .map(([customerId, total]) => ({ customerId, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

interface TopCustomersWidgetProps {
  data: DashboardData;
}

export function TopCustomersWidget({ data }: TopCustomersWidgetProps) {
  if (!data.salesOrders || !data.customers) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">No disponible</p>;
  }
  const ranking = buildTopCustomers(data.salesOrders);
  if (ranking.length === 0) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">Sin ventas todavía en este período.</p>;
  }
  return (
    <ul className="grid gap-2.5">
      {ranking.map((row, index) => {
        const customer = data.customers?.find((c) => c.id === row.customerId);
        return (
          <li key={row.customerId} className="flex items-center gap-2.5">
            <RankBadge rank={index} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[var(--ink)]">
              {customer?.name ?? row.customerId}
            </span>
            <span className="shrink-0 font-mono text-[12px] font-bold text-[var(--muted-strong)]">
              {formatMoney(row.total)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface TopProductsWidgetProps {
  data: DashboardData;
}

export function TopProductsWidget({ data }: TopProductsWidgetProps) {
  if (!data.topProducts) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">No disponible</p>;
  }
  if (data.topProducts.length === 0) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">Sin ventas todavía en este período.</p>;
  }
  return (
    <ul className="grid gap-2.5">
      {data.topProducts.map((product, index) => (
        <li key={product.productId} className="flex items-center gap-2.5">
          <RankBadge rank={index} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[var(--ink)]">
            {product.productName}
          </span>
          <span className="shrink-0 font-mono text-[12px] font-bold text-[var(--muted-strong)]">
            {formatMoney(Number.parseFloat(product.revenue))}
          </span>
        </li>
      ))}
    </ul>
  );
}
