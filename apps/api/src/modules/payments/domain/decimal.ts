/**
 * Payments only ever needs to validate an already-computed amount (it never
 * multiplies or applies a percentage the way Sales does) — the smallest
 * dependency-free slice of the same BigInt-decimal technique already used
 * by Inventory/Sales own `domain/decimal.ts` (docs/ARCHITECTURE.md §6:
 * domain must not depend on Prisma's `Decimal`).
 */
const UNSIGNED_PATTERN = /^\d+(\.\d{1,4})?$/;

/** A positive amount a caller provides (a payment can never capture zero or a negative amount). */
export function assertValidPositiveDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UNSIGNED_PATTERN.test(trimmed) || /^0+(\.0+)?$/.test(trimmed)) {
    throw new Error(`${label} must be a positive decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}
