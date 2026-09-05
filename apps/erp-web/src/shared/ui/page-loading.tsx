/**
 * Page-level loading placeholder for a module screen that can't render its
 * tabs until its prerequisite data (customers, warehouses, ...) has
 * actually loaded.
 *
 * Exists because of a real bug: several module pages started with empty
 * arrays and no loading flag, so their "you have no customers yet" guard
 * rendered as a red error banner on every single visit for the fraction of
 * a second the API call was in flight — including for companies with
 * dozens of real customers. Distinguishing "still loading" from "genuinely
 * empty" is what removes that flash; this is what the loading half looks
 * like. `LoadingRows` can't be reused here — it renders <tr> elements for
 * a table body, not a standalone page region.
 */
export function PageLoading() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <span className="h-9 w-72 animate-pulse rounded-[8px] bg-[var(--field-hover)]" />
      <span className="h-48 animate-pulse rounded-[14px] bg-[var(--field-hover)]" />
    </div>
  );
}
