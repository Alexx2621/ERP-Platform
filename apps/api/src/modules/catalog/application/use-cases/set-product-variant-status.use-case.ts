import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, ProductVariant } from "../../domain/product-variant.entity";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../domain/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import { ProductNotFoundError, ProductVariantNotFoundError } from "../errors";

export interface SetProductVariantStatusInput {
  tenantId: string;
  companyId: string;
  productId: string;
  variantId: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetProductVariantStatusUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variants: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(input: SetProductVariantStatusInput): Promise<ProductVariant> {
    const product = await this.products.findById(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }
    const variant = await this.variants.findById(input.tenantId, input.variantId);
    if (!variant || variant.productId !== product.id) {
      throw new ProductVariantNotFoundError();
    }
    variant.setStatus(input.status);
    await this.variants.save(variant);
    return variant;
  }
}
