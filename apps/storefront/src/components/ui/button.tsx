import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  variant?: "primary" | "secondary" | "quiet";
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

export function Button({
  busy = false,
  variant = "primary",
  children,
  className = "",
  disabled,
  type = "button",
  ...buttonProps
}: PropsWithChildren<ButtonProps>) {
  const variantClass = {
    primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    secondary:
      "border border-[var(--line-strong)] bg-[var(--field)] text-[var(--ink)] hover:bg-[var(--field-hover)]",
    quiet: "text-[var(--muted-strong)] underline-offset-4 hover:text-[var(--ink)] hover:underline",
  }[variant];

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled ?? busy}
      aria-busy={busy || undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[13px] font-bold transition-colors duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${variantClass} ${className}`}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}
