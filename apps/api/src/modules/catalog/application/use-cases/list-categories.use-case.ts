import { Inject, Injectable } from "@nestjs/common";
import { Category } from "../../domain/category.entity";
import { CATEGORY_REPOSITORY, CategoryRepository } from "../../domain/category.repository";

@Injectable()
export class ListCategoriesUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Category[]> {
    return this.categories.listByCompany(tenantId, companyId);
  }
}
