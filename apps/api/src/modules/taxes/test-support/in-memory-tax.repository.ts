import { Tax } from "../domain/tax.entity";
import { TaxRepository } from "../domain/tax.repository";

export class InMemoryTaxRepository implements TaxRepository {
  private readonly byId = new Map<string, Tax>();

  async findById(tenantId: string, id: string): Promise<Tax | null> {
    const tax = this.byId.get(id);
    return tax && tax.tenantId === tenantId ? tax : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Tax | null> {
    return (
      [...this.byId.values()].find(
        (t) => t.tenantId === tenantId && t.companyId === companyId && t.code === code,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Tax[]> {
    return [...this.byId.values()].filter((t) => t.tenantId === tenantId && t.companyId === companyId);
  }

  async save(tax: Tax): Promise<void> {
    this.byId.set(tax.id, tax);
  }
}
