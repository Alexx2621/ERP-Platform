import { SalesReturn } from "./sales-return.entity";

export interface ListSalesReturnsFilter {
  salesOrderId?: string;
  limit: number;
}

export interface SalesReturnRepository {
  findById(tenantId: string, id: string): Promise<SalesReturn | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListSalesReturnsFilter): Promise<SalesReturn[]>;
  save(salesReturn: SalesReturn): Promise<void>;
}

export const SALES_RETURN_REPOSITORY = Symbol("SALES_RETURN_REPOSITORY");
