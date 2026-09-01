import { PurchaseOrderLine } from "./purchase-order-line.entity";

export interface PurchaseOrderLineRepository {
  findById(tenantId: string, id: string): Promise<PurchaseOrderLine | null>;
  listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrderLine[]>;
  save(line: PurchaseOrderLine): Promise<void>;
}

export const PURCHASE_ORDER_LINE_REPOSITORY = Symbol("PURCHASE_ORDER_LINE_REPOSITORY");
