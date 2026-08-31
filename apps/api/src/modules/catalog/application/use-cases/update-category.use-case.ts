import { Inject, Injectable } from "@nestjs/common";
import { Category } from "../../domain/category.entity";
import { CATEGORY_REPOSITORY, CategoryRepository } from "../../domain/category.repository";
import { CategoryNotFoundError, CategoryParentNotFoundError } from "../errors";

export interface UpdateCategoryInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  parentId?: string | null;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  async execute(input: UpdateCategoryInput): Promise<Category> {
    const category = await this.categories.findById(input.tenantId, input.id);
    if (!category || category.companyId !== input.companyId) {
      throw new CategoryNotFoundError();
    }
    category.rename(input.name);

    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        category.reparent(null);
      } else {
        const parent = await this.categories.findById(input.tenantId, input.parentId);
        if (!parent || parent.companyId !== input.companyId) {
          throw new CategoryParentNotFoundError();
        }
        category.reparent(parent.id);
      }
    }

    await this.categories.save(category);
    return category;
  }
}
