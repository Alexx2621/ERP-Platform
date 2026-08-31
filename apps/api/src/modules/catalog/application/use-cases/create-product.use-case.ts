import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Product, ProductType } from "../../domain/product.entity";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import { UNIT_OF_MEASURE_REPOSITORY, UnitOfMeasureRepository } from "../../domain/unit-of-measure.repository";
import { CATEGORY_REPOSITORY, CategoryRepository } from "../../domain/category.repository";
import { BRAND_REPOSITORY, BrandRepository } from "../../domain/brand.repository";
import {
  ProductBarcodeAlreadyInUseError,
  ProductBrandNotFoundError,
  ProductCategoryNotFoundError,
  ProductCodeAlreadyInUseError,
  ProductUnitOfMeasureNotFoundError,
} from "../errors";

export interface CreateProductInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  type?: ProductType;
  unitOfMeasureId: string;
  categoryId?: string;
  brandId?: string;
  barcode?: string;
  basePrice?: string;
  baseCost?: string;
  trackInventory?: boolean;
  sellable?: boolean;
  purchasable?: boolean;
  hasVariants?: boolean;
  publishOnline?: boolean;
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly units: UnitOfMeasureRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(BRAND_REPOSITORY) private readonly brands: BrandRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const code = input.code.trim();
    const existingByCode = await this.products.findByCode(input.tenantId, input.companyId, code);
    if (existingByCode) {
      throw new ProductCodeAlreadyInUseError(code);
    }

    const unit = await this.units.findById(input.tenantId, input.unitOfMeasureId);
    if (!unit || unit.companyId !== input.companyId) {
      throw new ProductUnitOfMeasureNotFoundError();
    }

    if (input.categoryId) {
      const category = await this.categories.findById(input.tenantId, input.categoryId);
      if (!category || category.companyId !== input.companyId) {
        throw new ProductCategoryNotFoundError();
      }
    }

    if (input.brandId) {
      const brand = await this.brands.findById(input.tenantId, input.brandId);
      if (!brand || brand.companyId !== input.companyId) {
        throw new ProductBrandNotFoundError();
      }
    }

    const barcode = input.barcode?.trim() || undefined;
    if (barcode) {
      const existingByBarcode = await this.products.findByBarcode(input.tenantId, input.companyId, barcode);
      if (existingByBarcode) {
        throw new ProductBarcodeAlreadyInUseError(barcode);
      }
    }

    const now = new Date();
    const hasVariants = input.hasVariants ?? false;
    const product = Product.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      categoryId: input.categoryId ?? null,
      brandId: input.brandId ?? null,
      unitOfMeasureId: input.unitOfMeasureId,
      code,
      name: input.name,
      description: input.description ?? null,
      type: input.type ?? "PHYSICAL_GOOD",
      trackInventory: input.trackInventory ?? true,
      sellable: input.sellable ?? true,
      purchasable: input.purchasable ?? true,
      hasVariants,
      publishOnline: input.publishOnline ?? false,
      barcode: barcode ?? null,
      basePrice: hasVariants ? null : (input.basePrice ?? null),
      baseCost: hasVariants ? null : (input.baseCost ?? null),
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await this.products.save(product);
    return product;
  }
}
