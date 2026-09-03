import {
  addDecimal,
  assertValidPositiveDecimal,
  isNegativeDecimal,
  multiplyDecimal,
  subtractDecimal,
} from "./decimal";

describe("Manufacturing decimal helpers", () => {
  it("adds two decimals exactly", () => {
    expect(addDecimal("1.5000", "2.2500")).toBe("3.7500");
  });

  it("subtracts two decimals exactly, allowing a negative result", () => {
    expect(subtractDecimal("2.0000", "5.0000")).toBe("-3.0000");
  });

  it("detects a negative decimal", () => {
    expect(isNegativeDecimal("-0.0001")).toBe(true);
    expect(isNegativeDecimal("0.0000")).toBe(false);
  });

  it("multiplies two decimals with half-up rounding to 4 fraction digits", () => {
    expect(multiplyDecimal("2.0000", "3.5000")).toBe("7.0000");
    expect(multiplyDecimal("1.0001", "1.0001")).toBe("1.0002");
  });

  it("accepts a positive decimal", () => {
    expect(assertValidPositiveDecimal("10.0000", "quantity")).toBe("10.0000");
  });

  it("rejects zero as a positive decimal", () => {
    expect(() => assertValidPositiveDecimal("0", "quantity")).toThrow(/positive decimal/);
  });

  it("rejects a negative value as a positive decimal", () => {
    expect(() => assertValidPositiveDecimal("-1", "quantity")).toThrow(/positive decimal/);
  });
});
