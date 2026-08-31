import { Category } from "../domain/category.entity";
import { CategoryRepository } from "../domain/category.repository";

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly byId = new Map<string, Category>();

  async findById(tenantId: string, id: string): Promise<Category | null> {
    const category = this.byId.get(id);
    return category && category.tenantId === tenantId ? category : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Category | null> {
    return (
      [...this.byId.values()].find(
        (c) => c.tenantId === tenantId && c.companyId === companyId && c.code === code,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Category[]> {
    return [...this.byId.values()].filter((c) => c.tenantId === tenantId && c.companyId === companyId);
  }

  async save(category: Category): Promise<void> {
    this.byId.set(category.id, category);
  }
}
