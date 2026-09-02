import { formatMoney } from "@/lib/format";

/**
 * `currency` is optional — the catalog endpoints don't return one (see
 * lib/format.ts). When present (cart/checkout/order contexts) the amount
 * renders as a real currency string; otherwise as a plain decimal.
 */
export function Price({ amount, currency }: { amount: string | null; currency?: string }) {
  if (amount === null) {
    return <span className="text-[13px] font-semibold text-[var(--muted-strong)]">Consultar precio</span>;
  }

  return <span className="text-[15px] font-extrabold text-[var(--ink)]">{formatMoney(amount, currency)}</span>;
}
