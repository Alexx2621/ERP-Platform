/**
 * Money/quantity fields are canonical decimal strings, never JS `number`
 * (MASTER_SPEC §30/§82). Manufacturing needs to *compute* material
 * requirements (BOM quantityPerUnit × order quantityPlanned) and running
 * sums (issued/returned/received so far) inside the domain/application
 * layers, not just validate/pass values through — same reason every other
 * business module keeps its own bounded copy of this dependency-free
 * BigInt arithmetic instead of importing Prisma's `Decimal`
 * (docs/ARCHITECTURE.md §6: domain must not depend on Prisma).
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

function divRoundHalfUp(numerator: bigint, divisor: bigint): bigint {
  const half = divisor / 2n;
  return numerator >= 0n ? (numerator + half) / divisor : (numerator - half) / divisor;
}

/** A positive quantity a caller provides (quantityPlanned, quantityPerUnit, a movement's quantity). Rejects zero and negative values. */
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

export function subtractDecimal(a: string, b: string): string {
  return fromScaled(toScaled(a) - toScaled(b));
}

export function isNegativeDecimal(value: string): boolean {
  return toScaled(value) < 0n;
}

/** Exact decimal multiplication (BOM quantityPerUnit × order quantityPlanned), rounded half-up to 4 fraction digits. */
export function multiplyDecimal(a: string, b: string): string {
  const product = toScaled(a) * toScaled(b); // scale 10^8
  return fromScaled(divRoundHalfUp(product, SCALE));
}
