/**
 * The backend is the sole source of truth for every amount here — these
 * helpers only ever format a value it already gave us for display. They
 * never sum, multiply, or otherwise recompute a price/total client-side
 * (see MASTER_SPEC "Storefront no contiene reglas autoritativas de
 * Commerce" and the decimal-string contract on every *Response type).
 */

/**
 * Formats a decimal string amount (e.g. "25.0000") for display.
 *
 * The product catalog endpoints (`listPublicProducts`/`getPublicProduct`)
 * don't carry a currency — only `CartResponse`/`CommerceOrderResponse` do,
 * once a cart/order exists. Rather than guess or hardcode a currency for
 * product listings, `currency` is optional here: when known, we render a
 * real localized currency string (e.g. "Q25.00"); when not, we render the
 * plain decimal amount with no invented symbol (e.g. "25.00").
 */
export function formatMoney(amount: string, currency?: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return currency ? `${amount} ${currency}` : amount;
  }

  if (!currency) {
    return numeric.toFixed(2);
  }

  try {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
}

/** Trims a decimal-string quantity (e.g. "3.0000") to e.g. "3" for display. */
export function formatQuantity(quantity: string): string {
  const numeric = Number(quantity);
  if (Number.isNaN(numeric)) {
    return quantity;
  }

  return numeric % 1 === 0 ? String(numeric) : numeric.toString();
}

/**
 * A variant's `attributes` is dynamic JSON (e.g. {"color":"Azul","talla":"M"})
 * — this renders it as "color: Azul, talla: M" for both the variant
 * selector (product-detail.tsx) and a resolved cart line's label
 * (use-product-names.ts), the two places that need it.
 */
export function formatVariantAttributes(attributes: Record<string, unknown> | undefined): string {
  const entries = Object.entries(attributes ?? {});
  if (entries.length === 0) {
    return "";
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}
