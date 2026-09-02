import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { CommerceModule } from "./commerce.module";
import { StorefrontsController } from "./presentation/storefronts.controller";
import { StorefrontPublicController } from "./presentation/storefront-public.controller";
import { CheckoutUseCase } from "./application/use-cases/checkout.use-case";
import { StorefrontSystemUserSeeder } from "./application/storefront-system-user-seeder";

// Same StubInfraModule pattern as pos.module.spec.ts — CommerceModule
// transitively imports Catalog/Warehouses/Customers/Sales/Payments/Users,
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

describe("CommerceModule wiring", () => {
  it("resolves both controllers and the checkout orchestration use case", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              LOGIN_RATE_LIMIT_MAX: 5,
              LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
              COMMERCE_RATE_LIMIT_MAX: 60,
              COMMERCE_RATE_LIMIT_WINDOW_SECONDS: 60,
              ACCESS_TOKEN_TTL_SECONDS: 900,
              REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
            }),
          ],
        }),
        StubInfraModule,
        CommerceModule,
      ],
    }).compile();

    expect(moduleRef.get(StorefrontsController)).toBeInstanceOf(StorefrontsController);
    expect(moduleRef.get(StorefrontPublicController)).toBeInstanceOf(StorefrontPublicController);
    expect(moduleRef.get(CheckoutUseCase)).toBeInstanceOf(CheckoutUseCase);
    expect(moduleRef.get(StorefrontSystemUserSeeder)).toBeInstanceOf(StorefrontSystemUserSeeder);

    await moduleRef.close();
  });
});
