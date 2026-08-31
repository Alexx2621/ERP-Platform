/**
 * Money/quantity fields are represented as canonical decimal strings, never
 * JS `number` (MASTER_SPEC §30/§82 — never float for money). Domain code
 * never depends on Prisma's `Decimal` class (docs/ARCHITECTURE.md §6);
 * infrastructure converts at the boundary (`record.price.toString()` on
 * read, the string itself on write — Prisma's Decimal fields accept a
 * plain string).
 */
const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;

export function assertValidDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new Error(`${label} must be a non-negative decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}
