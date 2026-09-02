/**
 * No real product images exist yet anywhere in this platform (see
 * MASTER_SPEC's product model — nothing has an image field wired up).
 * This is an honest, neutral placeholder, not a fabricated stock photo.
 */
export function PlaceholderImage({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Imagen no disponible para ${label}`}
      className={`flex items-center justify-center rounded-[12px] border border-dashed border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--muted)] ${className}`}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5-11 11" />
      </svg>
    </div>
  );
}
