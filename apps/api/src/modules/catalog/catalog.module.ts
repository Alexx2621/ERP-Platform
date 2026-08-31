import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { UNIT_OF_MEASURE_REPOSITORY } from "./domain/unit-of-measure.repository";
import { CATEGORY_REPOSITORY } from "./domain/category.repository";
import { BRAND_REPOSITORY } from "./domain/brand.repository";
import { PRODUCT_REPOSITORY } from "./domain/product.repository";
import { PRODUCT_VARIANT_REPOSITORY } from "./domain/product-variant.repository";
import { PrismaUnitOfMeasureRepository } from "./infrastructure/prisma-unit-of-measure.repository";
import { PrismaCategoryRepository } from "./infrastructure/prisma-category.repository";
import { PrismaBrandRepository } from "./infrastructure/prisma-brand.repository";
import { PrismaProductRepository } from "./infrastructure/prisma-product.repository";
import { PrismaProductVariantRepository } from "./infrastructure/prisma-product-variant.repository";
import { CreateUnitOfMeasureUseCase } from "./application/use-cases/create-unit-of-measure.use-case";
import { UpdateUnitOfMeasureUseCase } from "./application/use-cases/update-unit-of-measure.use-case";
import { ListUnitsOfMeasureUseCase } from "./application/use-cases/list-units-of-measure.use-case";
import { SetUnitOfMeasureStatusUseCase } from "./application/use-cases/set-unit-of-measure-status.use-case";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.use-case";
import { ListCategoriesUseCase } from "./application/use-cases/list-categories.use-case";
import { SetCategoryStatusUseCase } from "./application/use-cases/set-category-status.use-case";
import { CreateBrandUseCase } from "./application/use-cases/create-brand.use-case";
import { UpdateBrandUseCase } from "./application/use-cases/update-brand.use-case";
import { ListBrandsUseCase } from "./application/use-cases/list-brands.use-case";
import { SetBrandStatusUseCase } from "./application/use-cases/set-brand-status.use-case";
import { CreateProductUseCase } from "./application/use-cases/create-product.use-case";
import { UpdateProductUseCase } from "./application/use-cases/update-product.use-case";
import { ListProductsUseCase } from "./application/use-cases/list-products.use-case";
import { GetProductUseCase } from "./application/use-cases/get-product.use-case";
import { SetProductStatusUseCase } from "./application/use-cases/set-product-status.use-case";
import { AddProductVariantUseCase } from "./application/use-cases/add-product-variant.use-case";
import { UpdateProductVariantUseCase } from "./application/use-cases/update-product-variant.use-case";
import { ListProductVariantsUseCase } from "./application/use-cases/list-product-variants.use-case";
import { SetProductVariantStatusUseCase } from "./application/use-cases/set-product-variant-status.use-case";
import { GetProductVariantUseCase } from "./application/use-cases/get-product-variant.use-case";
import { UnitsOfMeasureController } from "./presentation/units-of-measure.controller";
import { CategoriesController } from "./presentation/categories.controller";
import { BrandsController } from "./presentation/brands.controller";
import { ProductsController } from "./presentation/products.controller";

/**
 * First Phase 2 (Master Data) module — deliberately outside `core/`
 * (docs/ARCHITECTURE.md §5.3-§5.4: Master Data is a Business App, not
 * Platform Core). Nothing depends on Catalog, so — like Configuration/Files
 * — there is no module-loading cycle risk: every controller here can safely
 * import guards from Tenants/Access Control while living in its own
 * presentation/ folder.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [UnitsOfMeasureController, CategoriesController, BrandsController, ProductsController],
  providers: [
    { provide: UNIT_OF_MEASURE_REPOSITORY, useClass: PrismaUnitOfMeasureRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: BRAND_REPOSITORY, useClass: PrismaBrandRepository },
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: PRODUCT_VARIANT_REPOSITORY, useClass: PrismaProductVariantRepository },
    CreateUnitOfMeasureUseCase,
    UpdateUnitOfMeasureUseCase,
    ListUnitsOfMeasureUseCase,
    SetUnitOfMeasureStatusUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    ListCategoriesUseCase,
    SetCategoryStatusUseCase,
    CreateBrandUseCase,
    UpdateBrandUseCase,
    ListBrandsUseCase,
    SetBrandStatusUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    SetProductStatusUseCase,
    AddProductVariantUseCase,
    UpdateProductVariantUseCase,
    ListProductVariantsUseCase,
    SetProductVariantStatusUseCase,
    GetProductVariantUseCase,
  ],
  exports: [
    CreateUnitOfMeasureUseCase,
    ListUnitsOfMeasureUseCase,
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    CreateBrandUseCase,
    ListBrandsUseCase,
    CreateProductUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    AddProductVariantUseCase,
    ListProductVariantsUseCase,
    GetProductVariantUseCase,
  ],
})
export class CatalogModule {}
