import { SalesOrder } from "../domain/sales-order.entity";
import { ListSalesOrdersFilter, SalesOrderRepository } from "../domain/sales-order.repository";

export class InMemorySalesOrderRepository implements SalesOrderRepository {
  private readonly byId = new Map<string, SalesOrder>();

  async findById(tenantId: string, id: string): Promise<SalesOrder | null> {
    const order = this.byId.get(id);
    return order && order.tenantId === tenantId ? order : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListSalesOrdersFilter): Promise<SalesOrder[]> {
    return [...this.byId.values()]
      .filter(
        (o) =>
          o.tenantId === tenantId &&
          o.companyId === companyId &&
          (filter.status === undefined || o.status === filter.status) &&
          (filter.customerId === undefined || o.customerId === filter.customerId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(order: SalesOrder): Promise<void> {
    this.byId.set(order.id, order);
  }
}
