import { Injectable } from "@nestjs/common";
import { GetProductUseCase, GetProductVariantUseCase } from "../../../catalog";
import { GetWarehouseUseCase } from "../../../warehouses";
import { GetTaxUseCase } from "../../../taxes";
import {
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  TaxNotFoundError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError,
  WarehouseRequiredError,
} from "../errors";

export interface ResolveSalesLineTargetInput {
  tenantId: string;
  companyId: string;
  productId: string;
  productVariantId?: string | null;
  warehouseId?: string | null;
  taxId?: string | null;
  /** Quote lines never reserve inventory, so they never require a warehouse even for a trackInventory product — SalesOrder lines default this to true. */
  requireWarehouse?: boolean;
}

export interface ResolveSalesLineTargetResult {
  productVariantId: string | null;
  warehouseId: string | null;
  taxRate: string;
  /** The product's own basePrice, or the resolved variant's price — `null` only for a non-variant, non-sellable product with no basePrice of its own. */
  defaultUnitPrice: string | null;
}

/**
 * Validates and resolves everything a sales line needs to reference safely:
 * the product (and its variant, if `hasVariants`), the warehouse (required
 * only if the product tracks inventory), and an optional tax rate snapshot
 * — the same three-module cross-cutting validation Inventory's own
 * `ResolveProductTargetUseCase`/`ResolveWarehouseTargetUseCase` perform,
 * duplicated here rather than reused directly: this is genuinely
 * Sales-owned validation (a Sales line's requirements — e.g. resolving a
 * tax rate — differ from a bare inventory movement's), and the ~60 lines
 * of overlap is a bounded, accepted cost, not a module boundary violation
 * (docs/ARCHITECTURE.md §6: each module owns its own application-layer
 * validation over the same public Catalog/Warehouses contracts).
 */
@Injectable()
export class ResolveSalesLineTargetUseCase {
  constructor(
    private readonly getProduct: GetProductUseCase,
    private readonly getProductVariant: GetProductVariantUseCase,
    private readonly getWarehouse: GetWarehouseUseCase,
    private readonly getTax: GetTaxUseCase,
  ) {}

  async execute(input: ResolveSalesLineTargetInput): Promise<ResolveSalesLineTargetResult> {
    const product = await this.getProduct.execute(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }

    let productVariantId: string | null = null;
    let defaultUnitPrice: string | null = product.basePrice;

    if (product.hasVariants) {
      if (!input.productVariantId) {
        throw new ProductVariantRequiredError();
      }
      const variant = await this.getProductVariant.execute(input.tenantId, input.productVariantId);
      if (!variant || variant.productId !== product.id) {
        throw new ProductVariantNotFoundError();
      }
      productVariantId = variant.id;
      defaultUnitPrice = variant.price;
    } else if (input.productVariantId) {
      throw new ProductVariantNotAllowedError();
    }

    const requireWarehouse = input.requireWarehouse ?? true;
    let warehouseId: string | null = null;
    if (!requireWarehouse) {
      // Quote lines have no warehouse concept at all — never validated, never returned (QuoteLine has no warehouseId column).
    } else if (product.trackInventory) {
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

    let taxRate = "0";
    if (input.taxId) {
      const tax = await this.getTax.execute(input.tenantId, input.taxId);
      if (!tax || tax.companyId !== input.companyId) {
        throw new TaxNotFoundError();
      }
      taxRate = tax.rate;
    }

    return { productVariantId, warehouseId, taxRate, defaultUnitPrice };
  }
}
