import { addDecimal, assertValidPositiveDecimal, multiplyDecimal } from "./decimal";

describe("Commerce decimal", () => {
  it("adds two decimals with 4-digit scale", () => {
    expect(addDecimal("10.5000", "0.2500")).toBe("10.7500");
  });

  it("multiplies quantity by unit price, truncating beyond 4 fraction digits", () => {
    expect(multiplyDecimal("3.0000", "9.9900")).toBe("29.9700");
    expect(multiplyDecimal("1.5000", "10.0000")).toBe("15.0000");
  });

  it("rejects a zero or negative amount", () => {
    expect(() => assertValidPositiveDecimal("0", "quantity")).toThrow();
    expect(() => assertValidPositiveDecimal("-1", "quantity")).toThrow();
  });

  it("accepts a positive amount and returns it trimmed", () => {
    expect(assertValidPositiveDecimal(" 2.5000 ", "quantity")).toBe("2.5000");
  });
});
