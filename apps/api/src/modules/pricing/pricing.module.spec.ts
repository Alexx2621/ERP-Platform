import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { PricingModule } from "./pricing.module";
import { PriceListsController } from "./presentation/price-lists.controller";
import { CreatePriceListUseCase } from "./application/use-cases/create-price-list.use-case";
import { AddPriceListItemUseCase } from "./application/use-cases/add-price-list-item.use-case";

// Same StubInfraModule pattern as catalog.module.spec.ts — PricingModule
// transitively imports CatalogModule, which needs the same stubs.
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

describe("PricingModule wiring", () => {
  it("resolves the controller and its use cases, including the cross-module GetProductUseCase dependency", async () => {
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
        PricingModule,
      ],
    }).compile();

    expect(moduleRef.get(PriceListsController)).toBeInstanceOf(PriceListsController);
    expect(moduleRef.get(CreatePriceListUseCase)).toBeInstanceOf(CreatePriceListUseCase);
    expect(moduleRef.get(AddPriceListItemUseCase)).toBeInstanceOf(AddPriceListItemUseCase);

    await moduleRef.close();
  });
});
