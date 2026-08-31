import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Category } from "../../domain/category.entity";
import { CATEGORY_REPOSITORY, CategoryRepository } from "../../domain/category.repository";
import { CategoryCodeAlreadyInUseError, CategoryParentNotFoundError } from "../errors";

export interface CreateCategoryInput {
  tenantId: string;
  companyId: string;
  parentId?: string;
  code: string;
  name: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const code = input.code.trim();
    const existing = await this.categories.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new CategoryCodeAlreadyInUseError(code);
    }

    let parentId: string | null = null;
    if (input.parentId) {
      const parent = await this.categories.findById(input.tenantId, input.parentId);
      if (!parent || parent.companyId !== input.companyId) {
        throw new CategoryParentNotFoundError();
      }
      parentId = parent.id;
    }

    const now = new Date();
    const category = Category.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      parentId,
      code,
      name: input.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.categories.save(category);
    return category;
  }
}
