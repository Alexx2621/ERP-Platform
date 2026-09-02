import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetProductUseCase, ProductNotFoundError } from "../../../catalog";
import { StorefrontProduct } from "../../domain/storefront-product.entity";
import { STOREFRONT_PRODUCT_REPOSITORY, StorefrontProductRepository } from "../../domain/storefront-product.repository";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontNotFoundError } from "../errors";

export interface PublishProductInput {
  tenantId: string;
  companyId: string;
  storefrontId: string;
  productId: string;
}

/** Idempotent: publishing an already-published product just refreshes `publishedAt`, mirroring `EnableAppUseCase`'s own idempotent-enable precedent. */
@Injectable()
export class PublishProductUseCase {
  constructor(
    @Inject(STOREFRONT_PRODUCT_REPOSITORY) private readonly publications: StorefrontProductRepository,
    @Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository,
    private readonly getProduct: GetProductUseCase,
  ) {}

  async execute(input: PublishProductInput): Promise<StorefrontProduct> {
    const storefront = await this.storefronts.findById(input.tenantId, input.storefrontId);
    if (!storefront || storefront.companyId !== input.companyId) {
      throw new StorefrontNotFoundError();
    }
    const product = await this.getProduct.execute(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }

    const now = new Date();
    const existing = await this.publications.findByStorefrontAndProduct(input.tenantId, storefront.id, product.id);
    if (existing) {
      existing.republish(now);
      await this.publications.save(existing);
      return existing;
    }

    const publication = StorefrontProduct.create({
      id: newId(),
      tenantId: input.tenantId,
      storefrontId: storefront.id,
      productId: product.id,
      status: "PUBLISHED",
      publishedAt: now,
    });
    await this.publications.save(publication);
    return publication;
  }
}
