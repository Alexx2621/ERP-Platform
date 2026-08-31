import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/product.entity";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import { CATEGORY_REPOSITORY, CategoryRepository } from "../../domain/category.repository";
import { BRAND_REPOSITORY, BrandRepository } from "../../domain/brand.repository";
import {
  ProductBarcodeAlreadyInUseError,
  ProductBrandNotFoundError,
  ProductCategoryNotFoundError,
  ProductNotFoundError,
} from "../errors";

/**
 * Optional fields follow a three-state contract, same convention across
 * this use case and UpdateProductVariantUseCase: omit the property to leave
 * the current value untouched, send `""` to explicitly clear it, send a
 * real value to replace it. A naive "omitted -> null" mapping was tried
 * first and silently wiped categoryId/brandId/barcode/basePrice/baseCost on
 * any partial PUT that didn't resend every field — caught by manual smoke
 * testing against real Postgres, not by unit tests (which always passed
 * every field).
 */
export interface UpdateProductInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  barcode?: string;
  basePrice?: string;
  baseCost?: string;
  trackInventory: boolean;
  sellable: boolean;
  purchasable: boolean;
  publishOnline: boolean;
}

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
  ) {}

  async execute(input: UpdateProductInput): Promise<Product> {
    const product = await this.products.findById(input.tenantId, input.id);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }

    const categoryId = input.categoryId === undefined ? product.categoryId : input.categoryId || null;
    if (categoryId) {
      const category = await this.categories.findById(input.tenantId, categoryId);
      if (!category || category.companyId !== input.companyId) {
        throw new ProductCategoryNotFoundError();
      }
    }

    const brandId = input.brandId === undefined ? product.brandId : input.brandId || null;
    if (brandId) {
      const brand = await this.brands.findById(input.tenantId, brandId);
      if (!brand || brand.companyId !== input.companyId) {
        throw new ProductBrandNotFoundError();
      }
    }

    const barcode = input.barcode === undefined ? product.barcode : input.barcode.trim() || null;
    if (barcode && barcode !== product.barcode) {
      const existingByBarcode = await this.products.findByBarcode(input.tenantId, input.companyId, barcode);
      if (existingByBarcode) {
        throw new ProductBarcodeAlreadyInUseError(barcode);
      }
    }

    product.update({
      name: input.name,
      description: input.description === undefined ? product.description : input.description.trim() || null,
      categoryId,
      brandId,
      barcode,
      basePrice: input.basePrice === undefined ? product.basePrice : input.basePrice || null,
      baseCost: input.baseCost === undefined ? product.baseCost : input.baseCost || null,
      trackInventory: input.trackInventory,
      sellable: input.sellable,
      purchasable: input.purchasable,
      publishOnline: input.publishOnline,
    });
    await this.products.save(product);
    return product;
  }
}
