interface BrandMarkProps {
  /** "nav" reads its label color from --nav-ink instead of --ink — for
   * placement inside the sidebar/navbar, whose background can be a
   * user-customized color independent of the rest of the theme. */
  tone?: "default" | "nav";
}

export function BrandMark({ tone = "default" }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-2.5" aria-label="ERP Platform">
      <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--accent)] text-[12px] font-extrabold tracking-[-0.05em] text-[var(--accent-contrast)]">
        ER
      </span>
      <span
        className={`text-[13px] font-extrabold tracking-[-0.02em] ${
          tone === "nav" ? "text-[var(--nav-ink)]" : "text-[var(--ink)]"
        }`}
      >
        ERP Platform
      </span>
    </div>
  );
}
