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
  accentSoftText: string;
  accentSoftMuted: string;
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
 *
 * accentSoftText/accentSoftMuted are a second, broader contrast bug fix:
 * many components draw text directly on top of an --accent-soft
 * background (e.g. a home dashboard widget's icon badge, or a selected
 * option card in Apariencia) — some of that text in --accent itself, but
 * just as often in --ink/--muted-strong, the *surface* palette's own
 * contrast pair. Both patterns
 * silently assume the surface/accent tokens agree on which end of the
 * lightness scale is "dark" — true only by coincidence for the default
 * theme, and false in general: --accent-soft is derived from the accent
 * color and OS color scheme alone, completely independent of --ink
 * (derived from the surface/theme, and overridable by its own separate
 * "Color de fondo" picker) — confirmed by reproducing several genuinely
 * illegible combinations against a real browser (an already-dark/muted
 * accent preset like "Pizarra" leaves too little room below it once
 * darkened again; a light accent under a dark OS scheme produces a mid-
 * gray accentSoft that --ink, still computed for a light default theme,
 * never anticipated). accentSoftText/accentSoftMuted are computed
 * directly from accentSoft's own final color (never from hex, never from
 * the surface), so text and captions drawn on top of it stay legible
 * regardless of how light/dark the base accent or the current theme
 * happen to be — any component that fills its background with
 * --accent-soft must use these two for its own text, not --ink/--muted*.
 */
export function buildAccentPalette(hex: string, scheme: ColorScheme = "light"): AccentPalette {
  const palette =
    scheme === "dark"
      ? {
          accent: hex,
          accentHover: lighten(hex, 0.16),
          accentLight: lighten(hex, 0.34),
          accentSoft: darken(hex, 0.72),
          accentContrast: getContrastText(hex),
        }
      : {
          accent: hex,
          accentHover: darken(hex, 0.14),
          accentLight: lighten(hex, 0.28),
          accentSoft: lighten(hex, 0.88),
          accentContrast: getContrastText(hex),
        };
  const accentSoftText = getContrastText(palette.accentSoft);
  return {
    ...palette,
    accentSoftText,
    accentSoftMuted: mixColors(accentSoftText, palette.accentSoft, 0.4),
  };
}

export interface SurfacePalette {
  canvas: string;
  paper: string;
  field: string;
  fieldHover: string;
  ink: string;
  mutedStrong: string;
  muted: string;
  line: string;
  lineStrong: string;
  navBg: string;
  navInk: string;
  navMuted: string;
  navLine: string;
  navHover: string;
}

/**
 * Derives a full, legible surface palette from a single arbitrary base
 * color — used when the user wants a custom background to apply to the
 * *whole* interface (canvas, cards, headers, inputs, borders, and the
 * nav chrome), not just one component. Every one of those pieces already
 * reads its color exclusively from the --canvas, --paper, --ink,
 * --muted(-strong), --line(-strong), --field(-hover) and --nav-* tokens
 * (verified by grep across this app's components), so overriding this
 * one set of tokens re-themes the entire UI with no per-component code
 * needed.
 *
 * The base color becomes --paper (the surface everything sits on);
 * --canvas recedes slightly darker so cards still read as "raised" above
 * the page — mirroring the same paper-lighter-than-canvas relationship
 * both the built-in light and dark themes already use, regardless of
 * whether the chosen base itself is light or dark. Ink/muted/line/field
 * are derived by contrast against that base, independent of light/dark
 * mode, the same approach the accent palette uses for its own contrast
 * color.
 */
export function buildSurfacePalette(hex: string): SurfacePalette {
  const ink = getContrastText(hex);
  const paper = hex;
  const canvas = darken(hex, 0.1);
  return {
    canvas,
    paper,
    field: mixColors(ink, paper, 0.94),
    fieldHover: mixColors(ink, paper, 0.88),
    ink,
    mutedStrong: mixColors(ink, paper, 0.35),
    muted: mixColors(ink, paper, 0.55),
    line: mixColors(ink, paper, 0.85),
    lineStrong: mixColors(ink, paper, 0.72),
    navBg: paper,
    navInk: ink,
    navMuted: mixColors(ink, paper, 0.35),
    navLine: mixColors(ink, paper, 0.85),
    navHover: mixColors(ink, paper, 0.88),
  };
}
