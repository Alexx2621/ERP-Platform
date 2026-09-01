import { PurchaseOrder, PurchaseOrderStatus } from "./purchase-order.entity";

export interface ListPurchaseOrdersFilter {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  limit: number;
}

export interface PurchaseOrderRepository {
  findById(tenantId: string, id: string): Promise<PurchaseOrder | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListPurchaseOrdersFilter): Promise<PurchaseOrder[]>;
  save(order: PurchaseOrder): Promise<void>;
}

export const PURCHASE_ORDER_REPOSITORY = Symbol("PURCHASE_ORDER_REPOSITORY");
