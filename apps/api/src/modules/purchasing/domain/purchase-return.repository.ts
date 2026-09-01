import { PurchaseReturn } from "./purchase-return.entity";

export interface ListPurchaseReturnsFilter {
  purchaseOrderId?: string;
  limit: number;
}

export interface PurchaseReturnRepository {
  findById(tenantId: string, id: string): Promise<PurchaseReturn | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListPurchaseReturnsFilter): Promise<PurchaseReturn[]>;
  save(purchaseReturn: PurchaseReturn): Promise<void>;
}

export const PURCHASE_RETURN_REPOSITORY = Symbol("PURCHASE_RETURN_REPOSITORY");
