import { PurchaseReceiptLine } from "./purchase-receipt-line.entity";

export interface PurchaseReceiptLineRepository {
  listByPurchaseReceipt(tenantId: string, purchaseReceiptId: string): Promise<PurchaseReceiptLine[]>;
  /** Every PurchaseReceiptLine ever recorded against this order line, across every receipt — used to compute the already-received quantity. */
  listByPurchaseOrderLine(tenantId: string, purchaseOrderLineId: string): Promise<PurchaseReceiptLine[]>;
  save(line: PurchaseReceiptLine): Promise<void>;
}

export const PURCHASE_RECEIPT_LINE_REPOSITORY = Symbol("PURCHASE_RECEIPT_LINE_REPOSITORY");
