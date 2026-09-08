import type { ReactNode } from "react";
import {
  ChartBar,
  ChartLineUp,
  ClockCounterClockwise,
  Coins,
  CreditCard,
  Factory,
  Globe,
  Lightning,
  Package,
  ShoppingCartSimple,
  Target,
  Trophy,
  TShirt,
  Truck,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type { AppPath } from "../../shared/navigation/router";
import { TONE } from "../../shared/ui/tone-colors";
import type { DashboardData } from "./use-dashboard-data";
import { ActivityFeedWidget } from "./widgets/activity-feed-widget";
import { QuickActionsWidget } from "./widgets/quick-actions-widget";
import { SalesTrendWidget } from "./widgets/sales-trend-widget";
import { TopCustomersWidget, TopProductsWidget } from "./widgets/top-lists-widget";

export interface WidgetContent {
  value: string;
  caption: string;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  icon: Icon;
  /** Fixed, theme-independent icon color (see `shared/ui/tone-colors.ts`)
   * — every widget tile would otherwise share the same user-chosen accent
   * color, which is what made the dashboard read as monotone. */
  color: string;
  /** Which sidebar module this widget summarizes — clicking the header
   * navigates there. Omitted for widgets that span several modules (e.g.
   * the activity feed), which then render a plain, non-clickable header. */
  module?: AppPath;
  /** Starting width/height in grid columns/rows (12-column grid), before
   * the user drags/resizes it freely. Defaults to 4x4 (a third of the
   * grid's width) when omitted — only widgets that genuinely need more
   * room (a chart, a feed, a ranked list) declare their own. */
  defaultW?: number;
  defaultH?: number;
  /**
   * Simple stat-card widgets: a single value + caption. Returns null when
   * the underlying data source failed to load (module disabled for this
   * tenant per docs/DECISIONS.md ADR-015, or the current user lacks that
   * module's read permission) — the card then renders a quiet "No
   * disponible" state instead of a fabricated zero.
   *
   * Mutually exclusive with `render` — a widget picks exactly one shape.
   */
  compute?: (data: DashboardData) => WidgetContent | null;
  /**
   * Rich-content widgets (a chart, a ranked list, a feed) that need more
   * than a value+caption. Receives `navigate` directly since a rich
   * widget's own internal links (e.g. "ver más") may need it independently
   * of the header's click-to-navigate affordance.
   */
  render?: (data: DashboardData, navigate: (path: AppPath) => void) => ReactNode;
}

/** Display-only decimal formatting — never used for a calculation that
 * posts/charges anything, so plain floating point is an honest, bounded
 * simplification here (unlike the BigInt-scaled arithmetic every module's
 * own domain layer uses for money it actually persists). */
function sumAmounts(values: string[]): number {
  return values.reduce((total, value) => total + Number.parseFloat(value), 0);
}

function formatMoney(amount: number): string {
  return `Q ${amount.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isToday(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export const dashboardWidgets: WidgetDefinition[] = [
  {
    id: "active-customers",
    title: "Clientes activos",
    icon: Users,
    color: TONE.violet,
    module: "/contacts",
    compute: (data) => {
      if (!data.customers) return null;
      const active = data.customers.filter((customer) => customer.status === "ACTIVE").length;
      return { value: String(active), caption: `${data.customers.length} en total` };
    },
  },
  {
    id: "active-products",
    title: "Productos activos",
    icon: TShirt,
    color: TONE.indigo,
    module: "/catalog",
    compute: (data) => {
      if (!data.products) return null;
      const active = data.products.filter((product) => product.status === "ACTIVE").length;
      return { value: String(active), caption: `${data.products.length} en el catálogo` };
    },
  },
  {
    id: "open-sales-orders",
    title: "Pedidos de venta abiertos",
    icon: ShoppingCartSimple,
    color: TONE.blue,
    module: "/sales",
    compute: (data) => {
      if (!data.salesOrders) return null;
      const open = data.salesOrders.filter(
        (order) => order.status === "DRAFT" || order.status === "CONFIRMED",
      ).length;
      return { value: String(open), caption: `${data.salesOrders.length} pedidos recientes` };
    },
  },
  {
    id: "captured-today",
    title: "Cobrado hoy",
    icon: CreditCard,
    color: TONE.green,
    module: "/sales",
    compute: (data) => {
      if (!data.payments) return null;
      const capturedToday = data.payments.filter(
        (payment) => payment.status === "CAPTURED" && isToday(payment.capturedAt),
      );
      return {
        value: formatMoney(sumAmounts(capturedToday.map((payment) => payment.amount))),
        caption: `${capturedToday.length} pagos hoy`,
      };
    },
  },
  {
    id: "pending-purchase-orders",
    title: "Compras pendientes",
    icon: Truck,
    color: TONE.amber,
    module: "/purchasing",
    compute: (data) => {
      if (!data.purchaseOrders) return null;
      const pending = data.purchaseOrders.filter(
        (order) => order.status === "DRAFT" || order.status === "CONFIRMED",
      ).length;
      return { value: String(pending), caption: `${data.purchaseOrders.length} órdenes recientes` };
    },
  },
  {
    id: "pos-sales-today",
    title: "Ventas POS de hoy",
    icon: Coins,
    color: TONE.orange,
    module: "/pos",
    compute: (data) => {
      if (!data.posSales) return null;
      const today = data.posSales.filter((sale) => isToday(sale.createdAt));
      return {
        value: formatMoney(sumAmounts(today.map((sale) => sale.amount))),
        caption: `${today.length} ventas hoy`,
      };
    },
  },
  {
    id: "crm-pipeline",
    title: "Oportunidades abiertas",
    icon: Target,
    color: TONE.pink,
    module: "/crm",
    compute: (data) => {
      if (!data.pipelineSummary) return null;
      const openCount = data.pipelineSummary.rows.reduce((total, row) => total + row.openCount, 0);
      return {
        value: formatMoney(Number.parseFloat(data.pipelineSummary.totalOpenAmount)),
        caption: `${openCount} oportunidades en "${data.pipelineSummary.pipelineName}"`,
      };
    },
  },
  {
    id: "active-production",
    title: "Producción activa",
    icon: Factory,
    color: TONE.red,
    module: "/manufacturing",
    compute: (data) => {
      if (!data.productionOrders) return null;
      const active = data.productionOrders.filter(
        (order) => order.status === "DRAFT" || order.status === "CONFIRMED",
      ).length;
      return { value: String(active), caption: `${data.productionOrders.length} órdenes recientes` };
    },
  },
  {
    id: "out-of-stock",
    title: "Productos sin stock",
    icon: Package,
    color: TONE.rose,
    module: "/inventory",
    compute: (data) => {
      if (!data.inventoryBalances) return null;
      const outOfStock = data.inventoryBalances.filter(
        (balance) => Number.parseFloat(balance.availableQuantity) <= 0,
      ).length;
      return { value: String(outOfStock), caption: `de ${data.inventoryBalances.length} existencias` };
    },
  },
  {
    id: "commerce-orders",
    title: "Pedidos de tienda online",
    icon: Globe,
    color: TONE.cyan,
    module: "/commerce",
    compute: (data) => {
      if (!data.commerceOrders) return null;
      return {
        value: String(data.commerceOrders.length),
        caption: formatMoney(sumAmounts(data.commerceOrders.map((order) => order.total))),
      };
    },
  },
  {
    id: "sales-trend",
    title: "Ventas de los últimos 30 días",
    icon: ChartLineUp,
    color: TONE.sky,
    module: "/sales",
    defaultW: 8,
    defaultH: 7,
    render: (data) => <SalesTrendWidget data={data} />,
  },
  {
    id: "activity-feed",
    title: "Actividad reciente",
    icon: ClockCounterClockwise,
    color: TONE.slate,
    defaultW: 8,
    defaultH: 7,
    render: (data) => <ActivityFeedWidget data={data} />,
  },
  {
    id: "top-customers",
    title: "Top clientes (30 días)",
    icon: Trophy,
    color: TONE.fuchsia,
    module: "/contacts",
    defaultH: 7,
    render: (data) => <TopCustomersWidget data={data} />,
  },
  {
    id: "top-products",
    title: "Top productos (30 días)",
    icon: ChartBar,
    color: TONE.teal,
    module: "/catalog",
    defaultH: 7,
    render: (data) => <TopProductsWidget data={data} />,
  },
  {
    id: "quick-actions",
    title: "Accesos rápidos",
    icon: Lightning,
    color: TONE.purple,
    defaultH: 7,
    render: (_data, navigate) => <QuickActionsWidget navigate={navigate} />,
  },
];
