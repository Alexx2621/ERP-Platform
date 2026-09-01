import { PurchaseReturnLine } from "../domain/purchase-return-line.entity";
import { PurchaseReturnLineRepository } from "../domain/purchase-return-line.repository";

export class InMemoryPurchaseReturnLineRepository implements PurchaseReturnLineRepository {
  private readonly byId = new Map<string, PurchaseReturnLine>();

  async listByPurchaseReturn(tenantId: string, purchaseReturnId: string): Promise<PurchaseReturnLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.purchaseReturnId === purchaseReturnId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByPurchaseOrderLine(tenantId: string, purchaseOrderLineId: string): Promise<PurchaseReturnLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.purchaseOrderLineId === purchaseOrderLineId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: PurchaseReturnLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
