const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

function parseHex(hex: string): [number, number, number] {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const int = Number.parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[r, g, b]
    .map(clamp)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Mixes two hex colors; weight 0 returns `from`, weight 1 returns `to`. */
export function mixColors(from: string, to: string, weight: number): string {
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  const w = Math.max(0, Math.min(1, weight));
  return toHex([r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w]);
}

export function darken(hex: string, amount: number): string {
  return mixColors(hex, "#000000", Math.abs(amount));
}

export function lighten(hex: string, amount: number): string {
  return mixColors(hex, "#ffffff", Math.abs(amount));
}

/** WCAG-ish relative luminance, used only to pick a legible foreground color. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Picks white or a near-black ink, whichever contrasts better against the given color. */
export function getContrastText(hex: string): string {
  return relativeLuminance(hex) > 0.42 ? "#101820" : "#ffffff";
}

export type ColorScheme = "light" | "dark";

export interface AccentPalette {
  accent: string;
  accentHover: string;
  accentLight: string;
  accentSoft: string;
  accentContrast: string;
}

/**
 * Derives the full accent token set from one base color. Scheme-aware: a
 * "soft" tint has to move toward white in light mode (a light card
 * background under dark ink) but toward black in dark mode (a dark card
 * background under light ink) — using the same light-leaning math in both
 * cases was the root cause of a real contrast bug, where a user's custom
 * accent produced an unreadable light-mint "soft" background under the
 * light --ink text that dark mode already correctly uses. Same reasoning
 * for "hover": lighter than the accent in dark mode, darker in light mode,
 * mirroring what styles.css's own dark-mode block already did for the
 * default blue before this module existed.
 */
export function buildAccentPalette(hex: string, scheme: ColorScheme = "light"): AccentPalette {
  if (scheme === "dark") {
    return {
      accent: hex,
      accentHover: lighten(hex, 0.16),
      accentLight: lighten(hex, 0.34),
      accentSoft: darken(hex, 0.72),
      accentContrast: getContrastText(hex),
    };
  }
  return {
    accent: hex,
    accentHover: darken(hex, 0.14),
    accentLight: lighten(hex, 0.28),
    accentSoft: lighten(hex, 0.88),
    accentContrast: getContrastText(hex),
  };
}

export interface NavPalette {
  navBg: string;
  navInk: string;
  navMuted: string;
  navLine: string;
  navHover: string;
}

/**
 * Derives readable text/border/hover tones for an arbitrary, user-chosen
 * navigation (sidebar/navbar) background — independent of the accent
 * color and independent of light/dark mode, since the whole point of this
 * picker is to let a user run e.g. a dark sidebar on an otherwise light
 * theme (or vice versa) without fighting contrast by hand.
 */
export function buildNavPalette(hex: string): NavPalette {
  const navInk = getContrastText(hex);
  return {
    navBg: hex,
    navInk,
    navMuted: mixColors(navInk, hex, 0.45),
    navLine: mixColors(navInk, hex, 0.82),
    navHover: mixColors(navInk, hex, 0.91),
  };
}
