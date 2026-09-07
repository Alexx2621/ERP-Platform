import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";

function mergeClassName(base: string, className?: string): string {
  return `${base} ${className ?? ""}`.trim();
}

/**
 * Elevated container used to group a work list/editor section — turns a
 * flat page of a toolbar-then-table into distinct, "app-like" panels
 * instead of one long scroll. Rounded corners, a hairline border and a
 * soft shadow, all from existing tokens (`--line`, `--paper`,
 * `--shadow-sm`) so it follows the active theme (light/dark, custom accent
 * and surface colors) with no colors of its own.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={mergeClassName(
        "rounded-[16px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow-sm)]",
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** A section header inside a `Card` — icon in a soft accent tile, title,
 * optional description, and a right-aligned action slot (a button, a
 * status badge). */
export function CardHeader({ icon: HeaderIcon, title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {HeaderIcon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]">
            <HeaderIcon size={17} weight="bold" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-[var(--ink)]">{title}</p>
          {description ? (
            <p className="truncate text-[11.5px] font-medium text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={mergeClassName("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={mergeClassName("border-t border-[var(--line)] px-5 py-3.5", className)}
      {...props}
    />
  );
}
