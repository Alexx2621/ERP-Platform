import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { CrmModule } from "./crm.module";
import { LeadsController } from "./presentation/leads.controller";
import { PipelinesController } from "./presentation/pipelines.controller";
import { OpportunitiesController } from "./presentation/opportunities.controller";
import { ActivitiesController } from "./presentation/activities.controller";
import { CreateLeadUseCase } from "./application/use-cases/create-lead.use-case";
import { CreateOpportunityUseCase } from "./application/use-cases/create-opportunity.use-case";

// Same StubInfraModule pattern as taxes.module.spec.ts/accounting.module.spec.ts.
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

describe("CrmModule wiring", () => {
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
        CrmModule,
      ],
    }).compile();

    expect(moduleRef.get(LeadsController)).toBeInstanceOf(LeadsController);
    expect(moduleRef.get(PipelinesController)).toBeInstanceOf(PipelinesController);
    expect(moduleRef.get(OpportunitiesController)).toBeInstanceOf(OpportunitiesController);
    expect(moduleRef.get(ActivitiesController)).toBeInstanceOf(ActivitiesController);
    expect(moduleRef.get(CreateLeadUseCase)).toBeInstanceOf(CreateLeadUseCase);
    expect(moduleRef.get(CreateOpportunityUseCase)).toBeInstanceOf(CreateOpportunityUseCase);

    await moduleRef.close();
  });
});
