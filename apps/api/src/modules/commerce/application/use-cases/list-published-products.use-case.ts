import { Inject, Injectable } from "@nestjs/common";
import { GetProductUseCase } from "../../../catalog";
import { STOREFRONT_PRODUCT_REPOSITORY, StorefrontProductRepository } from "../../domain/storefront-product.repository";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontNotActiveError, StorefrontNotFoundError } from "../errors";

export interface ListPublishedProductsInput {
  storefrontCode: string;
  limit: number;
}

export interface PublishedProductSummary {
  productId: string;
  code: string;
  name: string;
  description: string | null;
  hasVariants: boolean;
  basePrice: string | null;
}

/**
 * The storefront's public catalog listing — the only products a shopper
 * can ever see are the ones with a `PUBLISHED` `StorefrontProduct` row for
 * this exact storefront (docs/ARCHITECTURE.md §7: a public endpoint
 * resolves its own scope from a registered mapping, `storefrontCode` here,
 * never from client-supplied tenant/company data).
 */
@Injectable()
export class ListPublishedProductsUseCase {
  constructor(
    @Inject(STOREFRONT_PRODUCT_REPOSITORY) private readonly publications: StorefrontProductRepository,
    @Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository,
    private readonly getProduct: GetProductUseCase,
  ) {}

  async execute(input: ListPublishedProductsInput): Promise<PublishedProductSummary[]> {
    const storefront = await this.storefronts.findByCode(input.storefrontCode.trim().toLowerCase());
    if (!storefront) {
      throw new StorefrontNotFoundError();
    }
    if (storefront.status !== "ACTIVE") {
      throw new StorefrontNotActiveError();
    }

    const rows = await this.publications.listByStorefront(storefront.tenantId, storefront.id, {
      status: "PUBLISHED",
      limit: input.limit,
    });
    const results: PublishedProductSummary[] = [];
    for (const row of rows) {
      const product = await this.getProduct.execute(storefront.tenantId, row.productId);
      if (!product || product.status !== "ACTIVE") continue;
      results.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        hasVariants: product.hasVariants,
        basePrice: product.basePrice,
      });
    }
    return results;
  }
}
