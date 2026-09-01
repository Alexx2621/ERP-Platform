import { PurchaseReceipt } from "./purchase-receipt.entity";

export interface ListPurchaseReceiptsFilter {
  purchaseOrderId?: string;
  limit: number;
}

export interface PurchaseReceiptRepository {
  findById(tenantId: string, id: string): Promise<PurchaseReceipt | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListPurchaseReceiptsFilter): Promise<PurchaseReceipt[]>;
  /** Used by `CancelPurchaseOrderUseCase` to reject cancelling a CONFIRMED order that has already received goods. */
  listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseReceipt[]>;
  save(receipt: PurchaseReceipt): Promise<void>;
}

export const PURCHASE_RECEIPT_REPOSITORY = Symbol("PURCHASE_RECEIPT_REPOSITORY");
