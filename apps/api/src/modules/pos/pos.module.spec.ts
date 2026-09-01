import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { PosModule } from "./pos.module";
import { PosRegistersController } from "./presentation/pos-registers.controller";
import { PosShiftsController } from "./presentation/pos-shifts.controller";
import { PosSalesController } from "./presentation/pos-sales.controller";
import { PosReturnsController } from "./presentation/pos-returns.controller";
import { RingUpSaleUseCase } from "./application/use-cases/ring-up-sale.use-case";
import { CreatePosReturnUseCase } from "./application/use-cases/create-pos-return.use-case";
import { CloseShiftUseCase } from "./application/use-cases/close-shift.use-case";

// Same StubInfraModule pattern as purchasing.module.spec.ts — PosModule
// transitively imports Catalog/Warehouses/Taxes/Pricing/Customers/Inventory/
// Sales/Payments, which need the same stubs.
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

describe("PosModule wiring", () => {
  it("resolves the four controllers and the cross-module sales/payments orchestration use cases", async () => {
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
        PosModule,
      ],
    }).compile();

    expect(moduleRef.get(PosRegistersController)).toBeInstanceOf(PosRegistersController);
    expect(moduleRef.get(PosShiftsController)).toBeInstanceOf(PosShiftsController);
    expect(moduleRef.get(PosSalesController)).toBeInstanceOf(PosSalesController);
    expect(moduleRef.get(PosReturnsController)).toBeInstanceOf(PosReturnsController);
    expect(moduleRef.get(RingUpSaleUseCase)).toBeInstanceOf(RingUpSaleUseCase);
    expect(moduleRef.get(CreatePosReturnUseCase)).toBeInstanceOf(CreatePosReturnUseCase);
    expect(moduleRef.get(CloseShiftUseCase)).toBeInstanceOf(CloseShiftUseCase);

    await moduleRef.close();
  });
});
