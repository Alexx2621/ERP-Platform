import type { SalesOrderResponse } from "@erp/api-client";
import type { DashboardData } from "../use-dashboard-data";

const WINDOW_DAYS = 30;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Buckets non-cancelled orders by calendar day (UTC) for the last
 * `windowDays`, oldest first. A pure function so the bucketing math is
 * unit-tested independently of the SVG rendering.
 *
 * Same honesty caveat as every other dashboard source: `salesOrders` is
 * capped at 200 rows by the list endpoint, so a very high-volume tenant's
 * oldest orders in the window may be missing from the total — an
 * approximation over the same data every other widget already accepts,
 * not a new limitation.
 */
export function buildDailyTotals(
  orders: SalesOrderResponse[],
  windowDays: number = WINDOW_DAYS,
): Array<{ date: string; total: number }> {
  const today = new Date();
  const days: string[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    days.push(date.toISOString().slice(0, 10));
  }

  const totalsByDay = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    const key = dayKey(order.createdAt);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number.parseFloat(order.total));
  }

  return days.map((date) => ({ date, total: totalsByDay.get(date) ?? 0 }));
}

function formatMoney(amount: number): string {
  return `Q ${amount.toLocaleString("es-GT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short" }).format(new Date(isoDate));
}

interface SalesTrendWidgetProps {
  data: DashboardData;
}

/**
 * A hand-rolled SVG area chart — this codebase never adds a charting
 * dependency for one screen (same reasoning already applied to
 * Modal/NavDropdown/Tabs/the home dashboard's own drag-and-drop).
 */
export function SalesTrendWidget({ data }: SalesTrendWidgetProps) {
  if (!data.salesOrders) {
    return <p className="text-[12px] font-semibold text-[var(--muted)]">No disponible</p>;
  }

  const daily = buildDailyTotals(data.salesOrders);
  const total = daily.reduce((sum, day) => sum + day.total, 0);
  const max = Math.max(...daily.map((day) => day.total), 1);

  const width = 320;
  const height = 96;
  const stepX = width / Math.max(daily.length - 1, 1);
  const points = daily.map((day, index) => {
    const x = index * stepX;
    const y = height - (day.total / max) * (height - 8) - 4;
    return { x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const lastDay = daily[daily.length - 1];
  const firstHalf = daily.slice(0, Math.floor(daily.length / 2)).reduce((sum, day) => sum + day.total, 0);
  const secondHalf = daily.slice(Math.floor(daily.length / 2)).reduce((sum, day) => sum + day.total, 0);
  const trendUp = secondHalf >= firstHalf;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[24px] font-extrabold tracking-[-0.02em] text-[var(--ink)]">
            {formatMoney(total)}
          </p>
          <p className="mt-1 text-[11.5px] font-medium text-[var(--muted)]">
            Últimos {WINDOW_DAYS} días · {daily.filter((day) => day.total > 0).length} días con ventas
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            trendUp
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--danger-soft)] text-[var(--danger)]"
          }`}
        >
          {trendUp ? "↑ En alza" : "↓ En baja"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-4 h-24 w-full"
        role="img"
        aria-label={`Ventas diarias de los últimos ${WINDOW_DAYS} días, último día: ${formatMoney(lastDay?.total ?? 0)}`}
      >
        <defs>
          <linearGradient id="sales-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sales-trend-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-[var(--muted)]">
        <span>{formatDayLabel(daily[0]?.date ?? "")}</span>
        <span>{formatDayLabel(lastDay?.date ?? "")}</span>
      </div>
    </div>
  );
}
