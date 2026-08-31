import { Inject, Injectable } from "@nestjs/common";
import { Brand, MasterDataStatus } from "../../domain/brand.entity";
import { BRAND_REPOSITORY, BrandRepository } from "../../domain/brand.repository";
import { BrandNotFoundError } from "../errors";

export interface SetBrandStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetBrandStatusUseCase {
  constructor(@Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository) {}

  async execute(input: SetBrandStatusInput): Promise<Brand> {
    const brand = await this.brands.findById(input.tenantId, input.id);
    if (!brand || brand.companyId !== input.companyId) {
      throw new BrandNotFoundError();
    }
    brand.setStatus(input.status);
    await this.brands.save(brand);
    return brand;
  }
}
