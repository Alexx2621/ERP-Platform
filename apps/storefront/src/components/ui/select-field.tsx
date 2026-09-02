import type { PropsWithChildren, SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function SelectField({
  label,
  hint,
  id,
  children,
  ...selectProps
}: PropsWithChildren<SelectFieldProps>) {
  const selectId = id ?? selectProps.name;

  return (
    <label className="grid gap-1.5 text-[13px] font-bold text-[var(--ink)]" htmlFor={selectId}>
      {label}
      <select
        {...selectProps}
        id={selectId}
        aria-describedby={hint ? `${selectId}-hint` : undefined}
        className="h-11 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 text-[14px] font-medium text-[var(--ink)] outline-none transition-colors duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      {hint ? (
        <span id={`${selectId}-hint`} className="text-[12px] font-medium text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
