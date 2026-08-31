import { Brand } from "../domain/brand.entity";
import { BrandRepository } from "../domain/brand.repository";

export class InMemoryBrandRepository implements BrandRepository {
  private readonly byId = new Map<string, Brand>();

  async findById(tenantId: string, id: string): Promise<Brand | null> {
    const brand = this.byId.get(id);
    return brand && brand.tenantId === tenantId ? brand : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Brand | null> {
    return (
      [...this.byId.values()].find(
        (b) => b.tenantId === tenantId && b.companyId === companyId && b.code === code,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Brand[]> {
    return [...this.byId.values()].filter((b) => b.tenantId === tenantId && b.companyId === companyId);
  }

  async save(brand: Brand): Promise<void> {
    this.byId.set(brand.id, brand);
  }
}
