import { SalesOrderLine } from "./sales-order-line.entity";

export interface SalesOrderLineRepository {
  findById(tenantId: string, id: string): Promise<SalesOrderLine | null>;
  listBySalesOrder(tenantId: string, salesOrderId: string): Promise<SalesOrderLine[]>;
  save(line: SalesOrderLine): Promise<void>;
  /**
   * Sum of `lineTotal` per order, for the given order ids. Returned as a
   * map keyed by `salesOrderId`; an order with no lines is simply absent.
   *
   * Exists so a list screen can show each order's total without an N+1
   * `listBySalesOrder` per row. The total is always aggregated from the
   * lines on read — never a denormalized column on `SalesOrder` — the same
   * "read the ledger, never a stored counter" rule `InventoryBalance`, the
   * Trial Balance and Manufacturing's `quantityCompleted` already follow.
   */
  sumTotalsByOrders(tenantId: string, salesOrderIds: string[]): Promise<Map<string, string>>;

  /**
   * Quantity and revenue aggregated per product, over an already-resolved
   * set of order ids (the caller decides which orders qualify — date
   * range, status — so this stays a pure aggregation with no knowledge of
   * `SalesOrder`'s own fields). Sorted by revenue descending, capped at
   * `limit`. Backs the home dashboard's real "Top productos" widget — no
   * fabricated ranking, a genuine `groupBy` over this module's own ledger.
   */
  topProductTotals(
    tenantId: string,
    salesOrderIds: string[],
    limit: number,
  ): Promise<Array<{ productId: string; quantity: string; revenue: string }>>;
}

export const SALES_ORDER_LINE_REPOSITORY = Symbol("SALES_ORDER_LINE_REPOSITORY");
