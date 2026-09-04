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

/** Mixes a hex color toward white (positive amount) or black (negative amount), 0..1. */
function mix(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const target = amount >= 0 ? 255 : 0;
  const weight = Math.abs(amount);
  return toHex([
    r + (target - r) * weight,
    g + (target - g) * weight,
    b + (target - b) * weight,
  ]);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, -Math.abs(amount));
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, Math.abs(amount));
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

export interface AccentPalette {
  accent: string;
  accentHover: string;
  accentLight: string;
  accentSoft: string;
  accentContrast: string;
}

export function buildAccentPalette(hex: string): AccentPalette {
  return {
    accent: hex,
    accentHover: darken(hex, 0.14),
    accentLight: lighten(hex, 0.28),
    accentSoft: lighten(hex, 0.88),
    accentContrast: getContrastText(hex),
  };
}
