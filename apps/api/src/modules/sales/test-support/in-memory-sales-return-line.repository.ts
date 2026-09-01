import { SalesReturnLine } from "../domain/sales-return-line.entity";
import { SalesReturnLineRepository } from "../domain/sales-return-line.repository";

export class InMemorySalesReturnLineRepository implements SalesReturnLineRepository {
  private readonly items: SalesReturnLine[] = [];

  async listBySalesReturn(tenantId: string, salesReturnId: string): Promise<SalesReturnLine[]> {
    return this.items
      .filter((l) => l.tenantId === tenantId && l.salesReturnId === salesReturnId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listBySalesOrderLine(tenantId: string, salesOrderLineId: string): Promise<SalesReturnLine[]> {
    return this.items
      .filter((l) => l.tenantId === tenantId && l.salesOrderLineId === salesOrderLineId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: SalesReturnLine): Promise<void> {
    const index = this.items.findIndex((existing) => existing.id === line.id);
    if (index === -1) {
      this.items.push(line);
    } else {
      this.items[index] = line;
    }
  }
}
