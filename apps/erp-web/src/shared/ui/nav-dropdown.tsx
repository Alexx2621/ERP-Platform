import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface NavDropdownItem {
  key: string;
  label: ReactNode;
  active?: boolean;
  onSelect: () => void;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
}

/**
 * A small, self-contained disclosure menu for the navbar layout's category
 * groups — no shared "Menu" primitive existed yet in this design system, and
 * a single controlled div (click-outside + Escape to close) is simpler than
 * pulling in a new dependency for one use site.
 */
export function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const hasActiveItem = items.some((item) => item.active);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-9 items-center gap-1 rounded-[8px] px-3 text-[13px] font-bold transition-colors duration-150 ${
          hasActiveItem
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : "text-[var(--muted-strong)] hover:bg-[var(--field-hover)] hover:text-[var(--ink)]"
        }`}
      >
        {label}
        <svg
          width="11"
          height="11"
          viewBox="0 0 256 256"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path
            fill="currentColor"
            d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z"
          />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1.5 min-w-[200px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-[var(--shadow-md)]"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2 text-left text-[13px] font-bold transition-colors duration-150 ${
                item.active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted-strong)] hover:bg-[var(--field-hover)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
