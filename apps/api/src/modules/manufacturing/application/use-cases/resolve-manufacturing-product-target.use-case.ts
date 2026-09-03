import { Injectable } from "@nestjs/common";
import { GetProductUseCase, GetProductVariantUseCase } from "../../../catalog";
import {
  ProductNotFoundError,
  ProductNotInventoryTrackedError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
} from "../errors";

export interface ResolveManufacturingProductTargetInput {
  tenantId: string;
  companyId: string;
  productId: string;
  productVariantId?: string | null;
}

export interface ResolveManufacturingProductTargetResult {
  productVariantId: string | null;
}

/**
 * Validates a product (finished good or BOM component) exists in the
 * active company and resolves its variant if `hasVariants` — same shape as
 * Sales'/Purchasing's own `ResolveSalesLineTargetUseCase`/
 * `ResolvePurchaseLineTargetUseCase`, but Manufacturing-owned: every
 * product used here must have `trackInventory === true`, unconditionally
 * (unlike Sales, where a non-tracked product simply skips warehouse
 * validation) — a material or finished good that never touches the
 * Inventory ledger has no meaning in a production order
 * (docs/DECISIONS.md ADR-014 point 4).
 */
@Injectable()
export class ResolveManufacturingProductTargetUseCase {
  constructor(
    private readonly getProduct: GetProductUseCase,
    private readonly getProductVariant: GetProductVariantUseCase,
  ) {}

  async execute(input: ResolveManufacturingProductTargetInput): Promise<ResolveManufacturingProductTargetResult> {
    const product = await this.getProduct.execute(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }
    if (!product.trackInventory) {
      throw new ProductNotInventoryTrackedError();
    }

    if (product.hasVariants) {
      if (!input.productVariantId) {
        throw new ProductVariantRequiredError();
      }
      const variant = await this.getProductVariant.execute(input.tenantId, input.productVariantId);
      if (!variant || variant.productId !== product.id) {
        throw new ProductVariantNotFoundError();
      }
      return { productVariantId: variant.id };
    }

    if (input.productVariantId) {
      throw new ProductVariantNotAllowedError();
    }
    return { productVariantId: null };
  }
}
