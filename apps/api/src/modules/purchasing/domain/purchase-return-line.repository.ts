import { PurchaseReturnLine } from "./purchase-return-line.entity";

export interface PurchaseReturnLineRepository {
  listByPurchaseReturn(tenantId: string, purchaseReturnId: string): Promise<PurchaseReturnLine[]>;
  /** Every PurchaseReturnLine ever recorded against this order line, across every return — used to compute the already-returned quantity. */
  listByPurchaseOrderLine(tenantId: string, purchaseOrderLineId: string): Promise<PurchaseReturnLine[]>;
  save(line: PurchaseReturnLine): Promise<void>;
}

export const PURCHASE_RETURN_LINE_REPOSITORY = Symbol("PURCHASE_RETURN_LINE_REPOSITORY");
