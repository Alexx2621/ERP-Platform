const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;

/** Same canonical-decimal-string contract as catalog/domain/decimal.ts, scoped to this module — a price, never a JS `number` (MASTER_SPEC §30/§82). */
export function assertValidDecimal(value: string, label: string): void {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new Error(`${label} must be a non-negative decimal string with up to 4 fraction digits.`);
  }
}
