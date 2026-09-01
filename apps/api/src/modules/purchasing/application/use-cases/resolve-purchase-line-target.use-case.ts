import { Injectable } from "@nestjs/common";
import { GetProductUseCase, GetProductVariantUseCase } from "../../../catalog";
import { GetWarehouseUseCase } from "../../../warehouses";
import {
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError,
  WarehouseRequiredError,
} from "../errors";

export interface ResolvePurchaseLineTargetInput {
  tenantId: string;
  companyId: string;
  productId: string;
  productVariantId?: string | null;
  warehouseId?: string | null;
}

export interface ResolvePurchaseLineTargetResult {
  productVariantId: string | null;
  warehouseId: string | null;
  /** The product's own baseCost, or the resolved variant's cost — `null` if neither has one set. */
  defaultUnitCost: string | null;
}

/**
 * Same shape as Sales' `ResolveSalesLineTargetUseCase`, minus Taxes/Pricing
 * (docs/ROADMAP.md §9 has no tax/price-list concept for purchase order
 * lines — a supplier's own tax breakdown belongs on `SupplierInvoice`, a
 * separate document). `warehouseId` is required exactly when
 * `product.trackInventory` is true, same conditional rule Sales already
 * established.
 */
@Injectable()
export class ResolvePurchaseLineTargetUseCase {
  constructor(
    private readonly getProduct: GetProductUseCase,
    private readonly getProductVariant: GetProductVariantUseCase,
    private readonly getWarehouse: GetWarehouseUseCase,
  ) {}

  async execute(input: ResolvePurchaseLineTargetInput): Promise<ResolvePurchaseLineTargetResult> {
    const product = await this.getProduct.execute(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }

    let productVariantId: string | null = null;
    let defaultUnitCost: string | null = product.baseCost;

    if (product.hasVariants) {
      if (!input.productVariantId) {
        throw new ProductVariantRequiredError();
      }
      const variant = await this.getProductVariant.execute(input.tenantId, input.productVariantId);
      if (!variant || variant.productId !== product.id) {
        throw new ProductVariantNotFoundError();
      }
      productVariantId = variant.id;
      defaultUnitCost = variant.cost;
    } else if (input.productVariantId) {
      throw new ProductVariantNotAllowedError();
    }

    let warehouseId: string | null = null;
    if (product.trackInventory) {
      if (!input.warehouseId) {
        throw new WarehouseRequiredError();
      }
      const warehouse = await this.getWarehouse.execute(input.tenantId, input.warehouseId);
      if (!warehouse || warehouse.companyId !== input.companyId) {
        throw new WarehouseNotFoundError();
      }
      warehouseId = warehouse.id;
    } else if (input.warehouseId) {
      throw new WarehouseNotAllowedError();
    }

    return { productVariantId, warehouseId, defaultUnitCost };
  }
}
