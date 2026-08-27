import { useId, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, id, className = "", ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? inputProps.name ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2 text-[13px] font-bold text-[var(--ink)]">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`h-12 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 text-[14px] font-medium text-[var(--ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      />
      {hint ? (
        <span id={hintId} className="text-[12px] font-medium text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-[12px] font-semibold text-[var(--danger)]"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
