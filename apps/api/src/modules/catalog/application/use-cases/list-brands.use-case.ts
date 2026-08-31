import { Inject, Injectable } from "@nestjs/common";
import { Brand } from "../../domain/brand.entity";
import { BRAND_REPOSITORY, BrandRepository } from "../../domain/brand.repository";

@Injectable()
export class ListBrandsUseCase {
  constructor(@Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Brand[]> {
    return this.brands.listByCompany(tenantId, companyId);
  }
}
