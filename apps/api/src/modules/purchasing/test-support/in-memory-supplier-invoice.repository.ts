import { SupplierInvoice } from "../domain/supplier-invoice.entity";
import { ListSupplierInvoicesFilter, SupplierInvoiceRepository } from "../domain/supplier-invoice.repository";

export class InMemorySupplierInvoiceRepository implements SupplierInvoiceRepository {
  private readonly byId = new Map<string, SupplierInvoice>();

  async findById(tenantId: string, id: string): Promise<SupplierInvoice | null> {
    const invoice = this.byId.get(id);
    return invoice && invoice.tenantId === tenantId ? invoice : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListSupplierInvoicesFilter,
  ): Promise<SupplierInvoice[]> {
    return [...this.byId.values()]
      .filter(
        (i) =>
          i.tenantId === tenantId &&
          i.companyId === companyId &&
          (filter.purchaseOrderId === undefined || i.purchaseOrderId === filter.purchaseOrderId) &&
          (filter.supplierId === undefined || i.supplierId === filter.supplierId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(invoice: SupplierInvoice): Promise<void> {
    this.byId.set(invoice.id, invoice);
  }
}
