import { SalesReturnLine } from "./sales-return-line.entity";

export interface SalesReturnLineRepository {
  listBySalesReturn(tenantId: string, salesReturnId: string): Promise<SalesReturnLine[]>;
  /** Every SalesReturnLine ever recorded against this order line, across every return — used to compute the already-returned quantity. */
  listBySalesOrderLine(tenantId: string, salesOrderLineId: string): Promise<SalesReturnLine[]>;
  save(line: SalesReturnLine): Promise<void>;
}

export const SALES_RETURN_LINE_REPOSITORY = Symbol("SALES_RETURN_LINE_REPOSITORY");
