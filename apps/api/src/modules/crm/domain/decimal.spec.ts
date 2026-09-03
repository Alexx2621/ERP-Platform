import { addDecimal, assertValidNonNegativeDecimal } from "./decimal";

describe("CRM decimal", () => {
  it("adds exactly, preserving 4 fraction digits", () => {
    expect(addDecimal("100.0000", "0.5000")).toBe("100.5000");
  });

  it("rejects a negative or malformed amount", () => {
    expect(() => assertValidNonNegativeDecimal("-1.0000", "amount")).toThrow(/non-negative/);
    expect(() => assertValidNonNegativeDecimal("abc", "amount")).toThrow(/non-negative/);
  });

  it("accepts zero", () => {
    expect(assertValidNonNegativeDecimal("0", "amount")).toBe("0");
  });
});
