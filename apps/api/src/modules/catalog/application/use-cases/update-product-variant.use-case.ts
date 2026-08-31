import { Inject, Injectable } from "@nestjs/common";
import { ProductVariant } from "../../domain/product-variant.entity";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../domain/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import { ProductNotFoundError, ProductVariantNotFoundError } from "../errors";

/** `cost` omitted keeps the variant's current cost — see UpdateProductUseCase's docstring for why. */
export interface UpdateProductVariantInput {
  tenantId: string;
  companyId: string;
  productId: string;
  variantId: string;
  price: string;
  cost?: string;
}

@Injectable()
export class UpdateProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variants: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(input: UpdateProductVariantInput): Promise<ProductVariant> {
    const product = await this.products.findById(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }

    const variant = await this.variants.findById(input.tenantId, input.variantId);
    if (!variant || variant.productId !== product.id) {
      throw new ProductVariantNotFoundError();
    }

    const cost = input.cost === undefined ? variant.cost : input.cost || null;
    variant.reprice(input.price, cost);
    await this.variants.save(variant);
    return variant;
  }
}
