/**
 * Quantity fields are canonical decimal strings, never JS `number`
 * (MASTER_SPEC §30/§82 — never float for money or quantities). Unlike other
 * Master Data modules, Inventory also needs to *compute* with quantities
 * (e.g. `available = onHand - reserved`) inside the domain layer itself, not
 * just validate/pass them through. Domain code must not depend on Prisma
 * (docs/ARCHITECTURE.md §6), so this file implements dependency-free,
 * exact decimal arithmetic on 4-fraction-digit strings using BigInt scaling
 * instead of importing Prisma's `Decimal` — the same precision guarantee,
 * with zero framework coupling. Infrastructure is free to use Prisma's own
 * `Decimal` for its own DB-level increments; this module never needs to.
 */
const UNSIGNED_PATTERN = /^\d+(\.\d{1,4})?$/;
const SIGNED_PATTERN = /^-?\d+(\.\d{1,4})?$/;
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

/** A positive quantity a caller requests (receipt/issue/transfer/reservation amounts). Rejects zero and negative values. */
export function assertValidPositiveDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UNSIGNED_PATTERN.test(trimmed) || toScaled(trimmed) === 0n) {
    throw new Error(`${label} must be a positive decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}

/** A ledger movement's signed delta. Rejects zero — every ledger row must represent a real change. */
export function assertValidSignedDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!SIGNED_PATTERN.test(trimmed) || toScaled(trimmed) === 0n) {
    throw new Error(`${label} must be a non-zero decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}

export function isNegativeDecimal(value: string): boolean {
  return toScaled(value) < 0n;
}

export function addDecimal(a: string, b: string): string {
  return fromScaled(toScaled(a) + toScaled(b));
}

export function subtractDecimal(a: string, b: string): string {
  return fromScaled(toScaled(a) - toScaled(b));
}

export function negateDecimal(value: string): string {
  return fromScaled(-toScaled(value));
}
