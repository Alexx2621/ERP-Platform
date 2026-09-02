import { Inject, Injectable } from "@nestjs/common";
import { GetProductUseCase, ListProductVariantsUseCase, Product, ProductVariant } from "../../../catalog";
import { STOREFRONT_PRODUCT_REPOSITORY, StorefrontProductRepository } from "../../domain/storefront-product.repository";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontNotActiveError, StorefrontNotFoundError, StorefrontProductNotFoundError } from "../errors";

export interface GetPublishedProductInput {
  storefrontCode: string;
  productId: string;
}

export interface PublishedProductDetail {
  product: Product;
  variants: ProductVariant[];
}

@Injectable()
export class GetPublishedProductUseCase {
  constructor(
    @Inject(STOREFRONT_PRODUCT_REPOSITORY) private readonly publications: StorefrontProductRepository,
    @Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository,
    private readonly getProduct: GetProductUseCase,
    private readonly listVariants: ListProductVariantsUseCase,
  ) {}

  async execute(input: GetPublishedProductInput): Promise<PublishedProductDetail> {
    const storefront = await this.storefronts.findByCode(input.storefrontCode.trim().toLowerCase());
    if (!storefront) {
      throw new StorefrontNotFoundError();
    }
    if (storefront.status !== "ACTIVE") {
      throw new StorefrontNotActiveError();
    }

    const publication = await this.publications.findByStorefrontAndProduct(storefront.tenantId, storefront.id, input.productId);
    if (!publication || publication.status !== "PUBLISHED") {
      throw new StorefrontProductNotFoundError();
    }

    const product = await this.getProduct.execute(storefront.tenantId, input.productId);
    if (!product || product.status !== "ACTIVE") {
      throw new StorefrontProductNotFoundError();
    }

    const variants = product.hasVariants
      ? await this.listVariants.execute(storefront.tenantId, storefront.companyId, product.id)
      : [];
    return { product, variants: variants.filter((v) => v.status === "ACTIVE") };
  }
}
