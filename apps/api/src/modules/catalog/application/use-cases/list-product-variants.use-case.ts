import { Inject, Injectable } from "@nestjs/common";
import { ProductVariant } from "../../domain/product-variant.entity";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../domain/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import { ProductNotFoundError } from "../errors";

@Injectable()
export class ListProductVariantsUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variants: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(tenantId: string, companyId: string, productId: string): Promise<ProductVariant[]> {
    const product = await this.products.findById(tenantId, productId);
    if (!product || product.companyId !== companyId) {
      throw new ProductNotFoundError();
    }
    return this.variants.listByProduct(tenantId, product.id);
  }
}
