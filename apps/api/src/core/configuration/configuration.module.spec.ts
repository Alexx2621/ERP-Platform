import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { ConfigurationModule } from "./configuration.module";
import { SettingsController } from "./presentation/settings.controller";
import { PreferencesController } from "./presentation/preferences.controller";
import { GetEffectiveSettingUseCase } from "./application/use-cases/get-effective-setting.use-case";
import { SetSettingValueUseCase } from "./application/use-cases/set-setting-value.use-case";
import { SetUserPreferenceUseCase } from "./application/use-cases/set-user-preference.use-case";

// ConfigurationModule imports AuthModule + TenantsModule (for their guards)
// and AccessControlModule (for PermissionGuard) — same StubInfraModule
// pattern as tenants.module.spec.ts, since those modules ultimately need
// Prisma/Redis.
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: RedisService, useValue: {} },
  ],
  exports: [PrismaService, RedisService],
})
class StubInfraModule {}

describe("ConfigurationModule wiring", () => {
  it("resolves settings/preferences use cases and both controllers", async () => {
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
        ConfigurationModule,
      ],
    }).compile();

    expect(moduleRef.get(GetEffectiveSettingUseCase)).toBeInstanceOf(GetEffectiveSettingUseCase);
    expect(moduleRef.get(SetSettingValueUseCase)).toBeInstanceOf(SetSettingValueUseCase);
    expect(moduleRef.get(SetUserPreferenceUseCase)).toBeInstanceOf(SetUserPreferenceUseCase);
    expect(moduleRef.get(SettingsController)).toBeInstanceOf(SettingsController);
    expect(moduleRef.get(PreferencesController)).toBeInstanceOf(PreferencesController);

    await moduleRef.close();
  });
});
