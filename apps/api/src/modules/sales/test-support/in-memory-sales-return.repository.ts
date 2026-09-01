import { SalesReturn } from "../domain/sales-return.entity";
import { ListSalesReturnsFilter, SalesReturnRepository } from "../domain/sales-return.repository";

export class InMemorySalesReturnRepository implements SalesReturnRepository {
  private readonly byId = new Map<string, SalesReturn>();

  async findById(tenantId: string, id: string): Promise<SalesReturn | null> {
    const salesReturn = this.byId.get(id);
    return salesReturn && salesReturn.tenantId === tenantId ? salesReturn : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListSalesReturnsFilter): Promise<SalesReturn[]> {
    return [...this.byId.values()]
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.companyId === companyId &&
          (filter.salesOrderId === undefined || r.salesOrderId === filter.salesOrderId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(salesReturn: SalesReturn): Promise<void> {
    this.byId.set(salesReturn.id, salesReturn);
  }
}
