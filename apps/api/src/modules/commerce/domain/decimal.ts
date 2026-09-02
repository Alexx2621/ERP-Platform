/**
 * Money/quantity fields are canonical decimal strings, never JS `number`
 * (MASTER_SPEC §30/§82). Commerce's own bounded copy of the dependency-free
 * BigInt decimal technique already used by Sales/Inventory/POS
 * (docs/ARCHITECTURE.md §6: domain must not depend on Prisma). The only
 * operation this module adds beyond POS's own copy is `multiplyDecimal`,
 * needed to display a cart's running subtotal (quantity × unitPrice) before
 * checkout — that subtotal is informational only; the authoritative total a
 * shopper is actually charged is computed by Sales' own
 * `SalesOrderLine.create()` once `CheckoutUseCase` creates the real order,
 * the same "don't let two places compute the same fact independently and
 * risk drift" reasoning already applied elsewhere, just resolved here by
 * treating the cart-side number as a preview rather than deduplicating the
 * math itself.
 */
const UNSIGNED_PATTERN = /^\d+(\.\d{1,4})?$/;
const SCALE = 10_000n;

function toScaled(value: string): bigint {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const paddedFraction = (fraction + "0000").slice(0, 4);
  const scaled = BigInt(whole) * SCALE + BigInt(paddedFraction);
  return negative ? -scaled : scaled;
}

function fromScaled(scaled: bigint): string {
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const whole = abs / SCALE;
  const fraction = (abs % SCALE).toString().padStart(4, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

/** A positive amount a caller provides (a cart line's quantity or unit price). Rejects zero and negative values. */
export function assertValidPositiveDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UNSIGNED_PATTERN.test(trimmed) || toScaled(trimmed) === 0n) {
    throw new Error(`${label} must be a positive decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}

export function addDecimal(a: string, b: string): string {
  return fromScaled(toScaled(a) + toScaled(b));
}

/** Truncates (never rounds up) beyond 4 fraction digits — fine for a display-only preview subtotal. */
export function multiplyDecimal(a: string, b: string): string {
  return fromScaled((toScaled(a) * toScaled(b)) / SCALE);
}
