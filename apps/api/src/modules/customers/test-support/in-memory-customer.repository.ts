import { Customer } from "../domain/customer.entity";
import { CustomerRepository } from "../domain/customer.repository";

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly byId = new Map<string, Customer>();

  async findById(id: string): Promise<Customer | null> {
    return this.byId.get(id) ?? null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Customer | null> {
    return (
      [...this.byId.values()].find(
        (c) => c.tenantId === tenantId && c.companyId === companyId && c.code === code,
      ) ?? null
    );
  }

  async findByTaxId(tenantId: string, companyId: string, taxId: string): Promise<Customer | null> {
    return (
      [...this.byId.values()].find(
        (c) => c.tenantId === tenantId && c.companyId === companyId && c.taxId === taxId,
      ) ?? null
    );
  }

  async findByEmail(tenantId: string, companyId: string, email: string): Promise<Customer | null> {
    return (
      [...this.byId.values()]
        .filter((c) => c.tenantId === tenantId && c.companyId === companyId && c.email === email)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Customer[]> {
    return [...this.byId.values()].filter((c) => c.tenantId === tenantId && c.companyId === companyId);
  }

  async save(customer: Customer): Promise<void> {
    this.byId.set(customer.id, customer);
  }
}
