import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { AppRegistryModule } from "./app-registry.module";
import { AppsController } from "./presentation/apps.controller";
import { ListAppDefinitionsUseCase } from "./application/use-cases/list-app-definitions.use-case";
import { ListTenantAppsUseCase } from "./application/use-cases/list-tenant-apps.use-case";
import { EnableAppUseCase } from "./application/use-cases/enable-app.use-case";
import { DisableAppUseCase } from "./application/use-cases/disable-app.use-case";
import { AppCatalogSeeder } from "./application/app-catalog-seeder";

// Same StubInfraModule pattern as configuration.module.spec.ts: AppRegistryModule
// imports AuthModule + TenantsModule (for their guards) and AccessControlModule
// (for PermissionGuard), which ultimately need Prisma/Redis and NotificationsModule's
// own PRISMA_CLIENT token.
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

describe("AppRegistryModule wiring", () => {
  it("resolves every exported use case, the controller, and the catalog seeder", async () => {
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
        AppRegistryModule,
      ],
    }).compile();

    expect(moduleRef.get(ListAppDefinitionsUseCase)).toBeInstanceOf(ListAppDefinitionsUseCase);
    expect(moduleRef.get(ListTenantAppsUseCase)).toBeInstanceOf(ListTenantAppsUseCase);
    expect(moduleRef.get(EnableAppUseCase)).toBeInstanceOf(EnableAppUseCase);
    expect(moduleRef.get(DisableAppUseCase)).toBeInstanceOf(DisableAppUseCase);
    expect(moduleRef.get(AppCatalogSeeder)).toBeInstanceOf(AppCatalogSeeder);
    expect(moduleRef.get(AppsController)).toBeInstanceOf(AppsController);

    await moduleRef.close();
  });
});
