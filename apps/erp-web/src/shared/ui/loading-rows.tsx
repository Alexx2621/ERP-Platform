import { TableCell, TableRow } from "./table";

export function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 3 }, (_, rowIndex) => (
    <TableRow key={rowIndex} aria-hidden="true">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <span className="block h-3.5 max-w-40 animate-pulse rounded bg-[var(--line)]" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
