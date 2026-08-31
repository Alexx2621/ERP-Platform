import { Injectable } from "@nestjs/common";
import { GetProductUseCase, GetProductVariantUseCase } from "../../../catalog";
import {
  ProductInventoryNotTrackedError,
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
} from "../errors";

/**
 * Verifies a product exists, belongs to the active company, and has
 * inventory tracking enabled, then resolves the canonical
 * `productVariantId` to actually post movements against: `null` for a
 * non-variant product, or the variant's own id after confirming it really
 * belongs to this product. Shared by every write use case in this module
 * (docs/ARCHITECTURE.md §6: Inventory -> public contract of Catalog).
 *
 * `ProductVariant` carries no `companyId` of its own (it is scoped through
 * its parent `Product`, see Catalog's `GetProductVariantUseCase`
 * docstring) — company scope is therefore verified on the product, and
 * variant ownership is verified by comparing `variant.productId`.
 */
@Injectable()
export class ResolveProductTargetUseCase {
  constructor(
    private readonly getProduct: GetProductUseCase,
    private readonly getProductVariant: GetProductVariantUseCase,
  ) {}

  async execute(
    tenantId: string,
    companyId: string,
    productId: string,
    productVariantId: string | null | undefined,
  ): Promise<string | null> {
    const product = await this.getProduct.execute(tenantId, productId);
    if (!product || product.companyId !== companyId) {
      throw new ProductNotFoundError();
    }
    if (!product.trackInventory) {
      throw new ProductInventoryNotTrackedError();
    }

    if (product.hasVariants) {
      if (!productVariantId) {
        throw new ProductVariantRequiredError();
      }
      const variant = await this.getProductVariant.execute(tenantId, productVariantId);
      if (!variant || variant.productId !== product.id) {
        throw new ProductVariantNotFoundError();
      }
      return variant.id;
    }

    if (productVariantId) {
      throw new ProductVariantNotAllowedError();
    }
    return null;
  }
}
