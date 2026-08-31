import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { ProductVariant } from "../../domain/product-variant.entity";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../domain/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import {
  ProductDoesNotSupportVariantsError,
  ProductNotFoundError,
  ProductVariantSkuAlreadyInUseError,
} from "../errors";

export interface AddProductVariantInput {
  tenantId: string;
  companyId: string;
  productId: string;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>;
  price: string;
  cost?: string;
}

@Injectable()
export class AddProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variants: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(input: AddProductVariantInput): Promise<ProductVariant> {
    const product = await this.products.findById(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }
    if (!product.hasVariants) {
      throw new ProductDoesNotSupportVariantsError();
    }

    const sku = input.sku.trim();
    const existing = await this.variants.findBySku(input.tenantId, sku);
    if (existing) {
      throw new ProductVariantSkuAlreadyInUseError(sku);
    }

    const now = new Date();
    const variant = ProductVariant.create({
      id: newId(),
      tenantId: input.tenantId,
      productId: product.id,
      sku,
      barcode: input.barcode?.trim() || null,
      attributes: input.attributes,
      price: input.price,
      cost: input.cost ?? null,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.variants.save(variant);
    return variant;
  }
}
