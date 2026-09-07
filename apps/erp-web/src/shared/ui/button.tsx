import { CircleNotch } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  variant?: "primary" | "secondary" | "quiet";
}

export function Button({
  busy = false,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...buttonProps
}: PropsWithChildren<ButtonProps>) {
  const variantClass = {
    primary:
      "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-md)]",
    secondary:
      "border border-[var(--line-strong)] bg-[var(--field)] text-[var(--ink)] hover:bg-[var(--field-hover)] hover:border-[var(--line-strong)]",
    quiet: "text-[var(--muted-strong)] hover:bg-[var(--field-hover)] hover:text-[var(--ink)]",
  }[variant];

  return (
    <button
      {...buttonProps}
      disabled={disabled || busy}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-[13px] font-bold transition-[transform,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 ${variantClass} ${className}`}
    >
      {busy ? (
        <CircleNotch size={17} weight="bold" className="animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
