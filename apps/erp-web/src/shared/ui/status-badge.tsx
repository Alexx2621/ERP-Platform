import type { ReactNode } from "react";

/**
 * Semantic tone of a status indicator. Kept deliberately small and generic —
 * every module maps its own status enum onto these four, instead of each
 * feature inventing its own colour vocabulary.
 */
export type StatusTone = "neutral" | "progress" | "success" | "danger";

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-[var(--muted)]",
  progress: "bg-[var(--accent)]",
  success: "bg-[var(--success)]",
  danger: "bg-[var(--danger)]",
};

const TEXT_CLASS: Record<StatusTone, string> = {
  neutral: "text-[var(--muted-strong)]",
  progress: "text-[var(--accent-soft-text)]",
  success: "text-[var(--success)]",
  danger: "text-[var(--danger)]",
};

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  /** "In flight" tones get a soft pulse so an active/pending state reads
   * as alive, not just labeled — used sparingly (draft/confirmed states),
   * never on a terminal one. Respects `prefers-reduced-motion` globally
   * (see styles.css). */
  pulse?: boolean;
}

/**
 * A dot + label, not a filled pill — the same minimal status-indicator
 * language modern work tools (Linear, Notion) use, chosen deliberately over
 * the heavier colored-background badge this codebase's other status
 * displays still use elsewhere. Scoped to Sales only for now (no other
 * module renders this component yet).
 */
export function StatusBadge({ tone, children, pulse = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold ${TEXT_CLASS[tone]}`}>
      <span className="relative grid size-1.5 shrink-0 place-items-center">
        {pulse ? (
          <span className={`absolute size-full animate-ping rounded-full opacity-60 ${DOT_CLASS[tone]}`} />
        ) : null}
        <span className={`size-1.5 rounded-full ${DOT_CLASS[tone]}`} />
      </span>
      {children}
    </span>
  );
}
