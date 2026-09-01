import {
  addDecimal,
  applyPercentage,
  assertValidNonNegativeDecimal,
  assertValidPositiveDecimal,
  isNegativeDecimal,
  multiplyDecimal,
  subtractDecimal,
} from "./decimal";

describe("Sales decimal arithmetic", () => {
  describe("assertValidPositiveDecimal", () => {
    it("accepts a positive value and trims it", () => {
      expect(assertValidPositiveDecimal(" 3.5 ", "quantity")).toBe("3.5");
    });

    it("rejects zero", () => {
      expect(() => assertValidPositiveDecimal("0", "quantity")).toThrow(/must be a positive decimal/);
    });

    it("rejects a negative value", () => {
      expect(() => assertValidPositiveDecimal("-1", "quantity")).toThrow(/must be a positive decimal/);
    });

    it("rejects more than 4 fraction digits", () => {
      expect(() => assertValidPositiveDecimal("1.23456", "quantity")).toThrow(/must be a positive decimal/);
    });

    it("rejects non-numeric input", () => {
      expect(() => assertValidPositiveDecimal("abc", "quantity")).toThrow(/must be a positive decimal/);
    });
  });

  describe("assertValidNonNegativeDecimal", () => {
    it("accepts zero", () => {
      expect(assertValidNonNegativeDecimal("0", "discountAmount")).toBe("0");
    });

    it("accepts a positive value", () => {
      expect(assertValidNonNegativeDecimal("12.5", "discountAmount")).toBe("12.5");
    });

    it("rejects a negative value", () => {
      expect(() => assertValidNonNegativeDecimal("-0.01", "discountAmount")).toThrow(/must be a non-negative decimal/);
    });
  });

  describe("addDecimal / subtractDecimal / isNegativeDecimal", () => {
    it("adds two decimals exactly", () => {
      expect(addDecimal("10.5", "0.25")).toBe("10.7500");
    });

    it("subtracts two decimals exactly", () => {
      expect(subtractDecimal("10", "2.5")).toBe("7.5000");
    });

    it("produces a negative result when the subtrahend is larger", () => {
      const result = subtractDecimal("2", "5");
      expect(result).toBe("-3.0000");
      expect(isNegativeDecimal(result)).toBe(true);
    });

    it("treats zero as non-negative", () => {
      expect(isNegativeDecimal("0")).toBe(false);
      expect(isNegativeDecimal(subtractDecimal("5", "5"))).toBe(false);
    });
  });

  describe("multiplyDecimal", () => {
    it("multiplies quantity by unit price exactly", () => {
      expect(multiplyDecimal("3", "10.5")).toBe("31.5000");
    });

    it("rounds half-up to 4 fraction digits", () => {
      // 1.00005 * 1 = 1.00005 -> rounds to 1.0001 (well beyond the 4-digit input precision,
      // but the product of two 4-digit decimals can itself need rounding at 4 digits).
      expect(multiplyDecimal("0.3333", "3")).toBe("0.9999");
      expect(multiplyDecimal("1.0001", "1.0001")).toBe("1.0002");
    });

    it("handles zero", () => {
      expect(multiplyDecimal("0", "99.9999")).toBe("0.0000");
    });
  });

  describe("applyPercentage", () => {
    it("computes a simple percentage", () => {
      expect(applyPercentage("100", "12")).toBe("12.0000");
    });

    it("computes a fractional percentage with rounding", () => {
      expect(applyPercentage("33.33", "7.5")).toBe("2.4998");
    });

    it("returns zero for a zero rate", () => {
      expect(applyPercentage("500", "0")).toBe("0.0000");
    });
  });
});
