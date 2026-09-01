import { SalesOrderLine } from "./sales-order-line.entity";

export interface SalesOrderLineRepository {
  findById(tenantId: string, id: string): Promise<SalesOrderLine | null>;
  listBySalesOrder(tenantId: string, salesOrderId: string): Promise<SalesOrderLine[]>;
  save(line: SalesOrderLine): Promise<void>;
}

export const SALES_ORDER_LINE_REPOSITORY = Symbol("SALES_ORDER_LINE_REPOSITORY");
