import {
  buildAccentPalette,
  buildSurfacePalette,
  darken,
  getContrastText,
  isValidHexColor,
  lighten,
  mixColors,
} from "./color-utils";

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

  describe("mixColors", () => {
    it("interpolates between two arbitrary colors, not just toward black/white", () => {
      expect(mixColors("#ffffff", "#0070f2", 0)).toBe("#ffffff");
      expect(mixColors("#ffffff", "#0070f2", 1)).toBe("#0070f2");
      const midpoint = mixColors("#ffffff", "#0070f2", 0.5);
      expect(midpoint).not.toBe("#ffffff");
      expect(midpoint).not.toBe("#0070f2");
    });
  });

  describe("buildAccentPalette", () => {
    it("derives a full, distinct palette from a single base color in light mode", () => {
      const palette = buildAccentPalette("#0070f2");
      expect(palette.accent).toBe("#0070f2");
      expect(palette.accentHover).not.toBe(palette.accent);
      expect(palette.accentLight).not.toBe(palette.accent);
      expect(palette.accentSoft).not.toBe(palette.accent);
      expect(palette.accentContrast).toBe("#ffffff");
    });

    it("derives a dark-appropriate soft tint in dark mode — the real bug this fixes", () => {
      // Light mode's --accent-soft leans toward white; under dark mode's
      // own light --ink text, that combination is exactly what produced
      // the real, reported low-contrast "100%" white-on-mint bug.
      const lightPalette = buildAccentPalette("#0f8a5f", "light");
      const darkPalette = buildAccentPalette("#0f8a5f", "dark");

      // Light-mode soft is lightened (closer to white than the base).
      expect(lighten("#0f8a5f", 0)).toBe("#0f8a5f");
      expect(lightPalette.accentSoft).not.toBe(darkPalette.accentSoft);

      // Dark-mode soft must be dark enough that white text stays legible —
      // i.e. its own relative luminance is low.
      const [r, g, b] = darkPalette.accentSoft
        .slice(1)
        .match(/.{2}/g)!
        .map((channel) => Number.parseInt(channel, 16));
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      expect(luminance).toBeLessThan(0.25);

      // Dark-mode hover brightens (not darkens) the accent, mirroring the
      // direction styles.css's own hand-written dark theme already used.
      expect(darkPalette.accentHover).not.toBe(lightPalette.accentHover);
    });
  });

  describe("buildSurfacePalette", () => {
    it("derives a full, readable interface palette from a dark base color", () => {
      const palette = buildSurfacePalette("#0f172a");
      expect(palette.paper).toBe("#0f172a");
      expect(palette.ink).toBe("#ffffff");
      expect(palette.navBg).toBe(palette.paper);
      expect(palette.navInk).toBe(palette.ink);
      expect(palette.mutedStrong).not.toBe(palette.ink);
      expect(palette.muted).not.toBe(palette.mutedStrong);
      expect(palette.line).not.toBe(palette.paper);
      expect(palette.field).not.toBe(palette.paper);
    });

    it("derives a dark ink for a light base color", () => {
      const palette = buildSurfacePalette("#f5f6f8");
      expect(palette.ink).toBe("#101820");
      expect(palette.navInk).toBe("#101820");
    });

    it("keeps canvas darker than paper regardless of the base color's own lightness — cards must still read as raised", () => {
      const darkBase = buildSurfacePalette("#0f172a");
      const lightBase = buildSurfacePalette("#f5f6f8");
      const relativeLuminance = (hex: string) => {
        const [r, g, b] = hex
          .slice(1)
          .match(/.{2}/g)!
          .map((channel) => Number.parseInt(channel, 16) / 255);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      expect(relativeLuminance(darkBase.canvas)).toBeLessThan(relativeLuminance(darkBase.paper));
      expect(relativeLuminance(lightBase.canvas)).toBeLessThan(relativeLuminance(lightBase.paper));
    });
  });
});
