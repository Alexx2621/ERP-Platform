import { TableCell, TableRow } from "./table";

/** Varying widths per column read as "text of different lengths" rather
 * than a uniform grid of identical bars — a small realism touch. */
const WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-36", "w-20"];

export function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 3 }, (_, rowIndex) => (
    <TableRow key={rowIndex} aria-hidden="true">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <span className={`shimmer block h-3.5 rounded-[4px] ${WIDTHS[(rowIndex + columnIndex) % WIDTHS.length]}`} />
        </TableCell>
      ))}
    </TableRow>
  ));
}
