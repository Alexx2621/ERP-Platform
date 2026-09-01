import { SalesOrderLine } from "../domain/sales-order-line.entity";
import { SalesOrderLineRepository } from "../domain/sales-order-line.repository";

export class InMemorySalesOrderLineRepository implements SalesOrderLineRepository {
  private readonly byId = new Map<string, SalesOrderLine>();

  async findById(tenantId: string, id: string): Promise<SalesOrderLine | null> {
    const line = this.byId.get(id);
    return line && line.tenantId === tenantId ? line : null;
  }

  async listBySalesOrder(tenantId: string, salesOrderId: string): Promise<SalesOrderLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.salesOrderId === salesOrderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: SalesOrderLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
