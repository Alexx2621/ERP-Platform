import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { PaymentsModule } from "./payments.module";
import { PaymentsController } from "./presentation/payments.controller";
import { CapturePaymentUseCase } from "./application/use-cases/capture-payment.use-case";
import { RefundPaymentUseCase } from "./application/use-cases/refund-payment.use-case";
import { PAYMENT_GATEWAYS } from "./application/ports/payment-gateway.port";

// Same StubInfraModule pattern as sales.module.spec.ts — PaymentsModule
// transitively imports SalesModule, which needs the same stubs.
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

describe("PaymentsModule wiring", () => {
  it("resolves the controller, its use cases, and both real payment gateway adapters", async () => {
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
        PaymentsModule,
      ],
    }).compile();

    expect(moduleRef.get(PaymentsController)).toBeInstanceOf(PaymentsController);
    expect(moduleRef.get(CapturePaymentUseCase)).toBeInstanceOf(CapturePaymentUseCase);
    expect(moduleRef.get(RefundPaymentUseCase)).toBeInstanceOf(RefundPaymentUseCase);
    const gateways = moduleRef.get(PAYMENT_GATEWAYS) as { method: string }[];
    expect(gateways.map((g) => g.method).sort()).toEqual(["BANK_TRANSFER", "CASH"]);

    await moduleRef.close();
  });
});
