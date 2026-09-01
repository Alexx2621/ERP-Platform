import { SalesOrder, SalesOrderStatus } from "./sales-order.entity";

export interface ListSalesOrdersFilter {
  status?: SalesOrderStatus;
  customerId?: string;
  limit: number;
}

export interface SalesOrderRepository {
  findById(tenantId: string, id: string): Promise<SalesOrder | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListSalesOrdersFilter): Promise<SalesOrder[]>;
  save(order: SalesOrder): Promise<void>;
}

export const SALES_ORDER_REPOSITORY = Symbol("SALES_ORDER_REPOSITORY");
