import { Inject, Injectable } from "@nestjs/common";
import { Category, MasterDataStatus } from "../../domain/category.entity";
import { CATEGORY_REPOSITORY, CategoryRepository } from "../../domain/category.repository";
import { CategoryNotFoundError } from "../errors";

export interface SetCategoryStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetCategoryStatusUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  async execute(input: SetCategoryStatusInput): Promise<Category> {
    const category = await this.categories.findById(input.tenantId, input.id);
    if (!category || category.companyId !== input.companyId) {
      throw new CategoryNotFoundError();
    }
    category.setStatus(input.status);
    await this.categories.save(category);
    return category;
  }
}
