/**
 * Money fields are canonical decimal strings, never JS `number` (MASTER_SPEC
 * §30/§82). CRM's own bounded copy of the dependency-free BigInt decimal
 * technique already used by Sales/Inventory/POS/Commerce/Accounting
 * (docs/ARCHITECTURE.md §6: domain must not depend on Prisma) — needed to
 * sum `Opportunity.amount` per pipeline stage in `GetPipelineSummaryUseCase`.
 */
const UNSIGNED_PATTERN = /^\d+(\.\d{1,4})?$/;
const SCALE = 10_000n;

function toScaled(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  const paddedFraction = (fraction + "0000").slice(0, 4);
  return BigInt(whole) * SCALE + BigInt(paddedFraction);
}

function fromScaled(scaled: bigint): string {
  const whole = scaled / SCALE;
  const fraction = (scaled % SCALE).toString().padStart(4, "0");
  return `${whole.toString()}.${fraction}`;
}

/** A non-negative amount — an opportunity's own value. */
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
