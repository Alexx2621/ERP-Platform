import { Inject, Injectable } from "@nestjs/common";
import { StorefrontProduct } from "../../domain/storefront-product.entity";
import { STOREFRONT_PRODUCT_REPOSITORY, StorefrontProductRepository } from "../../domain/storefront-product.repository";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontNotFoundError, StorefrontProductNotFoundError } from "../errors";

export interface UnpublishProductInput {
  tenantId: string;
  companyId: string;
  storefrontId: string;
  productId: string;
}

@Injectable()
export class UnpublishProductUseCase {
  constructor(
    @Inject(STOREFRONT_PRODUCT_REPOSITORY) private readonly publications: StorefrontProductRepository,
    @Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository,
  ) {}

  async execute(input: UnpublishProductInput): Promise<StorefrontProduct> {
    const storefront = await this.storefronts.findById(input.tenantId, input.storefrontId);
    if (!storefront || storefront.companyId !== input.companyId) {
      throw new StorefrontNotFoundError();
    }
    const publication = await this.publications.findByStorefrontAndProduct(input.tenantId, storefront.id, input.productId);
    if (!publication) {
      throw new StorefrontProductNotFoundError();
    }
    publication.unpublish();
    await this.publications.save(publication);
    return publication;
  }
}
