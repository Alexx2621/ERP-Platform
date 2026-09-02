import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { AccountingModule } from "./accounting.module";
import { AccountsController } from "./presentation/accounts.controller";
import { FiscalPeriodsController } from "./presentation/fiscal-periods.controller";
import { JournalEntriesController } from "./presentation/journal-entries.controller";
import { AccountingReportsController } from "./presentation/accounting-reports.controller";
import { CreateAccountUseCase } from "./application/use-cases/create-account.use-case";
import { CreateJournalEntryUseCase } from "./application/use-cases/create-journal-entry.use-case";

// Same StubInfraModule pattern as taxes.module.spec.ts.
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

describe("AccountingModule wiring", () => {
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
        AccountingModule,
      ],
    }).compile();

    expect(moduleRef.get(AccountsController)).toBeInstanceOf(AccountsController);
    expect(moduleRef.get(FiscalPeriodsController)).toBeInstanceOf(FiscalPeriodsController);
    expect(moduleRef.get(JournalEntriesController)).toBeInstanceOf(JournalEntriesController);
    expect(moduleRef.get(AccountingReportsController)).toBeInstanceOf(AccountingReportsController);
    expect(moduleRef.get(CreateAccountUseCase)).toBeInstanceOf(CreateAccountUseCase);
    expect(moduleRef.get(CreateJournalEntryUseCase)).toBeInstanceOf(CreateJournalEntryUseCase);

    await moduleRef.close();
  });
});
