import { formatMoney, formatQuantity } from "./format";

describe("formatMoney", () => {
  it("formats a decimal-string amount with a known currency as a localized currency string", () => {
    const formatted = formatMoney("25.0000", "USD");
    // Intl output includes both the currency symbol and the amount — assert
    // on the numeric part rather than the exact locale-dependent symbol.
    expect(formatted).toContain("25.00");
  });

  it("formats a decimal-string amount with no currency as a plain 2-decimal number", () => {
    expect(formatMoney("25.0000")).toBe("25.00");
  });

  it("falls back to the raw string for a non-numeric amount", () => {
    expect(formatMoney("not-a-number")).toBe("not-a-number");
    expect(formatMoney("not-a-number", "USD")).toBe("not-a-number USD");
  });
});

describe("formatQuantity", () => {
  it("trims a whole-number decimal string to a plain integer", () => {
    expect(formatQuantity("3.0000")).toBe("3");
  });

  it("preserves a genuinely fractional quantity", () => {
    expect(formatQuantity("2.5000")).toBe("2.5");
  });
});
