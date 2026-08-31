import { Inject, Injectable } from "@nestjs/common";
import { Brand } from "../../domain/brand.entity";
import { BRAND_REPOSITORY, BrandRepository } from "../../domain/brand.repository";
import { BrandNotFoundError } from "../errors";

export interface UpdateBrandInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
}

@Injectable()
export class UpdateBrandUseCase {
  constructor(@Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository) {}

  async execute(input: UpdateBrandInput): Promise<Brand> {
    const brand = await this.brands.findById(input.tenantId, input.id);
    if (!brand || brand.companyId !== input.companyId) {
      throw new BrandNotFoundError();
    }
    brand.rename(input.name);
    await this.brands.save(brand);
    return brand;
  }
}
