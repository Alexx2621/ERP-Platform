import { Inject, Injectable } from "@nestjs/common";
import { Storefront, StorefrontStatus } from "../../domain/storefront.entity";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontNotFoundError } from "../errors";

export interface SetStorefrontStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: StorefrontStatus;
}

@Injectable()
export class SetStorefrontStatusUseCase {
  constructor(@Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository) {}

  async execute(input: SetStorefrontStatusInput): Promise<Storefront> {
    const storefront = await this.storefronts.findById(input.tenantId, input.id);
    if (!storefront || storefront.companyId !== input.companyId) {
      throw new StorefrontNotFoundError();
    }
    storefront.setStatus(input.status);
    await this.storefronts.save(storefront);
    return storefront;
  }
}
