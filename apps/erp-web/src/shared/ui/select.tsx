import { CaretDown } from "@phosphor-icons/react";
import { useId, type PropsWithChildren, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Select({
  label,
  error,
  hint,
  id,
  className = "",
  children,
  ...selectProps
}: PropsWithChildren<SelectProps>) {
  const generatedId = useId();
  const selectId = id ?? selectProps.name ?? generatedId;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className="grid gap-2 text-[13px] font-bold text-[var(--ink)]">
      <label htmlFor={selectId}>{label}</label>
      <span className="relative block">
        <select
          {...selectProps}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`h-12 w-full appearance-none rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 pr-10 text-[14px] font-medium text-[var(--ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          {children}
        </select>
        <CaretDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-strong)]"
        />
      </span>
      {error ? (
        <span id={`${selectId}-error`} role="alert" className="text-[12px] font-semibold text-[var(--danger)]">
          {error}
        </span>
      ) : hint ? (
        <span id={`${selectId}-hint`} className="text-[12px] font-medium text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
