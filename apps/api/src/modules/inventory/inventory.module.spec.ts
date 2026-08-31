import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { InventoryModule } from "./inventory.module";
import { InventoryController } from "./presentation/inventory.controller";
import { RecordReceiptUseCase } from "./application/use-cases/record-receipt.use-case";
import { CreateTransferUseCase } from "./application/use-cases/create-transfer.use-case";
import { CreateReservationUseCase } from "./application/use-cases/create-reservation.use-case";

// Same StubInfraModule pattern as pricing.module.spec.ts — InventoryModule
// transitively imports CatalogModule and WarehousesModule, which need the
// same stubs.
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

describe("InventoryModule wiring", () => {
  it("resolves the controller and its use cases, including the cross-module Catalog/Warehouses dependencies", async () => {
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
        InventoryModule,
      ],
    }).compile();

    expect(moduleRef.get(InventoryController)).toBeInstanceOf(InventoryController);
    expect(moduleRef.get(RecordReceiptUseCase)).toBeInstanceOf(RecordReceiptUseCase);
    expect(moduleRef.get(CreateTransferUseCase)).toBeInstanceOf(CreateTransferUseCase);
    expect(moduleRef.get(CreateReservationUseCase)).toBeInstanceOf(CreateReservationUseCase);

    await moduleRef.close();
  });
});
