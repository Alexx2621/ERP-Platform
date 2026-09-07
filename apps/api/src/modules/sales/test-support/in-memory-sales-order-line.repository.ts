import { SalesOrderLine } from "../domain/sales-order-line.entity";
import { addDecimal } from "../domain/decimal";
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

  async sumTotalsByOrders(tenantId: string, salesOrderIds: string[]): Promise<Map<string, string>> {
    const totals = new Map<string, string>();
    for (const line of this.byId.values()) {
      if (line.tenantId !== tenantId || !salesOrderIds.includes(line.salesOrderId)) continue;
      totals.set(line.salesOrderId, addDecimal(totals.get(line.salesOrderId) ?? "0", line.lineTotal));
    }
    return totals;
  }

  async save(line: SalesOrderLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
