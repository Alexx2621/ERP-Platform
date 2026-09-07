import type { ReactNode } from "react";

/**
 * Semantic tone of a status pill. Kept deliberately small and generic —
 * every module maps its own status enum onto these four, instead of each
 * feature inventing its own colour vocabulary.
 */
export type StatusTone = "neutral" | "progress" | "success" | "danger";

const TONE_CLASS: Record<StatusTone, string> = {
  // Draft/inactive: readable, but visually quiet — it is not an outcome yet.
  neutral: "border-[var(--line-strong)] bg-[var(--field-hover)] text-[var(--muted-strong)]",
  // In flight: uses the accent, so it follows the user's own theme colour.
  progress: "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]",
  success: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
  danger: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
};

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
