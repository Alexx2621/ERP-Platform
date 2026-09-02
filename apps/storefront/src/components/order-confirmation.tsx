import Link from "next/link";
import type { CommerceOrderResponse } from "@erp/api-client";
import { formatMoney } from "@/lib/format";

/**
 * Fulfillment (shipping/pickup) is a manual warehouse action on the ERP
 * side, not something this storefront can know or promise — this page
 * only ever states what the backend actually told us: the order exists,
 * its total, and whether a payment is on file for it. No fabricated
 * tracking number, no invented delivery estimate.
 */
export function OrderConfirmation({ order }: { order: CommerceOrderResponse }) {
  const isPaid = order.paymentId !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--accent)]">
          Pedido confirmado
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold text-[var(--ink)]">
          Gracias, {order.guestEmail}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-[var(--muted)]">Pedido #{order.id}</p>
      </div>

      <div
        role="status"
        className={`rounded-[10px] border px-4 py-3.5 text-[14px] font-semibold leading-6 ${
          isPaid
            ? "border-[var(--accent-light)] bg-[var(--accent-soft)] text-[var(--accent-hover)]"
            : "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--muted-strong)]"
        }`}
      >
        {isPaid
          ? "Pago confirmado."
          : "Pago pendiente de confirmación — nuestro equipo verificará tu transferencia y actualizará tu pedido."}
      </div>

      <dl className="grid gap-3 rounded-[12px] border border-[var(--line)] p-5 text-[14px]">
        <div className="flex items-center justify-between">
          <dt className="font-semibold text-[var(--muted-strong)]">Total del pedido</dt>
          <dd className="text-[18px] font-extrabold text-[var(--ink)]">
            {formatMoney(order.total, order.currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-semibold text-[var(--muted-strong)]">Correo de contacto</dt>
          <dd className="font-bold text-[var(--ink)]">{order.guestEmail}</dd>
        </div>
      </dl>

      <Link href="/" className="text-[13px] font-bold text-[var(--accent)] hover:underline">
        Volver a la tienda
      </Link>
    </div>
  );
}
