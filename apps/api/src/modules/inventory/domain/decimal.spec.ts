import {
  addDecimal,
  assertValidPositiveDecimal,
  assertValidSignedDecimal,
  isNegativeDecimal,
  negateDecimal,
  subtractDecimal,
} from "./decimal";

describe("inventory decimal arithmetic", () => {
  it("adds and subtracts exactly, without float drift", () => {
    expect(addDecimal("10.1000", "0.2000")).toBe("10.3000");
    expect(subtractDecimal("10.3000", "0.2000")).toBe("10.1000");
    // The classic 0.1 + 0.2 !== 0.3 float trap — this must be exact.
    expect(addDecimal("0.1000", "0.2000")).toBe("0.3000");
  });

  it("subtracts into a negative result correctly", () => {
    expect(subtractDecimal("5.0000", "8.5000")).toBe("-3.5000");
  });

  it("negates a decimal, flipping its sign", () => {
    expect(negateDecimal("5.0000")).toBe("-5.0000");
    expect(negateDecimal("-5.0000")).toBe("5.0000");
  });

  it("detects negative values", () => {
    expect(isNegativeDecimal("-0.0001")).toBe(true);
    expect(isNegativeDecimal("0.0000")).toBe(false);
    expect(isNegativeDecimal("5.0000")).toBe(false);
  });

  describe("assertValidPositiveDecimal", () => {
    it("accepts a positive value", () => {
      expect(assertValidPositiveDecimal("10.5", "quantity")).toBe("10.5");
    });

    it.each(["0", "0.0000", "-1", "abc", "1.23456"])("rejects %s", (value) => {
      expect(() => assertValidPositiveDecimal(value, "quantity")).toThrow();
    });
  });

  describe("assertValidSignedDecimal", () => {
    it("accepts positive and negative non-zero values", () => {
      expect(assertValidSignedDecimal("10.5", "quantity")).toBe("10.5");
      expect(assertValidSignedDecimal("-10.5", "quantity")).toBe("-10.5");
    });

    it.each(["0", "0.0000", "-0.0000", "abc"])("rejects %s", (value) => {
      expect(() => assertValidSignedDecimal(value, "quantity")).toThrow();
    });
  });
});
