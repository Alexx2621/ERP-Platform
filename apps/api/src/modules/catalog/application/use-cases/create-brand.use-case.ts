import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Brand } from "../../domain/brand.entity";
import { BRAND_REPOSITORY, BrandRepository } from "../../domain/brand.repository";
import { BrandCodeAlreadyInUseError } from "../errors";

export interface CreateBrandInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
}

@Injectable()
export class CreateBrandUseCase {
  constructor(@Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository) {}

  async execute(input: CreateBrandInput): Promise<Brand> {
    const code = input.code.trim();
    const existing = await this.brands.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new BrandCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const brand = Brand.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.brands.save(brand);
    return brand;
  }
}
