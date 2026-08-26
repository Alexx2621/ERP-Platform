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
      "bg-[var(--accent)] text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] hover:bg-[var(--accent-hover)]",
    secondary:
      "border border-[var(--line-strong)] bg-[var(--field)] text-[var(--ink)] hover:bg-[var(--field-hover)]",
    quiet: "text-[var(--muted-strong)] hover:bg-[var(--field-hover)] hover:text-[var(--ink)]",
  }[variant];

  return (
    <button
      {...buttonProps}
      disabled={disabled || busy}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-extrabold transition-[transform,background-color,border-color] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${variantClass} ${className}`}
    >
      {busy ? (
        <CircleNotch size={17} weight="bold" className="animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
