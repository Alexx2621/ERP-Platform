import { buildAccentPalette, darken, getContrastText, isValidHexColor, lighten } from "./color-utils";

describe("color-utils", () => {
  describe("isValidHexColor", () => {
    it("accepts a well-formed 6-digit hex color", () => {
      expect(isValidHexColor("#0070f2")).toBe(true);
      expect(isValidHexColor("#ABCDEF")).toBe(true);
    });

    it("rejects malformed input", () => {
      expect(isValidHexColor("0070f2")).toBe(false);
      expect(isValidHexColor("#fff")).toBe(false);
      expect(isValidHexColor("#gggggg")).toBe(false);
      expect(isValidHexColor("not-a-color")).toBe(false);
    });
  });

  describe("lighten/darken", () => {
    it("moves a color toward white or black without changing its hue family", () => {
      const base = "#0070f2";
      expect(lighten(base, 0.5)).not.toBe(base);
      expect(darken(base, 0.5)).not.toBe(base);
      expect(lighten(base, 1)).toBe("#ffffff");
      expect(darken(base, 1)).toBe("#000000");
    });
  });

  describe("getContrastText", () => {
    it("picks a dark foreground for light backgrounds", () => {
      expect(getContrastText("#ffff00")).toBe("#101820");
    });

    it("picks white for dark/saturated backgrounds", () => {
      expect(getContrastText("#0070f2")).toBe("#ffffff");
      expect(getContrastText("#000033")).toBe("#ffffff");
    });
  });

  describe("buildAccentPalette", () => {
    it("derives a full, distinct palette from a single base color", () => {
      const palette = buildAccentPalette("#0070f2");
      expect(palette.accent).toBe("#0070f2");
      expect(palette.accentHover).not.toBe(palette.accent);
      expect(palette.accentLight).not.toBe(palette.accent);
      expect(palette.accentSoft).not.toBe(palette.accent);
      expect(palette.accentContrast).toBe("#ffffff");
    });
  });
});
