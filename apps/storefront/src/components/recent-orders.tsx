"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentOrders, type RecentOrder } from "@/lib/orders-storage";

/**
 * Optional nicety: this platform has no customer login, so this is the
 * only way a returning shopper on the same device/browser can find an
 * order again — not an account system, just a local breadcrumb trail.
 */
export function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    setOrders(getRecentOrders());
  }, []);

  if (orders.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recent-orders-heading" className="flex flex-col gap-3">
      <h2 id="recent-orders-heading" className="text-[13px] font-extrabold text-[var(--ink)]">
        Tus pedidos recientes en este dispositivo
      </h2>
      <ul className="flex flex-wrap gap-2">
        {orders.map((order) => (
          <li key={order.orderId}>
            <Link
              href={`/orders/${encodeURIComponent(order.orderId)}`}
              className="inline-flex h-9 items-center rounded-[8px] border border-[var(--line-strong)] bg-[var(--field)] px-3 text-[12px] font-bold text-[var(--ink)] hover:bg-[var(--field-hover)]"
            >
              Pedido #{order.orderId.slice(0, 8)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
