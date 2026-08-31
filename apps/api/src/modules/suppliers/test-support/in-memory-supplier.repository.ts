import { Supplier } from "../domain/supplier.entity";
import { SupplierRepository } from "../domain/supplier.repository";

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly byId = new Map<string, Supplier>();

  async findById(id: string): Promise<Supplier | null> {
    return this.byId.get(id) ?? null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Supplier | null> {
    return (
      [...this.byId.values()].find(
        (s) => s.tenantId === tenantId && s.companyId === companyId && s.code === code,
      ) ?? null
    );
  }

  async findByTaxId(tenantId: string, companyId: string, taxId: string): Promise<Supplier | null> {
    return (
      [...this.byId.values()].find(
        (s) => s.tenantId === tenantId && s.companyId === companyId && s.taxId === taxId,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Supplier[]> {
    return [...this.byId.values()].filter((s) => s.tenantId === tenantId && s.companyId === companyId);
  }

  async save(supplier: Supplier): Promise<void> {
    this.byId.set(supplier.id, supplier);
  }
}
