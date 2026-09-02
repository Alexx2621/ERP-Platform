/**
 * Money fields are canonical decimal strings, never JS `number` (MASTER_SPEC
 * §30/§82). Accounting's own bounded copy of the dependency-free BigInt
 * decimal technique already used by Sales/Inventory/POS/Commerce
 * (docs/ARCHITECTURE.md §6: domain must not depend on Prisma). This module
 * needs to sum many debit/credit lines and confirm they balance exactly —
 * the one operation every other module's own copy never needed is
 * `isEqualDecimal`, since "does this add up" is the central invariant of
 * double-entry bookkeeping itself.
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

/** A non-negative amount — a debit or credit line value. Zero is valid (the *other* side of the line must then be positive). */
export function assertValidNonNegativeDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UNSIGNED_PATTERN.test(trimmed)) {
    throw new Error(`${label} must be a non-negative decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}

export function addDecimal(a: string, b: string): string {
  return fromScaled(toScaled(a) + toScaled(b));
}

export function subtractDecimal(a: string, b: string): string {
  return fromScaled(toScaled(a) - toScaled(b));
}

export function isZeroDecimal(value: string): boolean {
  return toScaled(value) === 0n;
}

/** The core double-entry check: do two decimal strings represent the exact same amount, scale differences aside (e.g. "10" and "10.0000"). */
export function isEqualDecimal(a: string, b: string): boolean {
  return toScaled(a) === toScaled(b);
}
