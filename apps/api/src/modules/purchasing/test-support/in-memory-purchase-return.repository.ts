import { PurchaseReturn } from "../domain/purchase-return.entity";
import { ListPurchaseReturnsFilter, PurchaseReturnRepository } from "../domain/purchase-return.repository";

export class InMemoryPurchaseReturnRepository implements PurchaseReturnRepository {
  private readonly byId = new Map<string, PurchaseReturn>();

  async findById(tenantId: string, id: string): Promise<PurchaseReturn | null> {
    const purchaseReturn = this.byId.get(id);
    return purchaseReturn && purchaseReturn.tenantId === tenantId ? purchaseReturn : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListPurchaseReturnsFilter,
  ): Promise<PurchaseReturn[]> {
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

  async save(purchaseReturn: PurchaseReturn): Promise<void> {
    this.byId.set(purchaseReturn.id, purchaseReturn);
  }
}
