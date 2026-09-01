import { addDecimal, assertValidNonNegativeDecimal, assertValidPositiveDecimal, isNegativeDecimal, subtractDecimal } from "./decimal";

describe("POS decimal arithmetic", () => {
  describe("assertValidPositiveDecimal", () => {
    it("accepts a positive value and trims it", () => {
      expect(assertValidPositiveDecimal(" 25.5 ", "amount")).toBe("25.5");
    });

    it("rejects zero", () => {
      expect(() => assertValidPositiveDecimal("0", "amount")).toThrow(/must be a positive decimal/);
    });

    it("rejects a negative value", () => {
      expect(() => assertValidPositiveDecimal("-1", "amount")).toThrow(/must be a positive decimal/);
    });
  });

  describe("assertValidNonNegativeDecimal", () => {
    it("accepts zero", () => {
      expect(assertValidNonNegativeDecimal("0", "openingCash")).toBe("0");
    });

    it("accepts a positive value", () => {
      expect(assertValidNonNegativeDecimal("50", "openingCash")).toBe("50");
    });

    it("rejects a negative value", () => {
      expect(() => assertValidNonNegativeDecimal("-0.01", "openingCash")).toThrow(/must be a non-negative decimal/);
    });
  });

  describe("addDecimal / subtractDecimal / isNegativeDecimal", () => {
    it("adds two decimals exactly", () => {
      expect(addDecimal("50", "42.5")).toBe("92.5000");
    });

    it("subtracts two decimals exactly", () => {
      expect(subtractDecimal("100", "42.5")).toBe("57.5000");
    });

    it("produces a negative result when counted cash falls short", () => {
      const result = subtractDecimal("90", "100");
      expect(result).toBe("-10.0000");
      expect(isNegativeDecimal(result)).toBe(true);
    });

    it("treats zero as non-negative", () => {
      expect(isNegativeDecimal(subtractDecimal("100", "100"))).toBe(false);
    });
  });
});
