import { Category } from "./category.entity";

export interface CategoryRepository {
  findById(tenantId: string, id: string): Promise<Category | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Category | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Category[]>;
  save(category: Category): Promise<void>;
}

export const CATEGORY_REPOSITORY = Symbol("CATEGORY_REPOSITORY");
