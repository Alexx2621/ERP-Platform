import { PurchaseOrderLine } from "../domain/purchase-order-line.entity";
import { PurchaseOrderLineRepository } from "../domain/purchase-order-line.repository";

export class InMemoryPurchaseOrderLineRepository implements PurchaseOrderLineRepository {
  private readonly byId = new Map<string, PurchaseOrderLine>();

  async findById(tenantId: string, id: string): Promise<PurchaseOrderLine | null> {
    const line = this.byId.get(id);
    return line && line.tenantId === tenantId ? line : null;
  }

  async listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrderLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.purchaseOrderId === purchaseOrderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: PurchaseOrderLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
