import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { CatalogModule } from "./catalog.module";
import { UnitsOfMeasureController } from "./presentation/units-of-measure.controller";
import { CategoriesController } from "./presentation/categories.controller";
import { BrandsController } from "./presentation/brands.controller";
import { ProductsController } from "./presentation/products.controller";
import { CreateUnitOfMeasureUseCase } from "./application/use-cases/create-unit-of-measure.use-case";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case";
import { CreateBrandUseCase } from "./application/use-cases/create-brand.use-case";
import { CreateProductUseCase } from "./application/use-cases/create-product.use-case";
import { GetProductUseCase } from "./application/use-cases/get-product.use-case";
import { AddProductVariantUseCase } from "./application/use-cases/add-product-variant.use-case";

// Same StubInfraModule pattern as app-registry.module.spec.ts: CatalogModule
// imports AuthModule + TenantsModule (for their guards) and AccessControlModule
// (for PermissionGuard), which ultimately need Prisma/Redis and NotificationsModule's
// own PRISMA_CLIENT token.
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: RedisService, useValue: {} },
    { provide: NOTIFICATIONS_PRISMA_CLIENT, useExisting: PrismaService },
  ],
  exports: [PrismaService, RedisService, NOTIFICATIONS_PRISMA_CLIENT],
})
class StubInfraModule {}

describe("CatalogModule wiring", () => {
  it("resolves every controller and its use cases", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              LOGIN_RATE_LIMIT_MAX: 5,
              LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
              ACCESS_TOKEN_TTL_SECONDS: 900,
              REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
            }),
          ],
        }),
        StubInfraModule,
        CatalogModule,
      ],
    }).compile();

    expect(moduleRef.get(UnitsOfMeasureController)).toBeInstanceOf(UnitsOfMeasureController);
    expect(moduleRef.get(CategoriesController)).toBeInstanceOf(CategoriesController);
    expect(moduleRef.get(BrandsController)).toBeInstanceOf(BrandsController);
    expect(moduleRef.get(ProductsController)).toBeInstanceOf(ProductsController);
    expect(moduleRef.get(CreateUnitOfMeasureUseCase)).toBeInstanceOf(CreateUnitOfMeasureUseCase);
    expect(moduleRef.get(CreateCategoryUseCase)).toBeInstanceOf(CreateCategoryUseCase);
    expect(moduleRef.get(CreateBrandUseCase)).toBeInstanceOf(CreateBrandUseCase);
    expect(moduleRef.get(CreateProductUseCase)).toBeInstanceOf(CreateProductUseCase);
    expect(moduleRef.get(GetProductUseCase)).toBeInstanceOf(GetProductUseCase);
    expect(moduleRef.get(AddProductVariantUseCase)).toBeInstanceOf(AddProductVariantUseCase);

    await moduleRef.close();
  });
});
