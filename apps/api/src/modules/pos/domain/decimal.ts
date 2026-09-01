/**
 * Money fields are canonical decimal strings, never JS `number` (MASTER_SPEC
 * §30/§82). POS needs to *compute* shift-close cash math (opening + cash
 * movements + cash sales − cash refunds) inside the application layer, not
 * just validate/pass values through — the same reason Sales' own
 * `domain/decimal.ts` implements dependency-free BigInt arithmetic instead
 * of importing Prisma's `Decimal` (docs/ARCHITECTURE.md §6: domain must not
 * depend on Prisma). This file is POS's own bounded copy of that technique —
 * only the operations this module actually needs (no multiply/percentage,
 * POS never derives a price from a rate).
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

/** A positive amount a caller provides (a cash movement, cash tendered). Rejects zero and negative values. */
export function assertValidPositiveDecimal(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UNSIGNED_PATTERN.test(trimmed) || toScaled(trimmed) === 0n) {
    throw new Error(`${label} must be a positive decimal with up to 4 fraction digits.`);
  }
  return trimmed;
}

/** A non-negative amount that may legitimately be zero (opening cash, closing cash counted). */
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

export function isNegativeDecimal(value: string): boolean {
  return toScaled(value) < 0n;
}
