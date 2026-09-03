import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { ManufacturingModule } from "./manufacturing.module";
import { BillsOfMaterialController } from "./presentation/bills-of-material.controller";
import { ProductionOrdersController } from "./presentation/production-orders.controller";
import { CreateProductionOrderUseCase } from "./application/use-cases/create-production-order.use-case";
import { IssueProductionOrderMaterialUseCase } from "./application/use-cases/issue-production-order-material.use-case";
import { GetProductionOrderUseCase } from "./application/use-cases/get-production-order.use-case";

// Same StubInfraModule pattern as purchasing.module.spec.ts — ManufacturingModule
// transitively imports Catalog/Warehouses/Inventory, which need the same stubs.
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

describe("ManufacturingModule wiring", () => {
  it("resolves both controllers and the cross-module inventory use cases", async () => {
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
        ManufacturingModule,
      ],
    }).compile();

    expect(moduleRef.get(BillsOfMaterialController)).toBeInstanceOf(BillsOfMaterialController);
    expect(moduleRef.get(ProductionOrdersController)).toBeInstanceOf(ProductionOrdersController);
    expect(moduleRef.get(CreateProductionOrderUseCase)).toBeInstanceOf(CreateProductionOrderUseCase);
    expect(moduleRef.get(IssueProductionOrderMaterialUseCase)).toBeInstanceOf(IssueProductionOrderMaterialUseCase);
    expect(moduleRef.get(GetProductionOrderUseCase)).toBeInstanceOf(GetProductionOrderUseCase);

    await moduleRef.close();
  });
});
