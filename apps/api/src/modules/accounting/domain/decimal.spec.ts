import { addDecimal, assertValidNonNegativeDecimal, isEqualDecimal, isZeroDecimal, subtractDecimal } from "./decimal";

describe("Accounting decimal", () => {
  it("adds and subtracts exactly, preserving 4 fraction digits", () => {
    expect(addDecimal("10.5000", "0.5000")).toBe("11.0000");
    expect(subtractDecimal("10.0000", "3.2500")).toBe("6.7500");
  });

  it("subtractDecimal can go negative, signed correctly", () => {
    expect(subtractDecimal("5.0000", "8.0000")).toBe("-3.0000");
  });

  it("isZeroDecimal recognizes zero regardless of formatting", () => {
    expect(isZeroDecimal("0")).toBe(true);
    expect(isZeroDecimal("0.0000")).toBe(true);
    expect(isZeroDecimal("0.0001")).toBe(false);
  });

  it("isEqualDecimal ignores trailing-zero formatting differences", () => {
    expect(isEqualDecimal("10", "10.0000")).toBe(true);
    expect(isEqualDecimal("10.0001", "10.0000")).toBe(false);
  });

  it("assertValidNonNegativeDecimal rejects a negative or malformed value", () => {
    expect(() => assertValidNonNegativeDecimal("-1.0000", "debit")).toThrow(/non-negative/);
    expect(() => assertValidNonNegativeDecimal("abc", "debit")).toThrow(/non-negative/);
  });

  it("assertValidNonNegativeDecimal accepts zero", () => {
    expect(assertValidNonNegativeDecimal("0", "debit")).toBe("0");
  });
});
