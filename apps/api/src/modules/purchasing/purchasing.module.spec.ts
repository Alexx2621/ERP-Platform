import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { PurchasingModule } from "./purchasing.module";
import { PurchaseOrdersController } from "./presentation/purchase-orders.controller";
import { PurchaseReceiptsController } from "./presentation/purchase-receipts.controller";
import { PurchaseReturnsController } from "./presentation/purchase-returns.controller";
import { SupplierInvoicesController } from "./presentation/supplier-invoices.controller";
import { ConfirmPurchaseOrderUseCase } from "./application/use-cases/confirm-purchase-order.use-case";
import { CreatePurchaseReturnUseCase } from "./application/use-cases/create-purchase-return.use-case";
import { GetPurchaseOrderUseCase } from "./application/use-cases/get-purchase-order.use-case";

// Same StubInfraModule pattern as sales.module.spec.ts — PurchasingModule
// transitively imports Catalog/Warehouses/Suppliers/Inventory, which need
// the same stubs.
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

describe("PurchasingModule wiring", () => {
  it("resolves the four controllers and the cross-module inventory/supplier use cases", async () => {
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
        PurchasingModule,
      ],
    }).compile();

    expect(moduleRef.get(PurchaseOrdersController)).toBeInstanceOf(PurchaseOrdersController);
    expect(moduleRef.get(PurchaseReceiptsController)).toBeInstanceOf(PurchaseReceiptsController);
    expect(moduleRef.get(PurchaseReturnsController)).toBeInstanceOf(PurchaseReturnsController);
    expect(moduleRef.get(SupplierInvoicesController)).toBeInstanceOf(SupplierInvoicesController);
    expect(moduleRef.get(ConfirmPurchaseOrderUseCase)).toBeInstanceOf(ConfirmPurchaseOrderUseCase);
    expect(moduleRef.get(CreatePurchaseReturnUseCase)).toBeInstanceOf(CreatePurchaseReturnUseCase);
    expect(moduleRef.get(GetPurchaseOrderUseCase)).toBeInstanceOf(GetPurchaseOrderUseCase);

    await moduleRef.close();
  });
});
