import { CaretDown, CaretUp, CaretUpDown, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState, type ReactNode, type ThHTMLAttributes } from "react";
import { TableHead } from "./table";

/**
 * Work-table primitives: a toolbar (search + filters + a right-hand action
 * slot), sortable column headers, and a pagination footer.
 *
 * Deliberately client-side. Every list endpoint in this API caps at 200 rows
 * and none of them accepts a text-search or sort parameter today, so these
 * operate over the page already fetched — the honest capability, not a
 * pretend server-side grid. The pagination footer states the real row count
 * so a user can see when they are looking at a capped page.
 */

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

interface DataTableToolbarProps {
  /** Current search text. */
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (selects, etc.) rendered next to the search box. */
  filters?: ReactNode;
  /** Right-aligned slot, typically the primary action button. */
  action?: ReactNode;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  filters,
  action,
}: DataTableToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <label className="relative flex min-w-[220px] flex-1 items-center">
        <span className="sr-only">{searchPlaceholder}</span>
        <MagnifyingGlass
          size={15}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute left-3 text-[var(--muted)]"
        />
        <input
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-9 w-full rounded-[8px] border border-[var(--line)] bg-[var(--field)] pl-9 pr-3 text-[13px] font-semibold text-[var(--ink)] outline-none transition-colors placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </label>
      {filters}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

/**
 * A compact `<select>` for the toolbar — smaller than the form `Select`,
 * which carries a stacked label and form-sized spacing.
 */
interface DataTableFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function DataTableFilter({ label, value, onChange, options }: DataTableFilterProps) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[8px] border border-[var(--line)] bg-[var(--field)] px-3 text-[13px] font-semibold text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SortableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  column: string;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  children: ReactNode;
}

export function SortableHead({ column, sort, onSortChange, children, ...props }: SortableHeadProps) {
  const isActive = sort.column === column;
  const nextDirection: SortDirection = isActive && sort.direction === "asc" ? "desc" : "asc";
  const Icon = isActive ? (sort.direction === "asc" ? CaretUp : CaretDown) : CaretUpDown;
  return (
    <TableHead
      aria-sort={isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSortChange({ column, direction: nextDirection })}
        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)]"
      >
        {children}
        <Icon
          size={12}
          weight="bold"
          aria-hidden
          className={isActive ? "text-[var(--accent)]" : "opacity-50"}
        />
      </button>
    </TableHead>
  );
}

interface PaginationFooterProps {
  page: number;
  pageCount: number;
  total: number;
  filtered: number;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({
  page,
  pageCount,
  total,
  filtered,
  onPageChange,
}: PaginationFooterProps) {
  const summary =
    filtered === total
      ? `${total} ${total === 1 ? "registro" : "registros"}`
      : `${filtered} de ${total} registros`;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-[var(--muted-strong)]">
      <span>{summary}</span>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-8 rounded-[8px] border border-[var(--line)] px-3 text-[12px] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--field-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {page} de {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="h-8 rounded-[8px] border border-[var(--line)] px-3 text-[12px] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--field-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}

export interface WorkTableOptions<T> {
  rows: T[];
  /** Free-text haystack for one row — matched case-insensitively. */
  searchable: (row: T) => string;
  /** Comparable value per sortable column. Strings compare with `localeCompare`. */
  sortValue: (row: T, column: string) => string | number;
  initialSort: SortState;
  pageSize?: number;
  /** Extra predicate (status/customer filters), applied before search. */
  filter?: (row: T) => boolean;
}

/**
 * Applies search, filtering, sorting and pagination to an already-fetched
 * page of rows, returning both the visible slice and the state the toolbar
 * and footer need.
 */
export function useWorkTable<T>({
  rows,
  searchable,
  sortValue,
  initialSort,
  pageSize = 25,
  filter,
}: WorkTableOptions<T>) {
  const [search, setSearchState] = useState("");
  const [sort, setSort] = useState<SortState>(initialSort);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!filter || filter(row)) &&
        (needle === "" || searchable(row).toLowerCase().includes(needle)),
    );
  }, [filter, rows, search, searchable]);

  const sorted = useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sortValue(a, sort.column);
      const right = sortValue(b, sort.column);
      if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
      return String(left).localeCompare(String(right), "es") * factor;
    });
  }, [filtered, sort, sortValue]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Clamp instead of storing a corrected page: filtering down to fewer pages
  // while sitting on a later one must not blank the table.
  const currentPage = Math.min(page, pageCount);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    sort,
    setSort,
    page: currentPage,
    setPage,
    pageCount,
    visible,
    total: rows.length,
    filteredCount: sorted.length,
  };
}
