import type {
  HTMLAttributes,
  PropsWithChildren,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

function mergeClassName(base: string, className?: string): string {
  return `${base} ${className ?? ""}`.trim();
}

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div
      className={mergeClassName(
        "overflow-x-auto rounded-[12px] border border-[var(--line)] bg-[var(--paper)]",
        containerClassName,
      )}
    >
      <table
        className={mergeClassName("w-full min-w-[640px] border-collapse text-left", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={mergeClassName(
        "border-b border-[var(--line-strong)] bg-[var(--field-hover)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={mergeClassName("divide-y divide-[var(--line)]", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={mergeClassName(
        "transition-colors duration-150 hover:bg-[var(--field-hover)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={mergeClassName(
        "h-11 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={mergeClassName(
        "px-4 py-3.5 text-[13px] font-semibold text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

interface TableEmptyProps extends TdHTMLAttributes<HTMLTableCellElement> {
  title: string;
  description?: string;
}

export function TableEmpty({ title, description, className, ...props }: TableEmptyProps) {
  return (
    <TableCell className={mergeClassName("h-40 text-center", className)} {...props}>
      <p className="text-[14px] font-extrabold text-[var(--ink)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-[48ch] text-[12px] font-medium leading-5 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </TableCell>
  );
}

export function TableCaption({ children }: PropsWithChildren) {
  return <caption className="sr-only">{children}</caption>;
}
