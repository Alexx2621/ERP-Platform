import { PurchaseReceiptLine } from "../domain/purchase-receipt-line.entity";
import { PurchaseReceiptLineRepository } from "../domain/purchase-receipt-line.repository";

export class InMemoryPurchaseReceiptLineRepository implements PurchaseReceiptLineRepository {
  private readonly byId = new Map<string, PurchaseReceiptLine>();

  async listByPurchaseReceipt(tenantId: string, purchaseReceiptId: string): Promise<PurchaseReceiptLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.purchaseReceiptId === purchaseReceiptId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByPurchaseOrderLine(tenantId: string, purchaseOrderLineId: string): Promise<PurchaseReceiptLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.purchaseOrderLineId === purchaseOrderLineId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: PurchaseReceiptLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
