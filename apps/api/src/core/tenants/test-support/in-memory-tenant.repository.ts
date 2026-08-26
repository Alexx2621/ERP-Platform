import { Tenant } from "../domain/tenant.entity";
import { TenantRepository } from "../domain/tenant.repository";

export class InMemoryTenantRepository implements TenantRepository {
  private readonly records = new Map<string, Tenant>();

  async findById(id: string): Promise<Tenant | null> {
    return this.records.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    for (const tenant of this.records.values()) {
      if (tenant.slug === slug) return tenant;
    }
    return null;
  }

  async save(tenant: Tenant): Promise<void> {
    this.records.set(tenant.id, tenant);
  }
}
