import { ProductionOrder } from "../domain/production-order.entity";
import { ListProductionOrdersFilter, ProductionOrderRepository } from "../domain/production-order.repository";

export class InMemoryProductionOrderRepository implements ProductionOrderRepository {
  private readonly byId = new Map<string, ProductionOrder>();

  async findById(tenantId: string, id: string): Promise<ProductionOrder | null> {
    const order = this.byId.get(id);
    return order && order.tenantId === tenantId ? order : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListProductionOrdersFilter,
  ): Promise<ProductionOrder[]> {
    return [...this.byId.values()]
      .filter(
        (o) =>
          o.tenantId === tenantId &&
          o.companyId === companyId &&
          (filter.status === undefined || o.status === filter.status) &&
          (filter.billOfMaterialId === undefined || o.billOfMaterialId === filter.billOfMaterialId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(order: ProductionOrder): Promise<void> {
    this.byId.set(order.id, order);
  }
}
