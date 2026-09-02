import { Inject, Injectable } from "@nestjs/common";
import { Storefront } from "../../domain/storefront.entity";
import { ListStorefrontsFilter, STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";

export interface ListStorefrontsInput {
  tenantId: string;
  companyId: string;
  filter: ListStorefrontsFilter;
}

@Injectable()
export class ListStorefrontsUseCase {
  constructor(@Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository) {}

  async execute(input: ListStorefrontsInput): Promise<Storefront[]> {
    return this.storefronts.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
