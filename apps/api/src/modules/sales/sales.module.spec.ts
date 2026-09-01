import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { SalesModule } from "./sales.module";
import { QuotesController } from "./presentation/quotes.controller";
import { SalesOrdersController } from "./presentation/sales-orders.controller";
import { SalesReturnsController } from "./presentation/sales-returns.controller";
import { ConfirmSalesOrderUseCase } from "./application/use-cases/confirm-sales-order.use-case";
import { CreateSalesReturnUseCase } from "./application/use-cases/create-sales-return.use-case";
import { GetSalesOrderUseCase } from "./application/use-cases/get-sales-order.use-case";

// Same StubInfraModule pattern as pricing.module.spec.ts — SalesModule
// transitively imports Catalog/Warehouses/Taxes/Pricing/Customers/Inventory,
// which need the same stubs.
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

describe("SalesModule wiring", () => {
  it("resolves the three controllers and the cross-module reservation/inventory use cases", async () => {
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
        SalesModule,
      ],
    }).compile();

    expect(moduleRef.get(QuotesController)).toBeInstanceOf(QuotesController);
    expect(moduleRef.get(SalesOrdersController)).toBeInstanceOf(SalesOrdersController);
    expect(moduleRef.get(SalesReturnsController)).toBeInstanceOf(SalesReturnsController);
    expect(moduleRef.get(ConfirmSalesOrderUseCase)).toBeInstanceOf(ConfirmSalesOrderUseCase);
    expect(moduleRef.get(CreateSalesReturnUseCase)).toBeInstanceOf(CreateSalesReturnUseCase);
    expect(moduleRef.get(GetSalesOrderUseCase)).toBeInstanceOf(GetSalesOrderUseCase);

    await moduleRef.close();
  });
});
