import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { CustomersModule } from "./customers.module";
import { CustomersController } from "./presentation/customers.controller";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer.use-case";

// Same StubInfraModule pattern as catalog.module.spec.ts.
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

describe("CustomersModule wiring", () => {
  it("resolves the controller and its use cases", async () => {
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
        CustomersModule,
      ],
    }).compile();

    expect(moduleRef.get(CustomersController)).toBeInstanceOf(CustomersController);
    expect(moduleRef.get(CreateCustomerUseCase)).toBeInstanceOf(CreateCustomerUseCase);

    await moduleRef.close();
  });
});
