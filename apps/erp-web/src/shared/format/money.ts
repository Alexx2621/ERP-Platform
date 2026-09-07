/**
 * Renders a canonical decimal string (`"1250.0000"`) as money.
 *
 * The API always sends amounts as exact decimal strings, never numbers
 * (MASTER_SPEC §30/§82). Parsing to a float here is display-only — the value
 * is never sent back, computed with, or compared; every real calculation
 * stays server-side on Decimal/BigInt arithmetic.
 */
export function formatMoney(amount: string, currency: string): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    // Intl throws on a currency code it does not recognize; the raw value
    // plus the code is still correct information, just unformatted.
    return `${parsed.toFixed(2)} ${currency}`;
  }
}
