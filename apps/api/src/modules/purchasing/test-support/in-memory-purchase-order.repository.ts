import { PurchaseOrder } from "../domain/purchase-order.entity";
import { ListPurchaseOrdersFilter, PurchaseOrderRepository } from "../domain/purchase-order.repository";

export class InMemoryPurchaseOrderRepository implements PurchaseOrderRepository {
  private readonly byId = new Map<string, PurchaseOrder>();

  async findById(tenantId: string, id: string): Promise<PurchaseOrder | null> {
    const order = this.byId.get(id);
    return order && order.tenantId === tenantId ? order : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListPurchaseOrdersFilter,
  ): Promise<PurchaseOrder[]> {
    return [...this.byId.values()]
      .filter(
        (o) =>
          o.tenantId === tenantId &&
          o.companyId === companyId &&
          (filter.status === undefined || o.status === filter.status) &&
          (filter.supplierId === undefined || o.supplierId === filter.supplierId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(order: PurchaseOrder): Promise<void> {
    this.byId.set(order.id, order);
  }
}
