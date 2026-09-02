/**
 * Optional nicety: there is no customer login/order-history in this
 * platform yet (guest checkout only), so the only way a shopper can find
 * an order again is a link we hand them right after checkout. We keep a
 * short client-side list of recent order ids so a returning shopper on
 * the same device/browser can jump back to them from the home page —
 * this is NOT an account system, just a local breadcrumb trail.
 */

const RECENT_ORDERS_STORAGE_KEY = "erp-storefront:recent-orders";
const MAX_RECENT_ORDERS = 5;

export interface RecentOrder {
  orderId: string;
  createdAt: string;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getRecentOrders(): RecentOrder[] {
  if (!hasWindow()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is RecentOrder =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as RecentOrder).orderId === "string" &&
        typeof (entry as RecentOrder).createdAt === "string",
    );
  } catch {
    return [];
  }
}

export function addRecentOrder(orderId: string): void {
  if (!hasWindow()) {
    return;
  }

  try {
    const existing = getRecentOrders().filter((entry) => entry.orderId !== orderId);
    const next = [{ orderId, createdAt: new Date().toISOString() }, ...existing].slice(
      0,
      MAX_RECENT_ORDERS,
    );
    window.localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore — this is a convenience feature, never load-bearing.
  }
}
