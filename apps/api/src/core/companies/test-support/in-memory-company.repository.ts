import { Company } from "../domain/company.entity";
import { CompanyRepository } from "../domain/company.repository";

export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly records = new Map<string, Company>();

  async findById(tenantId: string, id: string): Promise<Company | null> {
    return this.records.get(this.key(tenantId, id)) ?? null;
  }

  async findByCode(tenantId: string, code: string): Promise<Company | null> {
    for (const company of this.records.values()) {
      if (company.tenantId === tenantId && company.code === code) return company;
    }
    return null;
  }

  async save(company: Company): Promise<void> {
    this.records.set(this.key(company.tenantId, company.id), company);
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
