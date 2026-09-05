import {
  Coins,
  CreditCard,
  Factory,
  Globe,
  Package,
  ShoppingCartSimple,
  Target,
  TShirt,
  Truck,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type { AppPath } from "../../shared/navigation/router";
import type { DashboardData } from "./use-dashboard-data";

export interface WidgetContent {
  value: string;
  caption: string;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  icon: Icon;
  /** Which sidebar module this widget summarizes — clicking it navigates there. */
  module: AppPath;
  /**
   * Returns null when the underlying data source failed to load (module
   * disabled for this tenant per docs/DECISIONS.md ADR-015, or the current
   * user lacks that module's read permission) — the card then renders a
   * quiet "No disponible" state instead of a fabricated zero.
   */
  compute: (data: DashboardData) => WidgetContent | null;
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
    module: "/commerce",
    compute: (data) => {
      if (!data.commerceOrders) return null;
      return {
        value: String(data.commerceOrders.length),
        caption: formatMoney(sumAmounts(data.commerceOrders.map((order) => order.total))),
      };
    },
  },
];
