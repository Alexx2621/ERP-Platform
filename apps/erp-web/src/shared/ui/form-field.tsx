import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, id, ...inputProps }: FormFieldProps) {
  const inputId = id ?? inputProps.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <label className="grid gap-2 text-[13px] font-bold text-[var(--ink)]" htmlFor={inputId}>
      {label}
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="h-12 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 text-[14px] font-medium text-[var(--ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      {error ? (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="text-[12px] font-semibold text-[var(--danger)]"
        >
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-[12px] font-medium text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
