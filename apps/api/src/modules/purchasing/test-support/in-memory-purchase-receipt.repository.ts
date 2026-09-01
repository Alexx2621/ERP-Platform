import { PurchaseReceipt } from "../domain/purchase-receipt.entity";
import { ListPurchaseReceiptsFilter, PurchaseReceiptRepository } from "../domain/purchase-receipt.repository";

export class InMemoryPurchaseReceiptRepository implements PurchaseReceiptRepository {
  private readonly byId = new Map<string, PurchaseReceipt>();

  async findById(tenantId: string, id: string): Promise<PurchaseReceipt | null> {
    const receipt = this.byId.get(id);
    return receipt && receipt.tenantId === tenantId ? receipt : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListPurchaseReceiptsFilter,
  ): Promise<PurchaseReceipt[]> {
    return [...this.byId.values()]
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.companyId === companyId &&
          (filter.purchaseOrderId === undefined || r.purchaseOrderId === filter.purchaseOrderId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseReceipt[]> {
    return [...this.byId.values()].filter((r) => r.tenantId === tenantId && r.purchaseOrderId === purchaseOrderId);
  }

  async save(receipt: PurchaseReceipt): Promise<void> {
    this.byId.set(receipt.id, receipt);
  }
}
