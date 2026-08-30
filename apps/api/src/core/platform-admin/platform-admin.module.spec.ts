import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { ListUsersUseCase, SetUserStatusUseCase } from "../users";
import { ListPlatformSettingsUseCase, SetSettingValueUseCase } from "../configuration";
import { ListPlatformAuditEntriesUseCase } from "../audit";
import { PlatformAdminGuard } from "./presentation/platform-admin.guard";
import { PlatformUsersController } from "./presentation/platform-users.controller";
import { PlatformSettingsController } from "./presentation/platform-settings.controller";
import { PlatformAuditEntriesController } from "./presentation/platform-audit-entries.controller";
import { PlatformAdminModule } from "./platform-admin.module";

// Same pattern as tenants.module.spec.ts: PlatformAdminModule imports
// AuthModule (for SessionAuthGuard), which needs Redis for its throttler
// storage — see auth.module.spec.ts for why these are @Global() stubs.
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

describe("PlatformAdminModule wiring", () => {
  it("resolves the guard, controller and reused Users use cases", async () => {
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
        PlatformAdminModule,
      ],
    }).compile();

    expect(moduleRef.get(PlatformAdminGuard)).toBeInstanceOf(PlatformAdminGuard);
    expect(moduleRef.get(PlatformUsersController)).toBeInstanceOf(PlatformUsersController);
    expect(moduleRef.get(ListUsersUseCase)).toBeInstanceOf(ListUsersUseCase);
    expect(moduleRef.get(SetUserStatusUseCase)).toBeInstanceOf(SetUserStatusUseCase);
    expect(moduleRef.get(PlatformSettingsController)).toBeInstanceOf(PlatformSettingsController);
    expect(moduleRef.get(ListPlatformSettingsUseCase)).toBeInstanceOf(ListPlatformSettingsUseCase);
    expect(moduleRef.get(SetSettingValueUseCase)).toBeInstanceOf(SetSettingValueUseCase);
    expect(moduleRef.get(PlatformAuditEntriesController)).toBeInstanceOf(PlatformAuditEntriesController);
    expect(moduleRef.get(ListPlatformAuditEntriesUseCase)).toBeInstanceOf(ListPlatformAuditEntriesUseCase);

    await moduleRef.close();
  });
});
