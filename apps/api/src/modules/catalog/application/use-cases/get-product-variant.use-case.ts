import { Inject, Injectable } from "@nestjs/common";
import { ProductVariant } from "../../domain/product-variant.entity";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../domain/product-variant.repository";

/**
 * Same shape as `GetProductUseCase` — the second Catalog read exposed across
 * a module boundary (Inventory -> Catalog, docs/ARCHITECTURE.md §6). Note
 * `ProductVariant` carries no `companyId` of its own (it is scoped through
 * its parent `Product`); a caller that needs to verify company scope for a
 * variant must also resolve the parent product via `GetProductUseCase`.
 */
@Injectable()
export class GetProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variants: ProductVariantRepository,
  ) {}

  async execute(tenantId: string, id: string): Promise<ProductVariant | null> {
    return this.variants.findById(tenantId, id);
  }
}
