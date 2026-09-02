import { Inject, Injectable } from "@nestjs/common";
import { GetProductUseCase } from "../../../catalog";
import { StorefrontProduct } from "../../domain/storefront-product.entity";
import {
  ListStorefrontProductsFilter,
  STOREFRONT_PRODUCT_REPOSITORY,
  StorefrontProductRepository,
} from "../../domain/storefront-product.repository";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontNotFoundError } from "../errors";

export interface ListStorefrontProductsInput {
  tenantId: string;
  companyId: string;
  storefrontId: string;
  filter: ListStorefrontProductsFilter;
}

export interface StorefrontProductWithProduct {
  publication: StorefrontProduct;
  productCode: string;
  productName: string;
}

/** Admin view — enriches each publication with the product's own code/name, the same "join for a small admin listing" pattern `ListMembershipsUseCase` already established. */
@Injectable()
export class ListStorefrontProductsUseCase {
  constructor(
    @Inject(STOREFRONT_PRODUCT_REPOSITORY) private readonly publications: StorefrontProductRepository,
    @Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository,
    private readonly getProduct: GetProductUseCase,
  ) {}

  async execute(input: ListStorefrontProductsInput): Promise<StorefrontProductWithProduct[]> {
    const storefront = await this.storefronts.findById(input.tenantId, input.storefrontId);
    if (!storefront || storefront.companyId !== input.companyId) {
      throw new StorefrontNotFoundError();
    }
    const rows = await this.publications.listByStorefront(input.tenantId, storefront.id, input.filter);
    const results: StorefrontProductWithProduct[] = [];
    for (const publication of rows) {
      const product = await this.getProduct.execute(input.tenantId, publication.productId);
      results.push({ publication, productCode: product?.code ?? "?", productName: product?.name ?? "(producto eliminado)" });
    }
    return results;
  }
}
