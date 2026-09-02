import { Storefront } from "../domain/storefront.entity";
import { ListStorefrontsFilter, StorefrontRepository } from "../domain/storefront.repository";

export class InMemoryStorefrontRepository implements StorefrontRepository {
  private readonly byId = new Map<string, Storefront>();

  async findById(tenantId: string, id: string): Promise<Storefront | null> {
    const record = this.byId.get(id);
    return record && record.tenantId === tenantId ? record : null;
  }

  async findByCode(code: string): Promise<Storefront | null> {
    return [...this.byId.values()].find((s) => s.code === code) ?? null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListStorefrontsFilter): Promise<Storefront[]> {
    return [...this.byId.values()]
      .filter((s) => s.tenantId === tenantId && s.companyId === companyId && (filter.status === undefined || s.status === filter.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(storefront: Storefront): Promise<void> {
    this.byId.set(storefront.id, storefront);
  }
}
