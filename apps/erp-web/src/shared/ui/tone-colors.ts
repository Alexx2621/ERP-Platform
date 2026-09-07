/**
 * Fixed, theme-independent accent colors for section/category identity —
 * CardHeader tiles, dashboard widget icons, module navigation icons.
 * Deliberately NOT derived from the user's customizable accent color
 * (see AppearanceProvider): reusing that single color everywhere is what
 * made the interface read as flat once a user picked a muted or
 * monochrome accent. A fixed palette gives each kind of section its own
 * visual identity instead, the same "one color per category" pattern
 * modern SaaS sidebars (Notion, Linear) and KPI dashboards use — see
 * `docs/PROJECT_STATE.md` for the UI/UX research behind this decision.
 *
 * Same family of hues already offered as accent presets in Apariencia
 * (`features/appearance/appearance-page.tsx`), extended with a few more
 * so every module/widget can get a genuinely distinct tone.
 */
export const TONE = {
  blue: "#2563eb",
  green: "#16a34a",
  purple: "#7c3aed",
  orange: "#ea580c",
  red: "#dc2626",
  teal: "#0d9488",
  pink: "#db2777",
  amber: "#d97706",
  indigo: "#4f46e5",
  cyan: "#0891b2",
  violet: "#9333ea",
  emerald: "#059669",
  rose: "#e11d48",
  sky: "#0284c7",
  fuchsia: "#c026d3",
  slate: "#64748b",
} as const;

export type ToneName = keyof typeof TONE;
